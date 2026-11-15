<script setup lang="ts">
const navigation = [
  {
    label: 'Periode Sertifikasi',
    icon: 'i-lucide-calendar-days',
    to: '/verifikator/periods',
  },
]
</script>

<template>
  <LayoutDashboardShell
    panel-label="Sistem Sertifikasi"
    header-title="Dashboard Verifikator"
    base-path="/verifikator"
    :navigation="navigation"
  >
    <slot />
  </LayoutDashboardShell>
</template>
