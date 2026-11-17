<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penilaian Asesor Teknis' })
</script>

<template>
  <PeriodPicker
    stage-code="ASSESSOR_ASSESSMENT"
    title="Penilaian Asesor Teknis"
    description="Pantau penilaian CMSP-02 oleh Asesor Teknis per periode."
    note="Super Admin dapat melihat, mengisi, dan membuka kunci penilaian selama tahap Penilaian Asesor dibuka."
    action-label="Lihat Penilaian"
    action-icon="i-lucide-clipboard-pen"
    base-path="/super-admin/technical-assessments"
  />
</template>
