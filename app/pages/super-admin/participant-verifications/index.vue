<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Verifikasi Peserta' })
</script>

<template>
  <PeriodPicker
    stage-code="DOCUMENT_VERIFICATION"
    title="Verifikasi Peserta"
    description="Pilih periode sertifikasi untuk memeriksa berkas pendaftar, lalu menerima atau menolak pengajuan."
    note="Akun peserta dibuat untuk pengajuan yang diterima."
    action-label="Verifikasi Peserta"
    action-icon="i-lucide-users"
    base-path="/super-admin/participant-verifications"
  />
</template>
