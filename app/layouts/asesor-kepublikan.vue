<script setup lang="ts">
const navigation = [
  {
    label: 'Beranda',
    icon: 'i-lucide-house',
    to: '/asesor-kepublikan',
    exact: true,
  },
  {
    label: 'Penilaian CMSP-03',
    icon: 'i-lucide-clipboard-pen',
    to: '/asesor-kepublikan/assessments',
  },
]
</script>

<template>
  <LayoutDashboardShell
    panel-label="Panel Asesor Kepublikan"
    header-title="Panel Asesor Kepublikan"
    base-path="/asesor-kepublikan"
    :navigation="navigation"
  >
    <slot />
  </LayoutDashboardShell>
</template>
