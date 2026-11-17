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
    label: 'Verifikasi Self Assessment',
    icon: 'i-lucide-clipboard-check',
    to: '/super-admin/self-assessments',
  },
  {
    label: 'Penugasan Asesor',
    icon: 'i-lucide-user-check',
    to: '/super-admin/assessor-assignments',
  },
  {
    label: 'Bank Soal',
    icon: 'i-lucide-library',
    to: '/super-admin/evaluations/questions',
  },
  {
    label: 'Paket Soal',
    icon: 'i-lucide-package',
    to: '/super-admin/evaluations/packages',
  },
  {
    label: 'Perencanaan Evaluasi',
    icon: 'i-lucide-calendar-check',
    to: '/super-admin/evaluations/plans',
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
