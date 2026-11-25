<script setup lang="ts">
definePageMeta({ layout: 'verifikator' })
useHead({ title: 'Hasil Akhir' })
</script>

<template>
  <PeriodPicker
    stage-code="ANNOUNCEMENT"
    title="Hasil Akhir"
    description="Pilih periode sertifikasi untuk melihat hasil akhir peserta dan meninjau tugas remedial."
    note="Tugas remedial dikirim peserta selama tahap Pengumuman dibuka."
    action-label="Hasil Akhir"
    action-icon="i-lucide-award"
    base-path="/verifikator/final-results"
  />
</template>
