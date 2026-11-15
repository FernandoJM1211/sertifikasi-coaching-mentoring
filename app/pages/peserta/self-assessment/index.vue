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

function openSelfAssessment(applicationId: string) {
  navigateTo(`/peserta/self-assessment/${encodeURIComponent(applicationId)}`)
}

function getApplicationStatus(status?: string) {
  const normalized = String(status ?? '').toLowerCase()

  if (['approved', 'accepted', 'verified', 'active'].includes(normalized)) {
    return { label: 'Terverifikasi', color: 'success' as const }
  }

  if (['rejected', 'declined'].includes(normalized)) {
    return { label: 'Ditolak', color: 'error' as const }
  }

  if (['revision', 'needs_revision', 'returned'].includes(normalized)) {
    return { label: 'Perlu Perbaikan', color: 'warning' as const }
  }

  return { label: status || 'Dalam Proses', color: 'neutral' as const }
}

function formatDate(value?: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <p class="text-sm font-semibold text-primary-600">AREA PESERTA</p>
      <h1 class="mt-1 text-2xl font-bold text-gray-900">Self Assessment</h1>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
        Pilih pengajuan sertifikasi yang akan Anda lengkapi melalui Formulir Permohonan
        Sertifikasi (CMSP.01) dan Self Assessment Teknis (CMSP.02).
      </p>
    </div>

    <UAlert
      color="info"
      variant="soft"
      title="Petunjuk"
      description="Setiap pengajuan sertifikasi memiliki formulir CMSP.01 dan CMSP.02 masing-masing. Pastikan Anda memilih periode sertifikasi yang sesuai."
      class="mb-6"
    />

    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-32 w-full" />
      <USkeleton class="h-32 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Data pengajuan belum dapat dimuat"
      description="Terjadi kendala saat mengambil daftar pengajuan sertifikasi. Silakan coba muat ulang."
      class="mb-4"
    >
      <template #footer>
        <UButton color="error" variant="soft" @click="refresh()">
          Coba Lagi
        </UButton>
      </template>
    </UAlert>

    <div
      v-else-if="applications.length === 0"
      class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <UIcon name="i-lucide-clipboard-list" class="mx-auto h-10 w-10 text-gray-400" />
      <h2 class="mt-4 text-base font-semibold text-gray-900">Belum Ada Pengajuan Sertifikasi</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-gray-500">
        Daftar pengajuan sertifikasi Anda akan ditampilkan di halaman ini setelah tersedia.
      </p>
      <UButton class="mt-5" to="/peserta" color="primary" variant="soft">
        Kembali ke Beranda
      </UButton>
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-semibold text-gray-900">Daftar Pengajuan Sertifikasi</h2>
        <span class="text-sm text-gray-500">{{ applications.length }} pengajuan</span>
      </div>

      <article
        v-for="item in applications"
        :key="item.application.application_id"
        class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base font-semibold text-gray-900">
                {{ item.period?.period_name || 'Periode Sertifikasi' }}
              </h3>
              <UBadge
                :color="getApplicationStatus(item.application.application_status).color"
                variant="subtle"
              >
                {{ getApplicationStatus(item.application.application_status).label }}
              </UBadge>
            </div>

            <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-gray-500">ID Pengajuan</dt>
                <dd class="mt-0.5 font-medium text-gray-800">
                  {{ item.application.application_id }}
                </dd>
              </div>
              <div>
                <dt class="text-gray-500">Instansi</dt>
                <dd class="mt-0.5 font-medium text-gray-800">
                  {{ item.application.institution_name || '-' }}
                </dd>
              </div>
              <div>
                <dt class="text-gray-500">Tanggal Pengajuan</dt>
                <dd class="mt-0.5 font-medium text-gray-800">
                  {{ formatDate(item.application.submitted_at) }}
                </dd>
              </div>
              <div>
                <dt class="text-gray-500">Status Periode</dt>
                <dd class="mt-0.5 font-medium text-gray-800">
                  {{ item.period?.period_status || '-' }}
                </dd>
              </div>
            </dl>
          </div>

          <UButton
            color="primary"
            class="shrink-0"
            @click="openSelfAssessment(item.application.application_id)"
          >
            Buka Self Assessment
            <UIcon name="i-lucide-arrow-right" class="ml-1 h-4 w-4" />
          </UButton>
        </div>
      </article>
    </div>
  </UContainer>
</template>
