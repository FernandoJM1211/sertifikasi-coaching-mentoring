<script setup lang="ts">
definePageMeta({ layout: 'verifikator' })
useHead({ title: 'Penugasan Asesor' })
</script>

<template>
  <PeriodPicker
    stage-code="SELF_ASSESSMENT_VERIFICATION"
    title="Penugasan Asesor"
    description="Pilih periode sertifikasi untuk menugaskan Asesor Teknis dan Asesor Kepublikan kepada peserta."
    note="Penugasan hanya dapat dilakukan pada saat tahap Verifikasi Self Assessment dibuka, untuk peserta yang self assessment-nya telah terverifikasi."
    action-label="Penugasan Asesor"
    action-icon="i-lucide-user-check"
    base-path="/verifikator/assessor-assignments"
  />
</template>
