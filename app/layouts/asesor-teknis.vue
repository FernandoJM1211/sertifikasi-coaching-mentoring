<script setup lang="ts">
const navigation = [
  {
    label: 'Beranda',
    icon: 'i-lucide-house',
    to: '/asesor-teknis',
    exact: true,
  },
  {
    label: 'Penilaian CMSP-02',
    icon: 'i-lucide-clipboard-pen',
    to: '/asesor-teknis/assessments',
  },
]
</script>

<template>
  <LayoutDashboardShell
    panel-label="Panel Asesor Teknis"
    header-title="Panel Asesor Teknis"
    base-path="/asesor-teknis"
    :navigation="navigation"
  >
    <slot />
  </LayoutDashboardShell>
</template>
