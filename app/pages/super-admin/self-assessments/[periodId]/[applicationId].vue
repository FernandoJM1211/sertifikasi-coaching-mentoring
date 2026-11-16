<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Detail Verifikasi Self Assessment' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
const applicationId = computed(() => String(route.params.applicationId || ''))
</script>

<template>
  <VerificationSelfAssessmentDetail
    :key="applicationId"
    :application-id="applicationId"
    :back-path="`/super-admin/self-assessments/${periodId}`"
  />
</template>
