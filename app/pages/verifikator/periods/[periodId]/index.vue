<script setup lang="ts">
// Alamat lama daftar pendaftar per periode; kini ada di menu Verifikasi Peserta.
definePageMeta({
  layout: 'verifikator',
  redirect: (to) => `/verifikator/participant-verifications/${encodeURIComponent(String(to.params.periodId))}`,
})
</script>

<template>
  <div />
</template>
