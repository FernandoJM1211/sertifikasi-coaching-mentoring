<script setup lang="ts">
/**
 * Navigasi cepat ke card unit kompetensi CMSP-02.
 * Muncul saat halaman di-scroll, lalu hilang 5 detik setelah scroll berhenti
 * (tetap tampil selama kursor berada di atasnya).
 */
const props = defineProps<{
  units: { number: number, code: string, title: string, complete: boolean }[]
  /** Awalan id elemen card unit, mis. `cmsp02-unit-` → `cmsp02-unit-1`. */
  targetIdPrefix: string
}>()

const HIDE_DELAY_MS = 5000

const visible = ref(false)
const hovered = ref(false)
const activeNumber = ref<number | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | undefined

function scheduleHide() {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (!hovered.value) visible.value = false
  }, HIDE_DELAY_MS)
}

/** Unit aktif = card terakhir yang bagian atasnya sudah melewati 1/3 layar. */
function updateActiveUnit() {
  const threshold = window.innerHeight / 3
  let current: number | null = null

  for (const unit of props.units) {
    const element = document.getElementById(`${props.targetIdPrefix}${unit.number}`)
    if (!element || element.offsetParent === null) continue
    if (element.getBoundingClientRect().top <= threshold) current = unit.number
  }

  activeNumber.value = current ?? props.units[0]?.number ?? null
}

/* Posisi: tengah vertikal & tepi kanan area konten yang di-scroll (bukan seluruh layar). */
const navRef = ref<HTMLElement | null>(null)
const position = ref<{ top: string, right: string }>({ top: '50%', right: '20px' })

function findScrollContainer(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null

  while (current) {
    const { overflowY } = getComputedStyle(current)
    if (overflowY === 'auto' || overflowY === 'scroll') return current
    current = current.parentElement
  }

  return null
}

function updatePosition() {
  const container = findScrollContainer(navRef.value)
  if (!container) return

  const rect = container.getBoundingClientRect()
  // Lebar scrollbar container agar navigator tidak menutupinya.
  const scrollbarWidth = container.offsetWidth - container.clientWidth

  position.value = {
    top: `${rect.top + rect.height / 2}px`,
    right: `${window.innerWidth - rect.right + scrollbarWidth + 12}px`,
  }
}

function handleScroll() {
  updatePosition()
  visible.value = true
  updateActiveUnit()
  scheduleHide()
}

function handleMouseEnter() {
  hovered.value = true
  clearTimeout(hideTimer)
}

function handleMouseLeave() {
  hovered.value = false
  scheduleHide()
}

function goToUnit(number: number) {
  document
    .getElementById(`${props.targetIdPrefix}${number}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  // Konten dashboard di-scroll di dalam <main>, bukan window, jadi event scroll
  // ditangkap pada fase capture dari document (berlaku untuk elemen mana pun).
  document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
  window.addEventListener('resize', updatePosition, { passive: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('scroll', handleScroll, { capture: true })
  window.removeEventListener('resize', updatePosition)
  clearTimeout(hideTimer)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-x-4 opacity-0"
    leave-active-class="transition duration-300 ease-in"
    leave-to-class="translate-x-4 opacity-0"
  >
    <nav
      v-show="visible"
      ref="navRef"
      :style="position"
      aria-label="Navigasi unit kompetensi"
      class="fixed z-30 -translate-y-1/2 rounded-2xl border border-primary/20 bg-white/90 p-2 shadow-lg backdrop-blur"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @focusin="handleMouseEnter"
      @focusout="handleMouseLeave"
    >
      <p class="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Unit
      </p>

      <ul class="flex flex-col gap-1.5">
        <li v-for="unit in units" :key="unit.number">
          <button
            type="button"
            class="relative flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-primary"
            :class="activeNumber === unit.number
              ? 'border-primary bg-primary text-white'
              : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'"
            :title="`Unit ${unit.number} · ${unit.code} — ${unit.title}`"
            :aria-label="`Ke Unit ${unit.number} (${unit.code})${unit.complete ? ', lengkap' : ''}`"
            @click="goToUnit(unit.number)"
          >
            {{ unit.number }}

            <span
              v-if="unit.complete"
              class="absolute -right-1 -top-1 size-2.5 rounded-full border border-white bg-success"
            />
          </button>
        </li>
      </ul>
    </nav>
  </Transition>
</template>
