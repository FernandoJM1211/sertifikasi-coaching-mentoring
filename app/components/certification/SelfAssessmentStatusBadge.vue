<script setup lang="ts">
import { SELF_ASSESSMENT_STATUS_LABELS } from '~~/shared/utils/self-assessment'

/**
 * Badge status self assessment (dipakai di header CMSP-01 & CMSP-02).
 * `REVISION_NO_NOTE` (hanya tampilan): status Perlu Perbaikan, tetapi form ini tidak mendapat
 * catatan dari Verifikator → "Tidak Ada Catatan" (docs/08 K-13).
 */
const props = defineProps<{ status: string }>()

const label = computed(() => {
  if (props.status === 'REVISION_NO_NOTE') return 'Tidak Ada Catatan'
  return SELF_ASSESSMENT_STATUS_LABELS[props.status as keyof typeof SELF_ASSESSMENT_STATUS_LABELS] ?? props.status
})

const color = computed(() => {
  switch (props.status) {
    case 'SUBMITTED': return 'info' as const
    case 'VERIFIED': return 'success' as const
    case 'REVISION_REQUESTED': return 'warning' as const
    default: return 'neutral' as const
  }
})
</script>

<template>
  <UBadge :color="color" variant="subtle" class="shrink-0">
    {{ label }}
  </UBadge>
</template>
