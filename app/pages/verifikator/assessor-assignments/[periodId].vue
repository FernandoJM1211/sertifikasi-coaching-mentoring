<script setup lang="ts">
definePageMeta({ layout: 'verifikator' })
useHead({ title: 'Penugasan Asesor' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
</script>

<template>
  <AssessorAssignmentList
    :key="periodId"
    :period-id="periodId"
    back-path="/verifikator/assessor-assignments"
  />
</template>
