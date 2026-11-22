<script setup lang="ts">
definePageMeta({ layout: 'asesor-kepublikan' })
useHead({ title: 'Penilaian CMSP-03' })
</script>

<template>
  <PeriodPicker
    stage-code="ASSESSOR_ASSESSMENT"
    title="Penilaian CMSP-03"
    description="Pilih periode untuk menilai CMSP-03 peserta yang ditugaskan kepada Anda."
    note="Penilaian hanya dapat diisi saat tahap Penilaian Asesor dibuka dan setelah Asesor Teknis selesai menilai."
    action-label="Buka Penilaian"
    action-icon="i-lucide-clipboard-pen"
    base-path="/asesor-kepublikan/assessments"
    endpoint="/api/public-assessments/periods"
  />
</template>
