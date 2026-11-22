<script setup lang="ts">
definePageMeta({ layout: 'asesor-kepublikan' })
useHead({ title: 'Penilaian CMSP-03' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
const applicationId = computed(() => String(route.params.applicationId || ''))
</script>

<template>
  <PublicAssessmentDetail
    :application-id="applicationId"
    :back-path="`/asesor-kepublikan/assessments/${periodId}`"
  />
</template>
