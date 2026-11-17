<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Perencanaan Evaluasi' })
</script>

<template>
  <PeriodPicker
    stage-code="EVALUATION"
    title="Perencanaan Evaluasi"
    description="Pilih periode sertifikasi untuk mengatur paket soal, jumlah soal, durasi, dan passing grade evaluasi, serta melihat nilai peserta."
    note="Perubahan pengaturan berlaku setelah diterapkan; nilai peserta yang sudah mengerjakan tidak berubah."
    action-label="Perencanaan Evaluasi"
    action-icon="i-lucide-calendar-check"
    base-path="/super-admin/evaluations/plans"
  />
</template>
