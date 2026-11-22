<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penilaian Asesor Kepublikan' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
const applicationId = computed(() => String(route.params.applicationId || ''))
</script>

<template>
  <PublicAssessmentDetail
    :application-id="applicationId"
    :back-path="`/super-admin/public-assessments/${periodId}`"
  />
</template>
