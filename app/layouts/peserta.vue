<script setup lang="ts">
const navigation = [
  {
    label: 'Beranda',
    icon: 'i-lucide-house',
    to: '/peserta',
    exact: true,
  },
  {
    label: 'Self Assessment',
    icon: 'i-lucide-clipboard-check',
    to: '/peserta/self-assessment',
  },
  {
    label: 'Tes Tertulis',
    icon: 'i-lucide-file-pen-line',
    to: '/peserta/evaluation',
  },
  {
    label: 'Pengumuman Sertifikasi',
    icon: 'i-lucide-megaphone',
    to: '/peserta/announcement',
  },
]
</script>

<template>
  <LayoutDashboardShell
    panel-label="Portal Peserta"
    header-title="Portal Peserta"
    base-path="/peserta"
    :navigation="navigation"
  >
    <slot />
  </LayoutDashboardShell>
</template>
