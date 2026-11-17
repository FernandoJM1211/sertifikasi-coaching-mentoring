<script setup lang="ts">
/** Beranda Super Admin: progres timeline setiap periode aktif (tanpa tombol dinamis). */
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Beranda' })
</script>

<template>
  <TimelineStaffHome :show-current-stage="false" />
</template>
