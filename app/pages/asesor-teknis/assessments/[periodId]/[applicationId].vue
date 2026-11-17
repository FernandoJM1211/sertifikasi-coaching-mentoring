<script setup lang="ts">
definePageMeta({ layout: 'asesor-teknis' })
useHead({ title: 'Penilaian CMSP-02' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
const applicationId = computed(() => String(route.params.applicationId || ''))
</script>

<template>
  <TechnicalAssessmentDetail
    :application-id="applicationId"
    :back-path="`/asesor-teknis/assessments/${periodId}`"
  />
</template>
