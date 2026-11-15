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
]
</script>

<template>
  <LayoutDashboardShell
    panel-label="Sistem Sertifikasi"
    header-title="Portal Peserta Sertifikasi"
    base-path="/peserta"
    :navigation="navigation"
  >
    <slot />
  </LayoutDashboardShell>
</template>
