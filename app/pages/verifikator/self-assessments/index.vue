<script setup lang="ts">
definePageMeta({ layout: 'verifikator' })
useHead({ title: 'Verifikasi Self Assessment' })
</script>

<template>
  <PeriodPicker
    title="Verifikasi Self Assessment"
    description="Pilih periode sertifikasi untuk memeriksa dan memverifikasi CMSP-01 dan CMSP-02 peserta."
    note="Keputusan verifikasi hanya dapat diberikan pada saat tahap Verifikasi Self Assessment dibuka."
    action-label="Verifikasi Self Assessment"
    action-icon="i-lucide-clipboard-check"
    base-path="/verifikator/self-assessments"
  />
</template>
