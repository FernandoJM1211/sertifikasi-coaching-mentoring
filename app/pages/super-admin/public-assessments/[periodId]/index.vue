<script setup lang="ts">
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penilaian Asesor Kepublikan' })

const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
</script>

<template>
  <PublicAssessmentList
    :period-id="periodId"
    base-path="/super-admin/public-assessments"
    back-path="/super-admin/public-assessments"
    show-assessor
  />
</template>
