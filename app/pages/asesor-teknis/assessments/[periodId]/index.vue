<script setup lang="ts">
definePageMeta({ layout: 'asesor-teknis' })
useHead({ title: 'Penilaian CMSP-02' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
</script>

<template>
  <TechnicalAssessmentList
    :period-id="periodId"
    base-path="/asesor-teknis/assessments"
    back-path="/asesor-teknis/assessments"
  />
</template>
