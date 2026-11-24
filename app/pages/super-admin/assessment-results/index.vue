<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penetapan Hasil Asesmen' })
</script>

<template>
  <PeriodPicker
    stage-code="ASSESSMENT_VERIFICATION"
    title="Penetapan Hasil Asesmen"
    description="Pilih periode sertifikasi untuk melihat rekap tes tertulis dan penilaian kedua asesor, lalu menetapkan hasilnya."
    note="Penetapan hanya dapat dilakukan saat tahap Penetapan Hasil Asesmen dibuka dan seluruh hasil penilaian lengkap."
    action-label="Penetapan Hasil Asesmen"
    action-icon="i-lucide-gavel"
    base-path="/super-admin/assessment-results"
  />
</template>
