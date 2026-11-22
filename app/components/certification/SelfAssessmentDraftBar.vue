<script setup lang="ts">
/**
 * Bar Simpan Draft yang melayang di bawah layar (sticky), sehingga peserta
 * tidak perlu scroll ke bawah. Menyimpan CMSP-01 dan CMSP-02 sekaligus.
 */
const props = defineProps<{
  dirty: boolean
  saving: boolean
  disabled: boolean
  lastSavedAt?: string
}>()

defineEmits<{ save: [] }>()

// Bar hanya ditampilkan saat ada perubahan (diatur halaman), jadi status yang
// relevan: sedang menyimpan atau ada perubahan yang belum disimpan.
const savedLabel = computed(() =>
  props.saving ? 'Menyimpan perubahan...' : 'Ada perubahan yang belum disimpan.',
)

const savedClass = computed(() => (props.saving ? 'text-slate-600' : 'text-warning-600'))
</script>

<template>
  <div class="pointer-events-none sticky bottom-4 z-20 flex justify-center">
    <UCard
      class="pointer-events-auto w-full max-w-lg border border-blue-200 bg-white/95 shadow-lg backdrop-blur"
      :ui="{ body: 'p-3 sm:p-4' }"
    >
      <div class="flex items-center gap-4">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-900">
            Simpan perkembangan pengisian
          </p>
          <p class="mt-0.5 text-xs font-medium" :class="savedClass">
            {{ savedLabel }}
          </p>
        </div>

        <UButton
          icon="i-lucide-save"
          :loading="saving"
          :disabled="disabled || saving"
          class="shrink-0"
          @click="$emit('save')"
        >
          Simpan Draft
        </UButton>
      </div>
    </UCard>
  </div>
</template>
