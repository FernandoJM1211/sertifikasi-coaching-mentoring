<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penilaian Asesor Teknis' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
const applicationId = computed(() => String(route.params.applicationId || ''))
</script>

<template>
  <TechnicalAssessmentDetail
    :application-id="applicationId"
    :back-path="`/super-admin/technical-assessments/${periodId}`"
  />
</template>
