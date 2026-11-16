<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penugasan Asesor' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
</script>

<template>
  <AssessorAssignmentList
    :key="periodId"
    :period-id="periodId"
    back-path="/super-admin/assessor-assignments"
  />
</template>
