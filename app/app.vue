<script setup lang="ts">
// Judul tab: halaman yang mengisi judulnya sendiri tampil "Judul · Sertifikasi CMSP";
// selain itu memakai nama lengkap situs.
useHead({
  titleTemplate: (title?: string) =>
    title ? `${title} · Sertifikasi CMSP` : 'Sertifikasi Coaching dan Mentoring Sektor Publik',
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
