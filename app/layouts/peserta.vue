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
    label: 'Evaluasi',
    icon: 'i-lucide-file-pen-line',
    to: '/peserta/evaluation',
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
