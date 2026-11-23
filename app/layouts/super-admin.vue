<script setup lang="ts">
const navigation = [
  {
    label: 'Beranda',
    icon: 'i-lucide-house',
    to: '/super-admin',
    exact: true,
  },
  {
    label: 'Atur Periode',
    icon: 'i-lucide-calendar-days',
    to: '/super-admin/periods',
  },
  {
    label: 'Verifikasi Peserta',
    icon: 'i-lucide-users',
    to: '/super-admin/participant-verifications',
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
    label: 'Perencanaan Tes Tertulis',
    icon: 'i-lucide-calendar-check',
    to: '/super-admin/evaluations/plans',
  },
  {
    label: 'Penilaian Asesor Teknis',
    icon: 'i-lucide-clipboard-pen',
    to: '/super-admin/technical-assessments',
  },
  {
    label: 'Penilaian Asesor Kepublikan',
    icon: 'i-lucide-landmark',
    to: '/super-admin/public-assessments',
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
