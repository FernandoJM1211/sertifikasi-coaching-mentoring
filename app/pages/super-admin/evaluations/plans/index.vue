<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Perencanaan Tes Tertulis' })
</script>

<template>
  <PeriodPicker
    stage-code="EVALUATION"
    title="Perencanaan Tes Tertulis"
    description="Pilih periode sertifikasi untuk mengatur paket soal, jumlah soal, durasi, dan passing grade tes tertulis, serta melihat nilai peserta."
    note="Perubahan pengaturan berlaku setelah diterapkan; nilai peserta yang sudah mengerjakan tidak berubah."
    action-label="Perencanaan Tes Tertulis"
    action-icon="i-lucide-calendar-check"
    base-path="/super-admin/evaluations/plans"
  />
</template>
