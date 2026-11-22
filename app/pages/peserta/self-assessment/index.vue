<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'peserta',
})

useHead({
  title: 'Self Assessment',
})

type DashboardApplication = {
  application: {
    application_id: string
    period_id: string
    category_id?: string
    full_name_snapshot?: string
    institution_name?: string
    application_status?: string
    submitted_at?: string
    updated_at?: string
  }
  period: {
    period_id: string
    period_name: string
    period_status?: string
  } | null
  timelines?: Array<{
    stage_code?: string
    stage_name?: string
    stage_status?: string
    status?: string
    start_at?: string
    end_at?: string
  }>
}

type DashboardResponse = {
  success: boolean
  applications: DashboardApplication[]
}

const { data, pending, error, refresh } = await useFetch<DashboardResponse>('/api/peserta/dashboard')

const applications = computed(() => {
  return (data.value?.applications ?? []).filter((item) => item.application?.application_id)
})

/** Jadwal tahap Self Assessment (pengisian CMSP-01 & CMSP-02). */
const selfAssessmentStage = (item: DashboardApplication) =>
  item.timelines?.find((stage) => stage.stage_code === 'SELF_ASSESSMENT')

/* Badge status periode — sama dengan kartu pemilihan periode (PeriodPicker). */
const PERIOD_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  CLOSED: 'Ditutup',
  COMPLETED: 'Selesai',
}

function formatPeriodStatus(status?: string) {
  const value = String(status ?? '')
  return PERIOD_STATUS_LABELS[value.toUpperCase()] || value || '-'
}

function getPeriodStatusColor(status?: string) {
  switch (String(status ?? '').toUpperCase()) {
    case 'ACTIVE': return 'success' as const
    case 'CLOSED': return 'error' as const
    case 'COMPLETED': return 'primary' as const
    case 'DRAFT': return 'warning' as const
    default: return 'neutral' as const
  }
}
</script>

<template>
  <!-- Tata letak seragam dengan halaman pemilihan periode (PeriodPicker) -->
  <div class="mx-auto w-full max-w-5xl space-y-8 pb-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-blue-500">
        Self Assessment
      </h1>
      <p class="text-sm leading-6 text-slate-600">
        Pilih periode sertifikasi untuk mengisi Formulir Permohonan Sertifikasi (CMSP.01) dan Self Assessment Teknis (CMSP.02).
      </p>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-slate-900">
          Daftar Periode
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          Periode sertifikasi yang pengajuannya telah diterima.
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <UBadge color="primary" variant="subtle" size="lg" class="px-3 py-1.5">
          {{ applications.length }} periode
        </UBadge>

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="pending"
          :disabled="pending"
          @click="refresh()"
        >
          Muat Ulang
        </UButton>
      </div>
    </div>

    <div
      v-if="pending"
      class="flex items-center justify-center rounded-xl border border-slate-200 bg-white/90 py-16 shadow-sm"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat daftar periode...</span>
    </div>

    <UAlert
      v-else-if="error"
      icon="i-lucide-circle-alert"
      color="error"
      variant="soft"
      title="Daftar periode belum dapat dimuat. Silakan muat ulang."
    />

    <div
      v-else-if="applications.length > 0"
      class="grid grid-cols-1 items-start gap-5 md:grid-cols-2"
    >
      <UCard
        v-for="item in applications"
        :key="item.application.application_id"
        class="h-full bg-white/90 shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="flex h-full flex-col gap-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-2">
              <p class="text-xs font-medium text-primary">
                Periode Sertifikasi
              </p>

              <h3
                class="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-slate-900"
                :title="item.period?.period_name"
              >
                {{ item.period?.period_name || 'Periode Sertifikasi' }}
              </h3>

              <p class="text-sm text-slate-600">
                Jadwal:
                <span class="font-medium text-slate-700">
                  {{ formatDateTimeId(selfAssessmentStage(item)?.start_at) }} – {{ formatDateTimeId(selfAssessmentStage(item)?.end_at) }}
                </span>
              </p>
            </div>

            <UBadge
              v-if="item.period?.period_status"
              :color="getPeriodStatusColor(item.period.period_status)"
              variant="subtle"
              class="shrink-0"
            >
              {{ formatPeriodStatus(item.period.period_status) }}
            </UBadge>
          </div>

          <div class="mt-auto border-t border-slate-200 pt-4">
            <UButton
              block
              color="primary"
              icon="i-lucide-clipboard-check"
              :to="`/peserta/self-assessment/${encodeURIComponent(item.application.application_id)}`"
            >
              Buka Self Assessment
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-else class="bg-white/90 shadow-sm">
      <div class="flex flex-col items-center py-12 text-center">
        <div class="flex size-14 items-center justify-center rounded-full bg-blue-100">
          <UIcon name="i-lucide-calendar-x" class="size-7 text-primary" />
        </div>
        <h3 class="mt-4 text-base font-semibold text-slate-900">
          Belum ada pengajuan sertifikasi
        </h3>
        <p class="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Periode sertifikasi akan tampil di sini setelah pengajuan Anda diterima.
        </p>
      </div>
    </UCard>
  </div>
</template>
