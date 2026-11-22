<script setup lang="ts">
definePageMeta({ layout: 'asesor-kepublikan' })
useHead({ title: 'Penilaian CMSP-03' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
</script>

<template>
  <PublicAssessmentList
    :period-id="periodId"
    base-path="/asesor-kepublikan/assessments"
    back-path="/asesor-kepublikan/assessments"
  />
</template>
