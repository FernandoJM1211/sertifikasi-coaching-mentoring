<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Verifikasi Self Assessment' })
</script>

<template>
  <PeriodPicker
    stage-code="SELF_ASSESSMENT_VERIFICATION"
    title="Verifikasi Self Assessment"
    description="Pilih periode sertifikasi untuk memeriksa dan memverifikasi CMSP-01 dan CMSP-02 peserta."
    note="Keputusan verifikasi hanya dapat diberikan pada saat tahap Verifikasi Self Assessment dibuka."
    action-label="Verifikasi Self Assessment"
    action-icon="i-lucide-clipboard-check"
    base-path="/super-admin/self-assessments"
  />
</template>
