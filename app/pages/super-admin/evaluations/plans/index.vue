<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Perencanaan Evaluasi' })
</script>

<template>
  <PeriodPicker
    title="Perencanaan Evaluasi"
    description="Pilih periode sertifikasi untuk mengatur paket soal, jumlah soal, durasi, dan passing grade evaluasi, serta melihat nilai peserta."
    note="Pengaturan terkunci setelah ada peserta yang mulai mengerjakan evaluasi."
    action-label="Perencanaan Evaluasi"
    action-icon="i-lucide-calendar-check"
    base-path="/super-admin/evaluations/plans"
  />
</template>
