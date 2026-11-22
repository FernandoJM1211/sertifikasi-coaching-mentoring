<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penilaian Asesor Kepublikan' })
</script>

<template>
  <PeriodPicker
    stage-code="ASSESSOR_ASSESSMENT"
    title="Penilaian Asesor Kepublikan"
    description="Pantau penilaian CMSP-03 oleh Asesor Kepublikan per periode."
    note="Super Admin dapat melihat, mengisi, dan membuka kunci penilaian selama tahap Penilaian Asesor dibuka."
    action-label="Lihat Penilaian"
    action-icon="i-lucide-clipboard-pen"
    base-path="/super-admin/public-assessments"
  />
</template>
