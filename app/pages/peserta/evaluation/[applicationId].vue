<script setup lang="ts">
/**
 * Pengerjaan evaluasi pilihan ganda (Peserta).
 *
 * - Soal & urutan opsi sudah diacak server saat mulai; halaman ini hanya menampilkan.
 * - Jawaban disimpan otomatis (debounce) ke server; timer mengikuti jam server.
 * - Saat waktu habis, jawaban dikirim otomatis.
 * - Nilai tidak ditampilkan kepada peserta.
 */
definePageMeta({ layout: 'peserta' })
useHead({ title: 'Evaluasi' })

type EvaluationQuestion = { number: number, text: string, options: { key: string, text: string }[] }

type EvaluationData = {
  application: { application_id: string }
  period: { period_id: string, period_name: string }
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  config: { question_count: number, duration_minutes: number } | null
  eligibility: { canStart: boolean, message: string }
  server_now: string
  attempt: {
    status: 'IN_PROGRESS' | 'SUBMITTED'
    started_at: string
    deadline_at: string
    submitted_at: string
    submit_type: string
    total_questions: number
    questions: EvaluationQuestion[]
    answers: string[]
  } | null
}

const route = useRoute()
const toast = useToast()
const applicationId = computed(() => String(route.params.applicationId || ''))
const apiPath = computed(() => `/api/peserta/applications/${encodeURIComponent(applicationId.value)}/evaluation`)

const loading = ref(true)
const errorMessage = ref('')
const data = ref<EvaluationData | null>(null)

/** Selisih jam server − jam browser (ms), agar timer tidak bergantung jam perangkat. */
const clockOffset = ref(0)
const now = ref(Date.now())

const answers = ref<string[]>([])
const currentIndex = ref(0)

function applyData(value: EvaluationData) {
  data.value = value
  clockOffset.value = Date.parse(value.server_now) - Date.now()
  now.value = Date.now()

  if (value.attempt?.status === 'IN_PROGRESS') {
    answers.value = [...value.attempt.answers]
    lastSavedSnapshot.value = JSON.stringify(answers.value)
    currentIndex.value = Math.min(currentIndex.value, Math.max(0, value.attempt.questions.length - 1))

    // Dibuka kembali tepat setelah waktu habis (masih dalam toleransi server): kirim otomatis.
    if (Date.parse(value.attempt.deadline_at) <= Date.parse(value.server_now)) autoSubmit()
  }
}

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: EvaluationData }>(apiPath.value, { credentials: 'include' })
    applyData(response.data)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Data evaluasi belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

const attempt = computed(() => data.value?.attempt ?? null)
const inProgress = computed(() => attempt.value?.status === 'IN_PROGRESS')
const questions = computed(() => attempt.value?.questions ?? [])
const currentQuestion = computed(() => questions.value[currentIndex.value])
const answeredCount = computed(() => answers.value.filter(Boolean).length)

/* ---------------- Mulai ---------------- */
const startModalOpen = ref(false)
const starting = ref(false)

/** Menit yang benar-benar tersedia bila tahap berakhir sebelum durasi penuh. */
const effectiveMinutes = computed(() => {
  const config = data.value?.config
  if (!config) return 0
  const end = Date.parse(data.value?.stage.endAt ?? '')
  const serverNow = now.value + clockOffset.value
  if (Number.isNaN(end) || end <= serverNow) return config.duration_minutes
  return Math.min(config.duration_minutes, Math.floor((end - serverNow) / 60000))
})

async function startEvaluation() {
  starting.value = true

  try {
    const response = await $fetch<{ data: EvaluationData }>(`${apiPath.value}/start`, { method: 'POST', credentials: 'include' })
    currentIndex.value = 0
    applyData(response.data)
    startModalOpen.value = false
  } catch (error) {
    toast.add({ title: 'Evaluasi tidak dapat dimulai', description: getApiErrorMessage(error, 'Terjadi kesalahan. Silakan coba lagi.'), color: 'error', icon: 'i-lucide-circle-x' })
    await load()
    startModalOpen.value = false
  } finally {
    starting.value = false
  }
}

/* ---------------- Timer ---------------- */
let ticker: ReturnType<typeof setInterval> | null = null

const remainingMs = computed(() => {
  if (!attempt.value || !inProgress.value) return 0
  return Math.max(0, Date.parse(attempt.value.deadline_at) - (now.value + clockOffset.value))
})

const timerLabel = computed(() => {
  const totalSeconds = Math.ceil(remainingMs.value / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
})

const warned = new Set<number>()

watch(remainingMs, (value) => {
  if (!inProgress.value) return

  for (const minutes of [5, 1]) {
    if (value > 0 && value <= minutes * 60_000 && !warned.has(minutes)) {
      warned.add(minutes)
      toast.add({ title: `Sisa waktu ${minutes} menit`, description: 'Jawaban akan dikirim otomatis saat waktu habis.', color: 'warning', icon: 'i-lucide-alarm-clock' })
    }
  }

  if (value <= 0) autoSubmit()
})

/** Kirim otomatis saat waktu habis; hanya dicoba sekali agar tidak berulang bila gagal. */
let autoSubmitted = false

function autoSubmit() {
  if (autoSubmitted || submitting.value) return
  autoSubmitted = true
  void nextTick(() => submit('AUTO'))
}

/* ---------------- Autosave ---------------- */
const saveState = ref<'saved' | 'saving' | 'error'>('saved')
const lastSavedSnapshot = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

const hasUnsaved = computed(() => JSON.stringify(answers.value) !== lastSavedSnapshot.value)

async function saveAnswers() {
  if (!inProgress.value || !hasUnsaved.value || submitting.value) return
  const snapshot = JSON.stringify(answers.value)
  saveState.value = 'saving'

  try {
    await $fetch(`${apiPath.value}/answers`, { method: 'PUT', body: { answers: answers.value }, credentials: 'include' })
    lastSavedSnapshot.value = snapshot
    saveState.value = hasUnsaved.value ? 'saving' : 'saved'
    if (hasUnsaved.value) scheduleSave()
  } catch (error) {
    saveState.value = 'error'
    const message = getApiErrorMessage(error, '')
    // Waktu habis / sudah dikirim di server: muat ulang status terbaru.
    if (message.includes('habis') || message.includes('sudah dikirim')) {
      toast.add({ title: 'Evaluasi telah ditutup', description: message, color: 'warning', icon: 'i-lucide-alarm-clock' })
      await load()
    }
  }
}

function scheduleSave(delay = 1500) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveAnswers, delay)
}

function choose(key: string) {
  if (!inProgress.value || remainingMs.value <= 0) return
  answers.value[currentIndex.value] = answers.value[currentIndex.value] === key ? '' : key
  scheduleSave()
}

function goTo(index: number) {
  currentIndex.value = Math.min(Math.max(0, index), questions.value.length - 1)
}

/* ---------------- Submit ---------------- */
const submitModalOpen = ref(false)
const submitting = ref(false)

async function submit(type: 'MANUAL' | 'AUTO') {
  if (submitting.value) return
  submitting.value = true
  if (saveTimer) clearTimeout(saveTimer)

  try {
    await $fetch(`${apiPath.value}/submit`, { method: 'POST', body: { answers: answers.value }, credentials: 'include' })
    lastSavedSnapshot.value = JSON.stringify(answers.value)
    toast.add({
      title: type === 'AUTO' ? 'Waktu habis — jawaban dikirim otomatis' : 'Jawaban evaluasi berhasil dikirim',
      color: type === 'AUTO' ? 'warning' : 'success',
      icon: type === 'AUTO' ? 'i-lucide-alarm-clock' : 'i-lucide-circle-check',
    })
  } catch (error) {
    toast.add({ title: 'Pengiriman jawaban bermasalah', description: getApiErrorMessage(error, 'Silakan muat ulang halaman.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    submitModalOpen.value = false
    submitting.value = false
    await load()
  }
}

/* ---------------- Siklus halaman ---------------- */
function beforeUnload(event: BeforeUnloadEvent) {
  if (inProgress.value && hasUnsaved.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onMounted(async () => {
  await load()
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  window.addEventListener('beforeunload', beforeUnload)
})

onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker)
  if (saveTimer) clearTimeout(saveTimer)
  window.removeEventListener('beforeunload', beforeUnload)
  void saveAnswers()
})
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <div v-if="loading && !data" class="flex items-center justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-500">Memuat evaluasi...</span>
    </div>

    <UAlert v-else-if="errorMessage || !data" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage || 'Data evaluasi belum dapat dimuat.'">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <!-- ================= Sedang mengerjakan ================= -->
    <template v-else-if="inProgress && attempt">
      <div class="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-slate-900">Evaluasi · {{ data.period.period_name }}</p>
          <p class="text-xs text-slate-500">
            {{ answeredCount }} dari {{ questions.length }} soal dijawab ·
            <span :class="saveState === 'error' ? 'text-red-600' : ''">
              {{ saveState === 'saving' || hasUnsaved ? 'Menyimpan...' : saveState === 'error' ? 'Gagal menyimpan, akan dicoba lagi' : 'Jawaban tersimpan' }}
            </span>
          </p>
        </div>
        <div
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-lg font-semibold tabular-nums"
          :class="remainingMs <= 5 * 60_000 ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'"
          role="timer"
          :aria-label="`Sisa waktu ${timerLabel}`"
        >
          <UIcon name="i-lucide-timer" class="size-5" />
          {{ timerLabel }}
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <UCard v-if="currentQuestion">
          <template #header>
            <p class="text-sm font-semibold text-primary">Soal {{ currentQuestion.number }} dari {{ questions.length }}</p>
          </template>

          <p class="whitespace-pre-line text-base leading-7 text-slate-900">{{ currentQuestion.text }}</p>

          <div class="mt-6 space-y-3" role="radiogroup" :aria-label="`Pilihan jawaban soal ${currentQuestion.number}`">
            <button
              v-for="option in currentQuestion.options"
              :key="option.key"
              type="button"
              role="radio"
              :aria-checked="answers[currentIndex] === option.key"
              class="flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition"
              :class="answers[currentIndex] === option.key
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50'"
              @click="choose(option.key)"
            >
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                :class="answers[currentIndex] === option.key ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-600'"
              >
                {{ option.key }}
              </span>
              <span class="pt-1 text-sm leading-6 text-slate-800">{{ option.text }}</span>
            </button>
          </div>

          <template #footer>
            <div class="flex items-center justify-between gap-3">
              <UButton color="neutral" variant="outline" icon="i-lucide-chevron-left" :disabled="currentIndex === 0" @click="goTo(currentIndex - 1)">
                Sebelumnya
              </UButton>
              <UButton v-if="currentIndex < questions.length - 1" trailing-icon="i-lucide-chevron-right" @click="goTo(currentIndex + 1)">
                Berikutnya
              </UButton>
              <UButton v-else color="success" icon="i-lucide-send" @click="submitModalOpen = true">Selesai & Kirim</UButton>
            </div>
          </template>
        </UCard>

        <UCard class="h-fit lg:sticky lg:top-24">
          <template #header>
            <p class="text-sm font-semibold text-slate-900">Navigasi Soal</p>
          </template>
          <div class="grid grid-cols-6 gap-2 lg:grid-cols-5">
            <button
              v-for="(question, index) in questions"
              :key="question.number"
              type="button"
              class="flex aspect-square items-center justify-center rounded-lg border text-sm font-medium transition"
              :class="[
                answers[index] ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40',
                index === currentIndex ? 'ring-2 ring-primary/40 ring-offset-1' : '',
              ]"
              :aria-label="`Soal ${question.number}${answers[index] ? ', sudah dijawab' : ''}`"
              @click="goTo(index)"
            >
              {{ question.number }}
            </button>
          </div>
          <div class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span class="flex items-center gap-1.5"><span class="size-3 rounded bg-primary" /> Dijawab</span>
            <span class="flex items-center gap-1.5"><span class="size-3 rounded border border-slate-300" /> Belum</span>
          </div>
          <template #footer>
            <UButton block color="success" icon="i-lucide-send" @click="submitModalOpen = true">Selesai & Kirim</UButton>
          </template>
        </UCard>
      </div>

      <UModal v-model:open="submitModalOpen" :dismissible="!submitting" title="Kirim Jawaban Evaluasi?" description="Jawaban tidak dapat diubah setelah dikirim.">
        <template #body>
          <div class="space-y-3 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-slate-500">Dijawab</p>
                <p class="text-xl font-semibold text-slate-900">{{ answeredCount }}</p>
              </div>
              <div class="rounded-lg p-3" :class="answeredCount < questions.length ? 'bg-amber-50' : 'bg-slate-50'">
                <p class="text-slate-500">Belum dijawab</p>
                <p class="text-xl font-semibold" :class="answeredCount < questions.length ? 'text-amber-700' : 'text-slate-900'">
                  {{ questions.length - answeredCount }}
                </p>
              </div>
            </div>
            <p v-if="answeredCount < questions.length" class="text-slate-600">Soal yang belum dijawab akan dinilai salah.</p>
          </div>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton color="neutral" variant="outline" :disabled="submitting" @click="submitModalOpen = false">Kembali Mengerjakan</UButton>
            <UButton color="success" icon="i-lucide-send" :loading="submitting" :disabled="submitting" @click="submit('MANUAL')">Kirim Jawaban</UButton>
          </div>
        </template>
      </UModal>
    </template>

    <!-- ================= Sudah dikirim ================= -->
    <UCard v-else-if="attempt?.status === 'SUBMITTED'" class="mx-auto max-w-2xl">
      <div class="flex flex-col items-center py-8 text-center">
        <div class="flex size-14 items-center justify-center rounded-full bg-emerald-50">
          <UIcon name="i-lucide-circle-check" class="size-8 text-emerald-600" />
        </div>
        <h1 class="mt-4 text-xl font-semibold text-slate-900">Evaluasi Telah Dikirim</h1>
        <p class="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Jawaban Anda untuk {{ attempt.total_questions }} soal telah diterima pada
          <span class="font-medium text-slate-800">{{ formatDateTimeId(attempt.submitted_at) }}</span>
          <template v-if="attempt.submit_type === 'AUTO'"> (dikirim otomatis karena waktu habis)</template>.
          Hasil evaluasi akan disampaikan oleh penyelenggara.
        </p>
        <UButton class="mt-6" to="/peserta" color="neutral" variant="outline" icon="i-lucide-house">Kembali ke Beranda</UButton>
      </div>
    </UCard>

    <!-- ================= Belum mulai ================= -->
    <template v-else>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h1 class="text-2xl font-semibold text-slate-900">Evaluasi</h1>
          <p class="mt-1 text-sm text-slate-500">{{ data.period.period_name }}</p>
        </div>
        <UButton to="/peserta/evaluation" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm" class="shrink-0">Kembali</UButton>
      </div>

      <UCard class="mx-auto max-w-3xl">
        <template #header>
          <h2 class="font-semibold text-slate-900">Petunjuk Evaluasi</h2>
        </template>

        <div class="space-y-5">
          <dl class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg bg-slate-50 p-3">
              <dt class="text-sm text-slate-500">Jumlah Soal</dt>
              <dd class="mt-0.5 text-lg font-semibold text-slate-900">{{ data.config ? `${data.config.question_count} soal` : '-' }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 p-3">
              <dt class="text-sm text-slate-500">Durasi</dt>
              <dd class="mt-0.5 text-lg font-semibold text-slate-900">{{ data.config ? `${data.config.duration_minutes} menit` : '-' }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 p-3">
              <dt class="text-sm text-slate-500">Batas Tahap Evaluasi</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-900">{{ formatDateTimeId(data.stage.endAt) }}</dd>
            </div>
          </dl>

          <ul class="space-y-2 text-sm leading-6 text-slate-600">
            <li class="flex gap-2"><UIcon name="i-lucide-circle-dot" class="mt-1 size-4 shrink-0 text-primary" /> Soal berbentuk pilihan ganda; pilih satu jawaban yang paling tepat.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-circle-dot" class="mt-1 size-4 shrink-0 text-primary" /> Waktu berjalan sejak tombol <b>Mulai</b> ditekan dan tidak dapat dihentikan, termasuk bila halaman ditutup.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-circle-dot" class="mt-1 size-4 shrink-0 text-primary" /> Jawaban tersimpan otomatis. Bila koneksi terputus, buka kembali halaman ini untuk melanjutkan.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-circle-dot" class="mt-1 size-4 shrink-0 text-primary" /> Saat waktu habis, jawaban yang tersimpan dikirim otomatis. Soal yang tidak dijawab dinilai salah.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-circle-dot" class="mt-1 size-4 shrink-0 text-primary" /> Evaluasi hanya dapat dikerjakan <b>satu kali</b>.</li>
          </ul>

          <UAlert
            v-if="!data.eligibility.canStart"
            color="warning"
            variant="subtle"
            icon="i-lucide-info"
            title="Evaluasi belum dapat dimulai"
            :description="data.eligibility.message"
          />
          <UAlert
            v-else-if="data.config && effectiveMinutes < data.config.duration_minutes"
            color="warning"
            variant="subtle"
            icon="i-lucide-alarm-clock"
            title="Waktu pengerjaan terpotong"
            :description="`Tahap evaluasi berakhir sebelum durasi penuh. Bila mulai sekarang, Anda hanya memiliki sekitar ${effectiveMinutes} menit.`"
          />
        </div>

        <template #footer>
          <div class="flex justify-center">
            <UButton size="lg" icon="i-lucide-play" :disabled="!data.eligibility.canStart" @click="startModalOpen = true">
              Mulai Evaluasi
            </UButton>
          </div>
        </template>
      </UCard>

      <UModal v-model:open="startModalOpen" :dismissible="!starting" title="Mulai Evaluasi Sekarang?" description="Waktu pengerjaan akan langsung berjalan.">
        <template #body>
          <p class="text-sm leading-6 text-slate-600">
            Anda memiliki <span class="font-semibold text-slate-900">{{ effectiveMinutes }} menit</span> untuk mengerjakan
            {{ data.config?.question_count }} soal. Pastikan koneksi internet stabil sebelum memulai.
          </p>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton color="neutral" variant="outline" :disabled="starting" @click="startModalOpen = false">Batal</UButton>
            <UButton icon="i-lucide-play" :loading="starting" :disabled="starting" @click="startEvaluation">Mulai</UButton>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
