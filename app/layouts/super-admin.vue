<script setup lang="ts">
const navigation = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/super-admin',
    exact: true,
  },
  {
    label: 'Periode Sertifikasi',
    icon: 'i-lucide-calendar-days',
    to: '/super-admin/periods',
  },
  {
    label: 'Manajemen Akun',
    icon: 'i-lucide-users',
    to: '/super-admin/accounts',
  },
]
</script>

<template>
  <LayoutDashboardShell
    panel-label="Panel Super Admin"
    header-title="Panel Super Admin"
    base-path="/super-admin"
    :navigation="navigation"
  >
    <slot />
  </LayoutDashboardShell>
</template>
