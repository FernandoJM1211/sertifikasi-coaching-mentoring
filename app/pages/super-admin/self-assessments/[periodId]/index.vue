<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Verifikasi Self Assessment' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
</script>

<template>
  <VerificationSelfAssessmentList
    :key="periodId"
    :period-id="periodId"
    :base-path="`/super-admin/self-assessments/${periodId}`"
    back-path="/super-admin/self-assessments"
  />
</template>
