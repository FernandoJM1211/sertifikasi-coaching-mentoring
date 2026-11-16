<script setup lang="ts">
definePageMeta({ layout: 'verifikator' })
useHead({ title: 'Verifikasi Self Assessment' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
</script>

<template>
  <VerificationSelfAssessmentList
    :key="periodId"
    :period-id="periodId"
    :base-path="`/verifikator/self-assessments/${periodId}`"
    back-path="/verifikator/self-assessments"
  />
</template>
