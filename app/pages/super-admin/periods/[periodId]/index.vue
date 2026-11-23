<script setup lang="ts">
// Alamat lama daftar pendaftar per periode; kini ada di menu Verifikasi Peserta.
definePageMeta({
  layout: 'super-admin',
  redirect: (to) => `/super-admin/participant-verifications/${encodeURIComponent(String(to.params.periodId))}`,
})
</script>

<template>
  <div />
</template>
