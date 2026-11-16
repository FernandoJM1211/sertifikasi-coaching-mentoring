<script setup lang="ts">
/**
 * Catatan perbaikan Verifikator untuk satu form (CMSP-01 atau CMSP-02).
 * Nuansa kuning hanya pada border & latar; teks tetap hitam/abu-abu.
 */
defineProps<{
  title: string
  note: string
  reviewedAt?: string
}>()

function formatDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
</script>

<template>
  <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
    <div class="flex items-start gap-3">
      <UIcon name="i-lucide-message-square-warning" class="mt-0.5 size-5 shrink-0 text-amber-500" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p class="text-sm font-semibold text-slate-900">{{ title }}</p>
          <p v-if="formatDateTime(reviewedAt)" class="text-xs text-slate-500">
            {{ formatDateTime(reviewedAt) }}
          </p>
        </div>
        <p class="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
          {{ note }}
        </p>
      </div>
    </div>
  </div>
</template>
