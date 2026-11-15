<script setup lang="ts">
/**
 * Kartu Submit di bagian bawah halaman. Aktif hanya jika CMSP-01 dan
 * CMSP-02 sudah 100% dan pernyataan pemohon disetujui.
 */
const props = defineProps<{
  progressCmsp01: number
  progressCmsp02: number
  declarationAccepted: boolean
  submitting: boolean
  disabled: boolean
}>()

defineEmits<{ submit: [] }>()

const canSubmit = computed(() =>
  props.progressCmsp01 === 100 &&
  props.progressCmsp02 === 100 &&
  props.declarationAccepted,
)
</script>

<template>
  <div class="flex justify-center">
    <UCard class="w-full max-w-3xl border border-primary/30 bg-white/90 shadow-sm" :ui="{ body: 'p-4 sm:p-5' }">
      <div class="flex flex-col items-center gap-3 text-center">
        <p class="text-sm leading-6 text-slate-600">
          Pastikan tidak ada kesalahan, karena data tidak dapat diubah lagi setelah submit.
        </p>

        <UButton
          icon="i-lucide-send"
          :loading="submitting"
          :disabled="!canSubmit || disabled || submitting"
          class="min-w-40 justify-center"
          @click="$emit('submit')"
        >
          Submit
        </UButton>
      </div>
    </UCard>
  </div>
</template>
