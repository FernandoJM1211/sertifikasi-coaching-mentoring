<template>
  <div class="space-y-5">
    <!-- Navigasi periode -->

<div class="flex justify-end">
  <UButton
    to="/verifier/periods"
    color="neutral"
    variant="outline"
    icon="i-lucide-arrow-left"
    size="sm"
  >
    Kembali
  </UButton>
</div>

    <div>

<div v-if="period">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-xl font-semibold text-slate-900 sm:text-2xl">
      {{ period.period_name }}
    </h1>
    <UBadge
      :color="getPeriodStatusColor(period.period_status)"
      variant="subtle"
    >
      {{ formatPeriodStatus(period.period_status) }}
    </UBadge>
  </div>
</div>

      <h1 v-else class="text-xl font-semibold text-slate-900 sm:text-2xl">
        Dashboard Periode Sertifikasi
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        ID Periode:
        <span class="font-medium text-slate-700">{{ periodId }}</span>
      </p>
    </div>
    <div v-if="loading && !period" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-500">Memuat dashboard periode...</span>
    </div>
    <UAlert
      v-else-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="errorMessage"
    />
    <template v-else-if="period">
      <!-- Ringkasan hanya sebagai informasi, filter tersedia pada daftar pengajuan. -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Ringkasan Pengajuan</h2>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div
            v-for="card in summaryCards"
            :key="card.key"
            class="rounded-xl border p-3 sm:p-3.5"
            :style="getSummaryCardStyle(card)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium">{{ card.label }}</span>
              <UIcon :name="card.icon" class="size-5 opacity-75" />
            </div>
            <p class="mt-1.5 text-2xl font-semibold">{{ card.value }}</p>
          </div>
        </div>
      </section>
      <!-- Daftar pengajuan -->
      <UCard>
        <template #header>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="font-semibold text-slate-900">Daftar Pengajuan Sertifikasi</h2>
                <p class="mt-1 text-sm text-slate-500">Pengajuan pada periode {{ periodId }}.</p>
              </div>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                size="sm"
                :loading="loading"
                class="self-start"
                @click="fetchDashboard"
              >
                Muat Ulang
              </UButton>
            </div>
            <div class="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 sm:flex-row">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Cari nama, NIP, atau instansi..."
                class="w-full"
              />
              <USelect
                v-model="activeFilter"
                :items="filterOptions"
                value-key="value"
                label-key="label"
                class="w-full sm:w-56"
              />
            </div>
          </div>
        </template>
        <div v-if="loading && applications.length === 0" class="py-8 text-center text-sm text-slate-500">
          Memuat pengajuan...
        </div>
        <div v-else-if="filteredApplications.length === 0" class="py-8 text-center">
          <UIcon name="i-lucide-inbox" class="mx-auto size-9 text-slate-400" />
          <p class="mt-3 font-medium text-slate-700">Tidak ada pengajuan yang sesuai</p>
          <p class="mt-1 text-sm text-slate-500">Coba ubah filter status atau kata pencarian.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[800px] text-left text-sm">

<thead>
  <tr class="border-b border-blue-100">
    <th class="px-4 py-3 text-center font-medium text-blue-600">Peserta</th>
    <th class="px-4 py-3 text-center font-medium text-blue-600">NIP</th>
    <th class="px-4 py-3 text-center font-medium text-blue-600">Instansi</th>
    <th class="px-4 py-3 text-center font-medium text-blue-600">Tanggal Pengajuan</th>
    <th class="px-4 py-3 text-center font-medium text-blue-600">Status</th>
    <th class="px-4 py-3 text-center font-medium text-blue-600">Aksi</th>
  </tr>
</thead>

            <tbody>
              <tr
                v-for="application in paginatedApplications"
                :key="application.application_id"
                class="border-b border-slate-100 last:border-0"
              >
                <td class="px-3 py-4 font-medium text-slate-800">{{ application.full_name_snapshot }}</td>
                <td class="px-3 py-4 text-slate-600">{{ application.nip_snapshot }}</td>
                <td class="px-3 py-4 text-slate-600">{{ application.institution_name }}</td>
                <td class="px-3 py-4 text-slate-600">{{ formatDate(application.submitted_at) }}</td>
                <td class="px-3 py-4">
                  <UBadge
                    class="inline-flex min-w-32 items-center justify-center text-center"
                    :color="getApplicationStatusColor(application.application_status)"
                    variant="subtle"
                  >
                    {{ formatApplicationStatus(application.application_status) }}
                  </UBadge>
                </td>
                <td class="px-3 py-4 text-right">
                  <!-- Tombol dan badge memakai lebar tetap yang sama agar kolom aksi sejajar. -->
                  <UButton
                    v-if="application.application_status === 'pending_verification'"
                    :to="`/verifier/applications/${application.application_id}`"
                    color="primary"
                    variant="solid"
                    size="sm"
                    class="inline-flex w-32 justify-center"
                  >
                    Verifikasi
                  </UButton>
                  <UButton
                    v-else
                    :to="`/verifier/applications/${application.application_id}`"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="inline-flex w-32 justify-center"
                  >
                    Lihat
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <template #footer>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-slate-500">
              Menampilkan
              {{ filteredApplications.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredApplications.length) }}
              dari {{ filteredApplications.length }} pengajuan
            </p>
            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-chevron-left"
                :disabled="currentPage <= 1"
                @click="currentPage--"
              >
                Sebelumnya
              </UButton>
              <span class="px-1 text-sm text-slate-600">{{ currentPage }} / {{ totalPages }}</span>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                trailing-icon="i-lucide-chevron-right"
                :disabled="currentPage >= totalPages"
                @click="currentPage++"
              >
                Berikutnya
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
type CertificationPeriod = {
  period_id: string
  certification_type_id: string
  category_id: string
  period_name: string
  period_status: string
  created_by: string
  created_at: string
  updated_at: string
}
type Application = {
  application_id: string
  person_id: string
  period_id: string
  category_id: string
  full_name_snapshot: string
  nip_snapshot: string
  institution_name: string
  region: string
  email_snapshot: string
  phone_snapshot: string
  last_education: string
  position: string
  application_status: string
  verification_note: string
  submitted_at: string
  created_at: string
  updated_at: string
}
type Summary = {
  total: number
  pendingVerification: number
  accepted: number
  rejected: number
}
type SummaryCard = {
  key: string
  label: string
  value: number
  icon: string
  background: string
  border: string
  text: string
}
definePageMeta({ layout: 'verifier' })
const route = useRoute()
const periodId = computed(() => String(route.params.periodId || ''))
const period = ref<CertificationPeriod | null>(null)
const applications = ref<Application[]>([])
const summary = ref<Summary>({
  total: 0,
  pendingVerification: 0,
  accepted: 0,
  rejected: 0,
})
const loading = ref(false)
const errorMessage = ref('')
const activeFilter = ref('ALL')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 10
const filterOptions = [
  { label: 'Semua Pengajuan', value: 'ALL' },
  { label: 'Menunggu Verifikasi', value: 'pending_verification' },
  { label: 'Diterima', value: 'accepted' },
  { label: 'Ditolak', value: 'rejected' },
]
const summaryCards = computed<SummaryCard[]>(() => [
  {
    key: 'ALL',
    label: 'Total Pengajuan',
    value: summary.value.total,
    icon: 'i-lucide-files',
    background: '#eff6ff',
    border: '#bfdbfe',
    text: '#2563eb',
  },
  {
    key: 'pending_verification',
    label: 'Menunggu Verifikasi',
    value: summary.value.pendingVerification,
    icon: 'i-lucide-clock-3',
    background: '#fffbeb',
    border: '#fde68a',
    text: '#b45309',
  },
  {
    key: 'accepted',
    label: 'Diterima',
    value: summary.value.accepted,
    icon: 'i-lucide-circle-check',
    background: '#e7f9ef',
    border: '#86efac',
    text: '#00b85a',
  },
  {
    key: 'rejected',
    label: 'Ditolak',
    value: summary.value.rejected,
    icon: 'i-lucide-circle-x',
    background: '#ffebeb',
    border: '#fda4af',
    text: '#ff3347',
  },
])
function getSummaryCardStyle(card: SummaryCard) {
  // Warna inline mengikuti palet badge status dan menghindari tertimpa utility class.
  return {
    backgroundColor: card.background,
    borderColor: card.border,
    color: card.text,
  }
}
const filteredApplications = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return applications.value.filter((application) => {
    const matchesStatus =
      activeFilter.value === 'ALL' || application.application_status === activeFilter.value
    const searchableText = [
      application.full_name_snapshot,
      application.nip_snapshot,
      application.institution_name,
    ].join(' ').toLowerCase()
    return matchesStatus && searchableText.includes(query)
  })
})
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredApplications.value.length / pageSize)),
)
const paginatedApplications = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredApplications.value.slice(start, start + pageSize)
})
watch([activeFilter, searchQuery], () => {
  currentPage.value = 1
})
watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})
function formatPeriodStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    ACTIVE: 'Aktif',
    OPEN: 'Dibuka',
    CLOSED: 'Ditutup',
    COMPLETED: 'Selesai',
  }
  return labels[status.toUpperCase()] || status
}
function getPeriodStatusColor(status: string): 'neutral' | 'success' | 'warning' | 'error' {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'OPEN':
      return 'success'
    case 'CLOSED':
    case 'COMPLETED':
      return 'neutral'
    case 'DRAFT':
      return 'warning'
    default:
      return 'neutral'
  }
}
function formatApplicationStatus(status: string) {
  const labels: Record<string, string> = {
    pending_verification: 'Menunggu Verifikasi',
    accepted: 'Diterima',
    rejected: 'Ditolak',
    superseded: 'Tidak Dilanjutkan',
  }
  return labels[status] || status
}
function getApplicationStatusColor(status: string): 'neutral' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'pending_verification':
      return 'warning'
    case 'accepted':
      return 'success'
    case 'rejected':
      return 'error'
    default:
      return 'neutral'
  }
}
function formatDate(value: string) {
  if (!value) return 'Belum tersedia'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Belum tersedia'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}
async function fetchDashboard() {
  if (!periodId.value) {
    errorMessage.value = 'ID periode tidak ditemukan pada alamat halaman.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const [periodResponse, applicationResponse, summaryResponse] = await Promise.all([
      $fetch<{
        success: boolean
        data: { period: CertificationPeriod; timelines?: unknown[] }
      }>(`/api/certification-timelines/${periodId.value}`),
      $fetch<{ success: boolean; data: Application[] }>(
        `/api/application-verifications/by-period/${periodId.value}`,
      ),
      $fetch<{ success: boolean; data: Summary }>(
        `/api/application-verifications/period-summary?periodId=${encodeURIComponent(periodId.value)}`,
      ),
    ])
    period.value = periodResponse.data.period
    applications.value = applicationResponse.data
    summary.value = summaryResponse.data
  } catch (error: any) {
    console.error('Gagal memuat dashboard periode:', error)
    errorMessage.value =
      error?.data?.statusMessage ||
      error?.data?.message ||
      'Gagal memuat dashboard periode sertifikasi.'
  } finally {
    loading.value = false
  }
}
watch(periodId, () => fetchDashboard())
onMounted(() => fetchDashboard())
</script>
