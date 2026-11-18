<script setup lang="ts">
const navigation = [
  {
    label: 'Beranda',
    icon: 'i-lucide-house',
    to: '/verifikator',
    exact: true,
  },
  {
    label: 'Periode Sertifikasi',
    icon: 'i-lucide-calendar-days',
    to: '/verifikator/periods',
  },
  {
    label: 'Verifikasi Self Assessment',
    icon: 'i-lucide-clipboard-check',
    to: '/verifikator/self-assessments',
  },
  {
    label: 'Penugasan Asesor',
    icon: 'i-lucide-user-check',
    to: '/verifikator/assessor-assignments',
  },
]
</script>

<template>
  <LayoutDashboardShell
    panel-label="Panel Verifikator"
    header-title="Panel Verifikator"
    base-path="/verifikator"
    :navigation="navigation"
  >
    <slot />
  </LayoutDashboardShell>
</template>
