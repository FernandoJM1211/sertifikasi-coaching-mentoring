<script setup lang="ts">
/**
 * Hasil Akhir satu periode (Verifikator & Super Admin) — docs/08 K-26.
 * Daftar peserta yang hasilnya sudah ditetapkan beserta status akhir; peserta Remedial yang sudah
 * mengirim tugas dapat dinyatakan Lulus / Tidak Lulus (keputusan final).
 */
import {
  FINAL_STATUS_COLORS,
  FINAL_STATUS_LABELS,
  type FinalStatus,
  type RemedialDecision,
} from '~~/shared/utils/final-result'
import type { TableAction } from '~/utils/table-action'

const props = defineProps<{
  /** Halaman daftar periode untuk tombol Kembali. */
  backTo: string
}>()

type Item = {
  application_id: string
  full_name: string
  nip: string
  institution_name: string
  status: FinalStatus
  remedial: { drive_link: string, note: string, submitted_at: string, updated_at: string, decided_at: string, decided_by_name: string } | null
}

type ResultData = {
  period: { period_id: string, period_name: string, period_status: string }
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  announced: boolean
  remedialOpen: boolean
  decided: boolean
  summary: { total: number, passed: number, remedialPending: number, remedialSubmitted: number, failed: number, withdrawn: number }
  items: Item[]
}

const route = useRoute()
const toast = useToast()
const periodId = computed(() => String(route.params.periodId || ''))
const apiPath = computed(() => `/api/final-results/${encodeURIComponent(periodId.value)}`)

const loading = ref(true)
const errorMessage = ref('')
const data = ref<ResultData | null>(null)

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: ResultData }>(apiPath.value, { credentials: 'include' })
    data.value = response.data
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Data hasil akhir belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------------- Filter & pencarian ---------------- */
type FilterKey = 'ALL' | 'PASSED' | 'REMEDIAL_PENDING' | 'REMEDIAL_SUBMITTED' | 'FAILED' | 'WITHDRAWN'

const FILTER_STATUSES: Record<Exclude<FilterKey, 'ALL'>, FinalStatus[]> = {
  PASSED: ['PASSED', 'REMEDIAL_PASSED'],
  REMEDIAL_PENDING: ['REMEDIAL_PENDING'],
  REMEDIAL_SUBMITTED: ['REMEDIAL_SUBMITTED'],
  FAILED: ['REMEDIAL_FAILED', 'REMEDIAL_EXPIRED'],
  WITHDRAWN: ['WITHDRAWN'],
}

const FILTERS = [
  { value: 'ALL', label: 'Semua Peserta' },
  { value: 'PASSED', label: 'Lulus' },
  { value: 'REMEDIAL_PENDING', label: 'Remedial' },
  { value: 'REMEDIAL_SUBMITTED', label: 'Menunggu Tinjauan' },
  { value: 'FAILED', label: 'Tidak Lulus' },
  { value: 'WITHDRAWN', label: 'Tidak Melanjutkan' },
]

const activeFilter = ref<FilterKey>('ALL')
const searchQuery = ref('')

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return (data.value?.items ?? []).filter((item) => {
    const matchesFilter = activeFilter.value === 'ALL' || FILTER_STATUSES[activeFilter.value].includes(item.status)
    const matchesQuery = !query || [item.full_name, item.nip, item.institution_name].some((value) => value.toLowerCase().includes(query))
    return matchesFilter && matchesQuery
  })
})

const summaryCards = computed(() => [
  { key: 'ALL' as const, label: 'Peserta', value: data.value?.summary.total ?? 0, icon: 'i-lucide-users', tone: 'border-blue-300 bg-blue-50 text-blue-700' },
  { key: 'PASSED' as const, label: 'Lulus', value: data.value?.summary.passed ?? 0, icon: 'i-lucide-award', tone: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { key: 'REMEDIAL_PENDING' as const, label: 'Remedial', value: data.value?.summary.remedialPending ?? 0, icon: 'i-lucide-rotate-ccw', tone: 'border-amber-300 bg-amber-50 text-amber-700' },
  { key: 'REMEDIAL_SUBMITTED' as const, label: 'Menunggu Tinjauan', value: data.value?.summary.remedialSubmitted ?? 0, icon: 'i-lucide-hourglass', tone: 'border-sky-300 bg-sky-50 text-sky-700' },
  { key: 'FAILED' as const, label: 'Tidak Lulus', value: data.value?.summary.failed ?? 0, icon: 'i-lucide-circle-x', tone: 'border-rose-300 bg-rose-50 text-rose-700' },
  { key: 'WITHDRAWN' as const, label: 'Tidak Melanjutkan', value: data.value?.summary.withdrawn ?? 0, icon: 'i-lucide-user-x', tone: 'border-slate-400 bg-slate-50 text-slate-600' },
])

const { page: tablePage, pageSize: tablePageSize, items: pagedItems, reset: resetTablePage } = useTablePagination(filteredItems)
watch([activeFilter, searchQuery], resetTablePage)

/* ---------------- Aksi per peserta ---------------- */
const actionModalOpen = ref(false)
const selectedItem = ref<Item | null>(null)

function openActions(item: Item) {
  selectedItem.value = item
  actionModalOpen.value = true
}

const isRemedial = (item: Item) => item.status.startsWith('REMEDIAL_')

const selectedActions = computed<TableAction[]>(() => {
  const item = selectedItem.value
  if (!item) return []

  const notReviewable = !item.remedial
    ? 'Peserta belum mengirim tugas remedial.'
    : item.status !== 'REMEDIAL_SUBMITTED' ? 'Tugas remedial sudah diputuskan.' : undefined

  return [
    {
      label: 'Lihat Tugas Remedial',
      description: 'Buka link Google Drive tugas remedial peserta.',
      icon: 'i-lucide-folder-open',
      to: item.remedial?.drive_link || undefined,
      newTab: true,
      disabledReason: item.remedial ? undefined : 'Peserta belum mengirim tugas remedial.',
    },
    {
      label: 'Nyatakan Lulus',
      description: 'Peserta dinyatakan lulus sertifikasi.',
      icon: 'i-lucide-circle-check',
      onSelect: () => askDecision(item, 'PASSED'),
      disabledReason: notReviewable,
    },
    {
      label: 'Nyatakan Tidak Lulus',
      description: 'Peserta dinyatakan tidak lulus sertifikasi.',
      icon: 'i-lucide-circle-x',
      tone: 'red',
      onSelect: () => askDecision(item, 'FAILED'),
      disabledReason: notReviewable,
    },
  ]
})

/* ---------------- Keputusan remedial ---------------- */
const decisionModalOpen = ref(false)
const decisionTarget = ref<{ item: Item, decision: RemedialDecision } | null>(null)
const processing = ref(false)

function askDecision(item: Item, decision: RemedialDecision) {
  decisionTarget.value = { item, decision }
  decisionModalOpen.value = true
}

async function submitDecision() {
  const target = decisionTarget.value
  if (!target) return
  processing.value = true

  try {
    const response = await $fetch<{ message: string }>(
      `${apiPath.value}/remedials/${encodeURIComponent(target.item.application_id)}`,
      { method: 'POST', credentials: 'include', body: { decision: target.decision } },
    )
    toast.add({ title: 'Keputusan tersimpan', description: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    decisionModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Keputusan gagal disimpan', description: getApiErrorMessage(error, 'Silakan coba lagi.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    processing.value = false
  }
}

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
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-blue-500 sm:text-2xl">
          {{ data?.period.period_name || 'Hasil Akhir' }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">Hasil Akhir</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton :to="props.backTo" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <UBadge v-if="data" :color="periodStatusColor(data.period.period_status)" variant="subtle">
          {{ PERIOD_STATUS_LABELS[data.period.period_status.toUpperCase()] || data.period.period_status }}
        </UBadge>
      </div>
    </div>

    <div v-if="loading && !data" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat hasil akhir...</span>
    </div>

    <UAlert v-else-if="errorMessage || !data" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage || 'Data belum dapat dimuat.'">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <template v-else>
      <!-- Jadwal tahap Pengumuman -->
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
        <span class="flex items-center gap-2 font-medium text-slate-800">
          <UIcon name="i-lucide-calendar-clock" class="size-4 text-primary" />
          Tahap Pengumuman
        </span>
        <span class="text-slate-600">Mulai: <span class="font-medium text-slate-800">{{ formatDateTimeId(data.stage.startAt) }}</span></span>
        <span class="text-slate-600">Batas Remedial: <span class="font-medium text-slate-800">{{ formatDateTimeId(data.stage.endAt) }}</span></span>
        <UBadge :color="data.stage.open ? 'success' : 'neutral'" variant="subtle" class="ml-auto">
          {{ data.stage.open ? 'Sedang Dibuka' : data.announced ? 'Sudah Berakhir' : 'Belum Dibuka' }}
        </UBadge>
      </div>

      <UAlert
        v-if="!data.decided"
        color="neutral"
        variant="subtle"
        icon="i-lucide-hourglass"
        title="Hasil asesmen periode ini belum ditetapkan"
      />
      <UAlert
        v-else-if="!data.announced"
        color="info"
        variant="subtle"
        icon="i-lucide-eye-off"
        title="Hasil belum tampil ke peserta sampai tahap Pengumuman dibuka"
      />

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
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-slate-900">Daftar Hasil Akhir</h2>
              <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" size="sm" :loading="loading" @click="load">
                Muat Ulang
              </UButton>
            </div>
            <div class="flex flex-col gap-3 rounded-lg border border-blue-300 bg-blue-50 p-3 sm:flex-row">
              <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Cari nama, NIP, atau instansi..." class="w-full" />
              <USelect v-model="activeFilter" :items="FILTERS" value-key="value" label-key="label" class="w-full sm:w-60" />
            </div>
          </div>
        </template>

        <div v-if="filteredItems.length === 0" class="py-8 text-center">
          <UIcon name="i-lucide-inbox" class="mx-auto size-9 text-slate-500" />
          <p class="mt-3 font-medium text-slate-700">
            {{ data.items.length === 0 ? 'Belum ada hasil akhir' : 'Tidak ada data yang sesuai' }}
          </p>
          <p class="mt-1 text-sm text-slate-600">
            {{ data.items.length === 0 ? 'Peserta muncul setelah hasil asesmen ditetapkan.' : 'Coba ubah filter atau kata pencarian.' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[880px] table-fixed text-left text-sm">
            <colgroup>
              <col />
              <col class="w-48" />
              <col />
              <col class="w-48" />
              <col class="w-24" />
            </colgroup>
            <thead>
              <tr class="border-b border-blue-100">
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Nama</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">NIP</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Instansi</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Status</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in pagedItems" :key="item.application_id" class="border-b border-slate-300 last:border-0">
                <td class="px-4 py-3">
                  <p class="truncate font-medium text-slate-800" :title="item.full_name">{{ item.full_name }}</p>
                </td>
                <td class="px-4 py-3 text-slate-600">
                  <p class="truncate" :title="item.nip">{{ item.nip }}</p>
                </td>
                <td class="px-4 py-3 text-slate-600">
                  <p class="line-clamp-2" :title="item.institution_name">{{ item.institution_name }}</p>
                </td>
                <td class="px-4 py-3 text-center">
                  <UBadge :color="FINAL_STATUS_COLORS[item.status]" variant="subtle">{{ FINAL_STATUS_LABELS[item.status] }}</UBadge>
                </td>
                <td class="px-4 py-3 text-center">
                  <UButton
                    v-if="isRemedial(item)"
                    icon="i-lucide-settings-2"
                    color="primary"
                    variant="solid"
                    square
                    size="md"
                    aria-label="Pilihan aksi"
                    title="Pilihan aksi"
                    @click="openActions(item)"
                  />
                  <span v-else class="text-slate-400">—</span>
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

    <!-- Pilihan aksi peserta remedial -->
    <TableActionModal
      v-model:open="actionModalOpen"
      title="Pilihan Aksi"
      :description="selectedItem?.full_name"
      :actions="selectedActions"
    >
      <template v-if="selectedItem" #summary>
        <p class="font-semibold text-slate-900">{{ selectedItem.full_name }}</p>
        <p class="mt-1 text-sm text-slate-600">{{ selectedItem.nip }} · {{ selectedItem.institution_name }}</p>
        <div class="mt-3">
          <UBadge :color="FINAL_STATUS_COLORS[selectedItem.status]" variant="subtle">{{ FINAL_STATUS_LABELS[selectedItem.status] }}</UBadge>
        </div>
        <div v-if="selectedItem.remedial" class="mt-3 space-y-1 text-xs text-slate-600">
          <p>Dikirim: {{ formatDateTimeId(selectedItem.remedial.updated_at || selectedItem.remedial.submitted_at) }}</p>
          <p v-if="selectedItem.remedial.note" class="whitespace-pre-line">Catatan: {{ selectedItem.remedial.note }}</p>
          <p v-if="selectedItem.remedial.decided_at">
            Diputuskan: {{ formatDateTimeId(selectedItem.remedial.decided_at) }}{{ selectedItem.remedial.decided_by_name ? ` oleh ${selectedItem.remedial.decided_by_name}` : '' }}
          </p>
        </div>
      </template>
    </TableActionModal>

    <!-- Konfirmasi keputusan remedial -->
    <UModal
      v-model:open="decisionModalOpen"
      :dismissible="!processing"
      :title="decisionTarget?.decision === 'PASSED' ? 'Nyatakan Lulus?' : 'Nyatakan Tidak Lulus?'"
      :description="decisionTarget?.item.full_name"
    >
      <template #body>
        <p class="text-sm text-slate-600">
          Keputusan langsung tampil di halaman Pengumuman peserta dan <span class="font-medium text-slate-800">tidak dapat dibatalkan</span>.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" :disabled="processing" @click="decisionModalOpen = false">Batal</UButton>
          <UButton
            :color="decisionTarget?.decision === 'PASSED' ? 'success' : 'error'"
            :icon="decisionTarget?.decision === 'PASSED' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
            :loading="processing"
            @click="submitDecision"
          >
            {{ decisionTarget?.decision === 'PASSED' ? 'Lulus' : 'Tidak Lulus' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
