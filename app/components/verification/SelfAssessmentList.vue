<script setup lang="ts">
/**
 * Daftar self assessment peserta dalam satu periode (Verifikator & Super Admin).
 * Contoh:
 *   <VerificationSelfAssessmentList
 *     period-id="PER-000001"
 *     base-path="/verifikator/self-assessments/PER-000001"
 *     back-path="/verifikator/self-assessments"
 *   />
 */
const props = defineProps<{
  periodId: string
  /** Path daftar ini; detail dibuka di `${basePath}/${applicationId}`. */
  basePath: string
  /** Halaman pilihan periode. */
  backPath: string
}>()

type Item = {
  application_id: string
  full_name: string
  nip: string
  institution_name: string
  status: string
  submitted_at: string
  revision_count: number
}

type ListResponse = {
  period: { period_id: string, period_name: string, period_status: string }
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  summary: { submitted: number, revision: number, verified: number, notSubmitted: number }
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
      `/api/self-assessment-verifications/by-period/${encodeURIComponent(props.periodId)}`,
      { credentials: 'include' },
    )

    data.value = response.data
  } catch (error: unknown) {
    const errorData = (error as { data?: { statusMessage?: string } }).data
    errorMessage.value = errorData?.statusMessage || 'Data self assessment belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* Filter & pencarian */
const FILTERS = [
  { value: 'SUBMITTED', label: 'Menunggu Verifikasi' },
  { value: 'REVISION_REQUESTED', label: 'Perlu Perbaikan' },
  { value: 'VERIFIED', label: 'Terverifikasi' },
  { value: 'NOT_SUBMITTED', label: 'Belum Dikirim' },
  { value: 'ALL', label: 'Semua Status' },
]

const activeFilter = ref('ALL')
const searchQuery = ref('')

const isSubmitted = (status: string) => !['NEW', 'DRAFT'].includes(status)

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return (data.value?.items ?? []).filter((item) => {
    const matchesFilter =
      activeFilter.value === 'ALL' ||
      (activeFilter.value === 'NOT_SUBMITTED' && !isSubmitted(item.status)) ||
      item.status === activeFilter.value

    const matchesQuery =
      !query ||
      [item.full_name, item.nip, item.institution_name].some((value) =>
        value.toLowerCase().includes(query),
      )

    return matchesFilter && matchesQuery
  })
})

const summaryCards = computed(() => [
  { key: 'SUBMITTED', label: 'Menunggu Verifikasi', value: data.value?.summary.submitted ?? 0, icon: 'i-lucide-inbox', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { key: 'REVISION_REQUESTED', label: 'Perlu Perbaikan', value: data.value?.summary.revision ?? 0, icon: 'i-lucide-pencil-line', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'VERIFIED', label: 'Terverifikasi', value: data.value?.summary.verified ?? 0, icon: 'i-lucide-circle-check', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'NOT_SUBMITTED', label: 'Belum Dikirim', value: data.value?.summary.notSubmitted ?? 0, icon: 'i-lucide-clock', tone: 'border-slate-200 bg-slate-50 text-slate-600' },
])

const PERIOD_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  CLOSED: 'Ditutup',
  COMPLETED: 'Selesai',
}

function periodStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'success' as const
    case 'CLOSED': return 'error' as const
    case 'COMPLETED': return 'primary' as const
    case 'DRAFT': return 'warning' as const
    default: return 'neutral' as const
  }
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header: judul kiri; Kembali + status periode kanan -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-slate-900 sm:text-2xl">
          {{ data?.period.period_name || 'Verifikasi Self Assessment' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          Verifikasi Self Assessment · ID Periode:
          <span class="font-medium text-slate-700">{{ periodId }}</span>
        </p>
      </div>

      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton
          :to="backPath"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
          size="sm"
        >
          Kembali
        </UButton>
        <UBadge
          v-if="data"
          :color="periodStatusColor(data.period.period_status)"
          variant="subtle"
        >
          {{ PERIOD_STATUS_LABELS[data.period.period_status.toUpperCase()] || data.period.period_status }}
        </UBadge>
      </div>
    </div>

    <div v-if="loading && !data" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-500">Memuat data self assessment...</span>
    </div>

    <UAlert
      v-else-if="errorMessage || !data"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="errorMessage || 'Data self assessment belum dapat dimuat.'"
    />

    <template v-else>
      <UAlert
        v-if="!data.stage.open"
        color="warning"
        variant="subtle"
        icon="i-lucide-calendar-clock"
        title="Tahap Verifikasi Self Assessment tidak sedang dibuka"
        :description="`${data.stage.message} Data tetap dapat dilihat, namun keputusan verifikasi hanya dapat diberikan pada saat tahap tersebut dibuka.`"
      />

      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Ringkasan Self Assessment</h2>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button
            v-for="card in summaryCards"
            :key="card.key"
            type="button"
            class="rounded-xl border p-3 text-left transition hover:shadow-sm sm:p-3.5"
            :class="[card.tone, activeFilter === card.key ? 'ring-2 ring-primary/40' : '']"
            @click="activeFilter = activeFilter === card.key ? 'ALL' : card.key"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium">{{ card.label }}</span>
              <UIcon :name="card.icon" class="size-5 opacity-75" />
            </div>
            <p class="mt-1.5 text-2xl font-semibold">{{ card.value }}</p>
          </button>
        </div>
      </section>

      <UCard>
        <template #header>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="font-semibold text-slate-900">Daftar Self Assessment Peserta</h2>
                <p class="mt-1 text-sm text-slate-500">
                  Peserta yang pendaftarannya telah diterima pada periode {{ periodId }}.
                </p>
              </div>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                size="sm"
                :loading="loading"
                class="self-start"
                @click="load"
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
                :items="FILTERS"
                value-key="value"
                label-key="label"
                class="w-full sm:w-56"
              />
            </div>
          </div>
        </template>

        <div v-if="filteredItems.length === 0" class="py-8 text-center">
          <UIcon name="i-lucide-inbox" class="mx-auto size-9 text-slate-400" />
          <p class="mt-3 font-medium text-slate-700">Tidak ada data yang sesuai</p>
          <p class="mt-1 text-sm text-slate-500">Coba ubah filter status atau kata pencarian.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr class="border-b border-blue-100">
                <th class="px-4 py-3 font-semibold text-blue-600">Peserta</th>
                <th class="px-4 py-3 font-semibold text-blue-600">NIP</th>
                <th class="px-4 py-3 font-semibold text-blue-600">Instansi</th>
                <th class="px-4 py-3 font-semibold text-blue-600">Tanggal Dikirim</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Status</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredItems"
                :key="item.application_id"
                class="border-b border-slate-100 last:border-0"
              >
                <td class="px-4 py-4 font-medium text-slate-800">{{ item.full_name }}</td>
                <td class="px-4 py-4 text-slate-600">{{ item.nip }}</td>
                <td class="px-4 py-4 text-slate-600">{{ item.institution_name }}</td>
                <td class="px-4 py-4 text-slate-600">
                  {{ isSubmitted(item.status) ? formatDateTime(item.submitted_at) : '-' }}
                  <span v-if="item.revision_count > 0" class="block text-xs text-slate-400">
                    Perbaikan ke-{{ item.revision_count }}
                  </span>
                </td>
                <td class="px-4 py-4 text-center">
                  <CertificationSelfAssessmentStatusBadge
                    :status="item.status"
                    class="inline-flex min-w-32 justify-center"
                  />
                </td>
                <td class="px-4 py-4 text-center">
                  <UButton
                    v-if="item.status === 'SUBMITTED'"
                    :to="`${basePath}/${item.application_id}`"
                    color="primary"
                    variant="solid"
                    size="sm"
                    class="inline-flex w-32 justify-center"
                  >
                    Verifikasi
                  </UButton>
                  <UButton
                    v-else-if="isSubmitted(item.status)"
                    :to="`${basePath}/${item.application_id}`"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="inline-flex w-32 justify-center"
                  >
                    Lihat
                  </UButton>
                  <UButton
                    v-else
                    color="neutral"
                    variant="outline"
                    size="sm"
                    disabled
                    class="inline-flex w-32 justify-center"
                  >
                    Belum Dikirim
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <p class="text-sm text-slate-500">
            Menampilkan {{ filteredItems.length }} dari {{ data.items.length }} peserta.
          </p>
        </template>
      </UCard>
    </template>
  </div>
</template>
