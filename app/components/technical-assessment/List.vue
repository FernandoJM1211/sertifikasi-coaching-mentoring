<script setup lang="ts">
/**
 * Daftar penilaian CMSP-02 per periode.
 * - Asesor Teknis: hanya peserta yang ditugaskan kepadanya.
 * - Super Admin: semua peserta + kolom nama asesor.
 * Contoh: <TechnicalAssessmentList :period-id="id" base-path="/asesor-teknis/assessments" back-path="/asesor-teknis/assessments" />
 */
import {
  TECHNICAL_LIST_STATUS_LABELS,
  type TechnicalListStatus,
  type TechnicalRecommendation,
} from '~~/shared/utils/technical-assessment'

const props = defineProps<{
  periodId: string
  /** Detail peserta: `${basePath}/${periodId}/${applicationId}`. */
  basePath: string
  backPath: string
  /** Tampilkan kolom nama asesor (Super Admin). */
  showAssessor?: boolean
}>()

type Item = {
  application_id: string
  full_name: string
  nip: string
  institution_name: string
  assessor_name: string
  status: TechnicalListStatus
  written_submitted: boolean
  recommendation: TechnicalRecommendation | ''
  k_count: number
  bk_count: number
  assessed_count: number
  submitted_at: string
  updated_at: string
}

type ListResponse = {
  period: { period_id: string, period_name: string, period_status: string }
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  total_units: number
  summary: { total: number, notStarted: number, waiting: number, draft: number, submitted: number, continued: number, notContinued: number }
  items: Item[]
}

const loading = ref(true)
const errorMessage = ref('')
const data = ref<ListResponse | null>(null)

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: ListResponse }>(
      `/api/technical-assessments/by-period/${encodeURIComponent(props.periodId)}`,
      { credentials: 'include' },
    )
    data.value = response.data
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Daftar penilaian belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** Warna badge = warna card ringkasan terkait (Belum Dinilai abu, Draf kuning, Selesai ungu). */
const STATUS_COLORS: Record<TechnicalListStatus, 'neutral' | 'warning' | 'secondary' | 'info'> = {
  WAITING: 'warning',
  WITHDRAWN: 'neutral',
  NOT_STARTED: 'neutral',
  DRAFT: 'warning',
  SUBMITTED: 'secondary',
}

const FILTERS = [
  { value: 'ALL', label: 'Semua Peserta' },
  { value: 'NOT_STARTED', label: 'Belum Dinilai' },
  { value: 'DRAFT', label: 'Draf' },
  { value: 'SUBMITTED', label: 'Selesai' },
  { value: 'CONTINUE', label: 'Dapat Dilanjutkan' },
  { value: 'NOT_CONTINUE', label: 'Tidak Dapat Dilanjutkan' },
]

const activeFilter = ref('ALL')
const searchQuery = ref('')

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return (data.value?.items ?? []).filter((item) => {
    const matchesFilter =
      activeFilter.value === 'ALL' ||
      item.status === activeFilter.value ||
      // "Belum Dinilai" mencakup yang menunggu tes tertulis.
      (activeFilter.value === 'NOT_STARTED' && item.status === 'WAITING') ||
      (item.status === 'SUBMITTED' && item.recommendation === activeFilter.value)
    const matchesQuery =
      !query || [item.full_name, item.nip, item.institution_name, item.assessor_name].some((value) => value.toLowerCase().includes(query))

    return matchesFilter && matchesQuery
  })
})

const summaryCards = computed(() => [
  { key: 'ALL', label: 'Peserta', value: data.value?.summary.total ?? 0, icon: 'i-lucide-users', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { key: 'NOT_STARTED', label: 'Belum Dinilai', value: data.value?.summary.notStarted ?? 0, icon: 'i-lucide-clock', tone: 'border-slate-300 bg-slate-50 text-slate-600' },
  { key: 'DRAFT', label: 'Draf', value: data.value?.summary.draft ?? 0, icon: 'i-lucide-pencil-line', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'SUBMITTED', label: 'Selesai', value: data.value?.summary.submitted ?? 0, icon: 'i-lucide-circle-check', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
  { key: 'CONTINUE', label: 'Dapat Dilanjutkan', value: data.value?.summary.continued ?? 0, icon: 'i-lucide-arrow-right-circle', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'NOT_CONTINUE', label: 'Tidak Dilanjutkan', value: data.value?.summary.notContinued ?? 0, icon: 'i-lucide-circle-x', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
])

const PERIOD_STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', ACTIVE: 'Aktif', CLOSED: 'Ditutup', COMPLETED: 'Selesai' }

function periodStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'success' as const
    case 'CLOSED': return 'error' as const
    case 'COMPLETED': return 'primary' as const
    case 'DRAFT': return 'warning' as const
    default: return 'neutral' as const
  }
}

/**
 * Aksi tabel seragam (docs/05): ada pekerjaan → "Nilai" (pensil, biru solid); selain itu "Lihat" (mata).
 * Dapat dinilai = tahap dibuka & penilaian belum terkirim (bukan menunggu tahap sebelumnya).
 */
const canAssess = (item: Item) =>
  Boolean(data.value?.stage.open) && (item.status === 'NOT_STARTED' || item.status === 'DRAFT')

/* ---------------- Paginasi tabel ---------------- */
const { page: tablePage, pageSize: tablePageSize, items: pagedItems, reset: resetTablePage } = useTablePagination(filteredItems)
watch([activeFilter, searchQuery], resetTablePage)
</script>

<template>
  <div class="space-y-5">
    <!-- Header: judul kiri; Kembali + status periode kanan -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-blue-500 sm:text-2xl">
          {{ data?.period.period_name || 'Penilaian CMSP-02' }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">Penilaian CMSP-02 oleh Asesor Teknis</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton :to="backPath" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <UBadge v-if="data" :color="periodStatusColor(data.period.period_status)" variant="subtle">
          {{ PERIOD_STATUS_LABELS[data.period.period_status.toUpperCase()] || data.period.period_status }}
        </UBadge>
      </div>
    </div>

    <div v-if="loading && !data" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat daftar penilaian...</span>
    </div>

    <UAlert v-else-if="errorMessage || !data" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage || 'Daftar penilaian belum dapat dimuat.'">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <template v-else>
      <!-- Jadwal tahap penilaian asesor -->
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
        <span class="flex items-center gap-2 font-medium text-slate-800">
          <UIcon name="i-lucide-calendar-clock" class="size-4 text-primary" />
          Tahap Penilaian Asesor
        </span>
        <span class="text-slate-600">Mulai: <span class="font-medium text-slate-800">{{ formatDateTimeId(data.stage.startAt) }}</span></span>
        <span class="text-slate-600">Selesai: <span class="font-medium text-slate-800">{{ formatDateTimeId(data.stage.endAt) }}</span></span>
        <UBadge :color="data.stage.open ? 'success' : 'neutral'" variant="subtle" class="ml-auto">
          {{ data.stage.open ? 'Sedang Dibuka' : 'Tidak Dibuka' }}
        </UBadge>
      </div>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <button
          v-for="card in summaryCards"
          :key="card.key"
          type="button"
          class="rounded-xl border p-3 text-left transition hover:shadow-sm sm:p-3.5"
          :class="[card.tone, activeFilter === card.key && card.key !== 'ALL' ? 'ring-2 ring-blue-300' : '']"
          @click="activeFilter = card.key"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium">{{ card.label }}</span>
            <UIcon :name="card.icon" class="size-5 opacity-75" />
          </div>
          <p class="mt-1.5 text-2xl font-semibold">{{ card.value }}</p>
        </button>
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <h2 class="font-semibold text-slate-900">Daftar Peserta</h2>
              <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" size="sm" :loading="loading" @click="load">
                Muat Ulang
              </UButton>
            </div>
            <div class="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 sm:flex-row">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                :placeholder="showAssessor ? 'Cari nama, NIP, instansi, atau asesor...' : 'Cari nama, NIP, atau instansi...'"
                class="w-full"
              />
              <USelect v-model="activeFilter" :items="FILTERS" value-key="value" label-key="label" class="w-full sm:w-60" />
            </div>
          </div>
        </template>

        <div v-if="filteredItems.length === 0" class="py-8 text-center">
          <UIcon name="i-lucide-inbox" class="mx-auto size-9 text-slate-500" />
          <p class="mt-3 font-medium text-slate-700">
            {{ data.items.length === 0 ? 'Belum ada peserta yang ditugaskan' : 'Tidak ada data yang sesuai' }}
          </p>
          <p class="mt-1 text-sm text-slate-600">
            {{ data.items.length === 0 ? 'Peserta muncul setelah Verifikator menugaskan Asesor Teknis.' : 'Coba ubah filter atau kata pencarian.' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full table-fixed text-left text-sm" :class="showAssessor ? 'min-w-[1140px]' : 'min-w-[960px]'">
            <colgroup>
              <col />
              <col />
              <col v-if="showAssessor" class="w-44" />
              <col class="w-40" />
              <col class="w-40" />
              <col class="w-36" />
              <col class="w-32" />
            </colgroup>
            <thead>
              <tr class="border-b border-blue-100">
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Peserta</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Instansi</th>
                <th v-if="showAssessor" class="px-4 py-3 text-center font-semibold text-blue-600">Asesor Teknis</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Unit Kompetensi</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Status</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Rekomendasi</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in pagedItems" :key="item.application_id" class="border-b border-slate-300 last:border-0">
                <td class="px-4 py-3">
                  <p class="truncate font-medium text-slate-800" :title="item.full_name">{{ item.full_name }}</p>
                  <p class="truncate text-xs text-slate-600">{{ item.nip }}</p>
                </td>
                <td class="px-4 py-3 text-slate-600">
                  <p class="line-clamp-2" :title="item.institution_name">{{ item.institution_name }}</p>
                </td>
                <td v-if="showAssessor" class="px-4 py-3 text-slate-600">
                  <p class="truncate" :title="item.assessor_name">{{ item.assessor_name }}</p>
                </td>
                <td class="px-4 py-3 text-center text-slate-600">
                  <template v-if="item.assessed_count > 0">
                    <span class="font-semibold text-emerald-700">{{ item.k_count }}</span>
                    /
                    <span class="font-semibold text-rose-700">{{ item.bk_count }}</span>
                  </template>
                  <span v-else class="text-slate-500">-</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <UBadge :color="STATUS_COLORS[item.status]" variant="subtle">
                    {{ TECHNICAL_LIST_STATUS_LABELS[item.status] }}
                  </UBadge>
                </td>
                <td class="px-4 py-3 text-center">
                  <UBadge
                    v-if="item.status === 'SUBMITTED' && item.recommendation"
                    :color="item.recommendation === 'CONTINUE' ? 'success' : 'error'"
                    variant="subtle"
                  >
                    {{ item.recommendation === 'CONTINUE' ? 'Dilanjutkan' : 'Tidak Dilanjutkan' }}
                  </UBadge>
                  <span v-else class="text-slate-500">-</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <UButton
                    :to="`${basePath}/${periodId}/${item.application_id}`"
                    :icon="canAssess(item) ? 'i-lucide-pencil' : 'i-lucide-eye'"
                    :color="canAssess(item) ? 'primary' : 'neutral'"
                    :variant="canAssess(item) ? 'solid' : 'outline'"
                    size="sm"
                    class="inline-flex w-24 justify-center"
                  >
                    {{ canAssess(item) ? 'Nilai' : 'Lihat' }}
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <TablePagination v-model:page="tablePage" v-model:page-size="tablePageSize" :total="filteredItems.length" label="peserta" />
        </template>
      </UCard>
    </template>
  </div>
</template>
