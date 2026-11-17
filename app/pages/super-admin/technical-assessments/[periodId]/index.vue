<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penilaian Asesor Teknis' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
</script>

<template>
  <TechnicalAssessmentList
    :period-id="periodId"
    base-path="/super-admin/technical-assessments"
    back-path="/super-admin/technical-assessments"
    show-assessor
  />
</template>
