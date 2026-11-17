<script setup lang="ts">
definePageMeta({ layout: 'asesor-teknis' })
useHead({ title: 'Penilaian CMSP-02' })
</script>

<template>
  <PeriodPicker
    stage-code="ASSESSOR_ASSESSMENT"
    title="Penilaian CMSP-02"
    description="Pilih periode untuk menilai CMSP-02 peserta yang ditugaskan kepada Anda."
    note="Penilaian hanya dapat diisi pada saat tahap Penilaian Asesor dibuka."
    action-label="Buka Penilaian"
    action-icon="i-lucide-clipboard-pen"
    base-path="/asesor-teknis/assessments"
    endpoint="/api/technical-assessments/periods"
  />
</template>
