<script setup lang="ts">
/**
 * Penetapan Hasil Asesmen satu periode (Super Admin) — docs/08 K-21.
 * Rekap per peserta: nilai tes tertulis, rekomendasi Asesor Teknis & Asesor Kepublikan, dan hasil
 * otomatis (Lulus / Remedial). Tidak ada fitur mengubah hasil; hanya Tetapkan / Batalkan Penetapan.
 */
import {
  ASSESSMENT_OUTCOME_LABELS,
  REMEDIAL_REASON_LABELS,
  type AssessmentOutcome,
  type RemedialReason,
} from '~~/shared/utils/assessment-result'

definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Penetapan Hasil Asesmen' })

type Recommendation = 'CONTINUE' | 'NOT_CONTINUE' | ''

type Item = {
  application_id: string
  full_name: string
  nip: string
  institution_name: string
  written: { status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED', attempt_id: string, score: number | null, passing_grade: number, passed: boolean | null }
  technical: { status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED', recommendation: Recommendation }
  public: { status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'NOT_REQUIRED' | 'WAITING', recommendation: Recommendation }
  complete: boolean
  missing: string[]
  outcome: AssessmentOutcome | null
  reasons: RemedialReason[]
  is_decided: boolean
}

type ResultData = {
  period: { period_id: string, period_name: string, period_status: string }
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  decision: { decided: boolean, decided_at: string, decided_by_name: string, canDecide: boolean, canCancel: boolean }
  summary: { total: number, incomplete: number, passed: number, remedial: number }
  items: Item[]
}

const route = useRoute()
const toast = useToast()
const periodId = computed(() => String(route.params.periodId || ''))
const apiPath = computed(() => `/api/assessment-results/${encodeURIComponent(periodId.value)}`)

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
    errorMessage.value = getApiErrorMessage(error, 'Data penetapan hasil asesmen belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------------- Filter & pencarian ---------------- */
const FILTERS = [
  { value: 'ALL', label: 'Semua Peserta' },
  { value: 'INCOMPLETE', label: 'Belum Lengkap' },
  { value: 'PASSED', label: 'Lulus' },
  { value: 'REMEDIAL', label: 'Remedial' },
]

const activeFilter = ref('ALL')
const searchQuery = ref('')

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return (data.value?.items ?? []).filter((item) => {
    const matchesFilter =
      activeFilter.value === 'ALL'
      || (activeFilter.value === 'INCOMPLETE' && !item.complete)
      || item.outcome === activeFilter.value
    const matchesQuery = !query || [item.full_name, item.nip, item.institution_name].some((value) => value.toLowerCase().includes(query))
    return matchesFilter && matchesQuery
  })
})

const summaryCards = computed(() => [
  { key: 'ALL', label: 'Peserta', value: data.value?.summary.total ?? 0, icon: 'i-lucide-users', tone: 'border-blue-300 bg-blue-50 text-blue-700' },
  { key: 'INCOMPLETE', label: 'Belum Lengkap', value: data.value?.summary.incomplete ?? 0, icon: 'i-lucide-clock', tone: 'border-slate-400 bg-slate-50 text-slate-600' },
  { key: 'PASSED', label: 'Lulus', value: data.value?.summary.passed ?? 0, icon: 'i-lucide-award', tone: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { key: 'REMEDIAL', label: 'Remedial', value: data.value?.summary.remedial ?? 0, icon: 'i-lucide-rotate-ccw', tone: 'border-amber-300 bg-amber-50 text-amber-700' },
])

const { page: tablePage, pageSize: tablePageSize, items: pagedItems, reset: resetTablePage } = useTablePagination(filteredItems)
watch([activeFilter, searchQuery], resetTablePage)

/* ---------------- Tampilan sel ---------------- */
const RECOMMENDATION_TEXT: Record<'CONTINUE' | 'NOT_CONTINUE', string> = {
  CONTINUE: 'Dapat dilanjutkan',
  NOT_CONTINUE: 'Tidak dapat dilanjutkan',
}

function writtenDetailPath(item: Item) {
  return item.written.attempt_id ? `/super-admin/evaluations/attempts/${item.written.attempt_id}` : ''
}

const technicalDetailPath = (item: Item) => `/super-admin/technical-assessments/${periodId.value}/${item.application_id}`
const publicDetailPath = (item: Item) => `/super-admin/public-assessments/${periodId.value}/${item.application_id}`

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

/** Alasan tombol Tetapkan tidak aktif. */
const decideBlocker = computed(() => {
  const value = data.value
  if (!value) return ''
  if (!value.stage.open) return value.stage.message || 'Tahap Penetapan Hasil Asesmen sedang tidak dibuka.'
  if (value.summary.total === 0) return 'Belum ada peserta pada periode ini.'
  if (value.summary.incomplete > 0) return `Masih ada ${value.summary.incomplete} peserta yang hasil penilaiannya belum lengkap.`
  return ''
})

/* ---------------- Tetapkan / Batalkan ---------------- */
const decideModalOpen = ref(false)
const cancelModalOpen = ref(false)
const processing = ref(false)

async function decide() {
  processing.value = true
  try {
    const response = await $fetch<{ message: string }>(`${apiPath.value}/decide`, { method: 'POST', credentials: 'include' })
    toast.add({ title: 'Hasil asesmen ditetapkan', description: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    decideModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Penetapan gagal', description: getApiErrorMessage(error, 'Silakan coba lagi.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    processing.value = false
  }
}

async function cancelDecision() {
  processing.value = true
  try {
    const response = await $fetch<{ message: string }>(`${apiPath.value}/cancel`, { method: 'POST', credentials: 'include' })
    toast.add({ title: 'Penetapan dibatalkan', description: response.message, color: 'warning', icon: 'i-lucide-undo-2' })
    cancelModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Pembatalan gagal', description: getApiErrorMessage(error, 'Silakan coba lagi.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header: judul kiri; Kembali + status periode kanan -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-blue-500 sm:text-2xl">
          {{ data?.period.period_name || 'Penetapan Hasil Asesmen' }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">Penetapan Hasil Asesmen</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton to="/super-admin/assessment-results" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <UBadge v-if="data" :color="periodStatusColor(data.period.period_status)" variant="subtle">
          {{ PERIOD_STATUS_LABELS[data.period.period_status.toUpperCase()] || data.period.period_status }}
        </UBadge>
      </div>
    </div>

    <div v-if="loading && !data" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat rekap hasil asesmen...</span>
    </div>

    <UAlert v-else-if="errorMessage || !data" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage || 'Data belum dapat dimuat.'">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <template v-else>
      <!-- Jadwal tahap -->
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
        <span class="flex items-center gap-2 font-medium text-slate-800">
          <UIcon name="i-lucide-calendar-clock" class="size-4 text-primary" />
          Tahap Penetapan Hasil Asesmen
        </span>
        <span class="text-slate-600">Mulai: <span class="font-medium text-slate-800">{{ formatDateTimeId(data.stage.startAt) }}</span></span>
        <span class="text-slate-600">Selesai: <span class="font-medium text-slate-800">{{ formatDateTimeId(data.stage.endAt) }}</span></span>
        <UBadge :color="data.stage.open ? 'success' : 'neutral'" variant="subtle" class="ml-auto">
          {{ data.stage.open ? 'Sedang Dibuka' : 'Tidak Dibuka' }}
        </UBadge>
      </div>

      <!-- Status penetapan -->
      <UAlert
        v-if="data.decision.decided"
        color="success"
        variant="subtle"
        icon="i-lucide-badge-check"
        title="Hasil asesmen telah ditetapkan"
        :description="`Ditetapkan pada ${formatDateTimeId(data.decision.decided_at)}${data.decision.decided_by_name ? ` oleh ${data.decision.decided_by_name}` : ''}. Hasil akan disampaikan kepada peserta pada tahap Pengumuman. Buka kunci penilaian asesor dan reset tes tertulis dinonaktifkan selama hasil masih ditetapkan.`"
      />

      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
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
              <div>
                <h2 class="font-semibold text-slate-900">Rekap Hasil Penilaian</h2>
                <p class="mt-1 text-sm text-slate-600">
                  Lulus bila nilai tes tertulis memenuhi passing grade dan kedua asesor merekomendasikan
                  "dapat dilanjutkan". Selain itu peserta diarahkan ke Remedial.
                </p>
              </div>
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
            {{ data.items.length === 0 ? 'Belum ada peserta' : 'Tidak ada data yang sesuai' }}
          </p>
          <p class="mt-1 text-sm text-slate-600">
            {{ data.items.length === 0 ? 'Peserta muncul setelah self assessment-nya terverifikasi.' : 'Coba ubah filter atau kata pencarian.' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[1000px] table-fixed text-left text-sm">
            <colgroup>
              <col class="w-[20%]" />
              <col class="w-[18%]" />
              <col class="w-[14%]" />
              <col class="w-[15%]" />
              <col class="w-[15%]" />
              <col class="w-[18%]" />
            </colgroup>
            <thead>
              <tr class="border-b border-blue-100">
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Peserta</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Instansi</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Tes Tertulis</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Asesor Teknis</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Asesor Kepublikan</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Hasil</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in pagedItems" :key="item.application_id" class="border-b border-slate-300 align-top last:border-0">
                <td class="px-4 py-3">
                  <p class="truncate font-medium text-slate-800" :title="item.full_name">{{ item.full_name }}</p>
                  <p class="truncate text-xs text-slate-600">{{ item.nip }}</p>
                </td>
                <td class="px-4 py-3 text-slate-600">
                  <p class="line-clamp-2" :title="item.institution_name">{{ item.institution_name }}</p>
                </td>

                <!-- Tes tertulis -->
                <td class="px-4 py-3 text-center">
                  <template v-if="item.written.status === 'SUBMITTED'">
                    <p class="text-base font-semibold" :class="item.written.passed ? 'text-emerald-700' : 'text-rose-700'">
                      {{ item.written.score }}
                    </p>
                    <p class="text-xs text-slate-600">PG {{ item.written.passing_grade }}</p>
                  </template>
                  <p v-else class="text-xs text-slate-500">{{ item.written.status === 'IN_PROGRESS' ? 'Sedang dikerjakan' : 'Belum mengerjakan' }}</p>
                  <UButton
                    v-if="writtenDetailPath(item)"
                    :to="writtenDetailPath(item)"
                    target="_blank"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-eye"
                    class="mt-1.5"
                    aria-label="Lihat detail tes tertulis"
                  >
                    Detail
                  </UButton>
                </td>

                <!-- Asesor Teknis -->
                <td class="px-4 py-3 text-center text-xs">
                  <p
                    v-if="item.technical.status === 'SUBMITTED' && item.technical.recommendation"
                    class="font-medium"
                    :class="item.technical.recommendation === 'CONTINUE' ? 'text-emerald-700' : 'text-rose-700'"
                  >
                    {{ RECOMMENDATION_TEXT[item.technical.recommendation] }}
                  </p>
                  <p v-else class="text-slate-500">{{ item.technical.status === 'DRAFT' ? 'Draf (belum dikirim)' : 'Belum dinilai' }}</p>
                  <UButton
                    :to="technicalDetailPath(item)"
                    target="_blank"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-eye"
                    class="mt-1.5"
                    aria-label="Lihat detail penilaian Asesor Teknis"
                  >
                    Detail
                  </UButton>
                </td>

                <!-- Asesor Kepublikan -->
                <td class="px-4 py-3 text-center text-xs">
                  <p
                    v-if="item.public.status === 'SUBMITTED' && item.public.recommendation"
                    class="font-medium"
                    :class="item.public.recommendation === 'CONTINUE' ? 'text-emerald-700' : 'text-rose-700'"
                  >
                    {{ RECOMMENDATION_TEXT[item.public.recommendation] }}
                  </p>
                  <p v-else-if="item.public.status === 'NOT_REQUIRED'" class="text-slate-500">Tidak dinilai (Asesor Teknis tidak melanjutkan)</p>
                  <p v-else-if="item.public.status === 'WAITING'" class="text-slate-500">Menunggu Asesor Teknis</p>
                  <p v-else class="text-slate-500">{{ item.public.status === 'DRAFT' ? 'Draf (belum dikirim)' : 'Belum dinilai' }}</p>
                  <UButton
                    v-if="item.public.status !== 'NOT_REQUIRED' && item.public.status !== 'WAITING'"
                    :to="publicDetailPath(item)"
                    target="_blank"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-eye"
                    class="mt-1.5"
                    aria-label="Lihat detail penilaian Asesor Kepublikan"
                  >
                    Detail
                  </UButton>
                </td>

                <!-- Hasil -->
                <td class="px-4 py-3 text-center">
                  <template v-if="item.outcome">
                    <UBadge :color="item.outcome === 'PASSED' ? 'success' : 'warning'" variant="subtle">
                      {{ ASSESSMENT_OUTCOME_LABELS[item.outcome] }}
                    </UBadge>
                    <ul v-if="item.reasons.length" class="mt-1.5 space-y-0.5 text-left text-xs text-amber-800">
                      <li v-for="reason in item.reasons" :key="reason">• {{ REMEDIAL_REASON_LABELS[reason] }}</li>
                    </ul>
                    <p v-if="!item.is_decided && !data.decision.decided" class="mt-1 text-xs text-slate-500">Belum ditetapkan</p>
                  </template>
                  <template v-else>
                    <UBadge color="neutral" variant="subtle">Belum Lengkap</UBadge>
                    <p class="mt-1.5 text-xs text-slate-600">Menunggu: {{ item.missing.join(', ') }}</p>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <TablePagination v-model:page="tablePage" v-model:page-size="tablePageSize" :total="filteredItems.length" label="peserta" />
        </template>
      </UCard>

      <!-- Aksi penetapan -->
      <div class="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm">
          <template v-if="data.decision.decided">
            <p class="font-medium text-slate-800">Hasil periode ini sudah ditetapkan.</p>
            <p class="mt-0.5 text-slate-600">
              {{ data.decision.canCancel ? 'Penetapan dapat dibatalkan selama tahap masih dibuka, mis. bila ada penilaian yang perlu diperbaiki.' : 'Penetapan tidak dapat dibatalkan karena tahap sedang tidak dibuka.' }}
            </p>
          </template>
          <template v-else>
            <p class="font-medium text-slate-800">Tetapkan hasil seluruh peserta</p>
            <p class="mt-0.5" :class="decideBlocker ? 'text-amber-700' : 'text-slate-600'">
              {{ decideBlocker || `${data.summary.passed} peserta lulus dan ${data.summary.remedial} peserta remedial akan ditetapkan sekaligus.` }}
            </p>
          </template>
        </div>

        <UButton
          v-if="data.decision.decided"
          color="error"
          variant="outline"
          icon="i-lucide-undo-2"
          :disabled="!data.decision.canCancel"
          @click="cancelModalOpen = true"
        >
          Batalkan Penetapan
        </UButton>
        <UButton
          v-else
          icon="i-lucide-gavel"
          :disabled="!data.decision.canDecide"
          @click="decideModalOpen = true"
        >
          Tetapkan Keputusan
        </UButton>
      </div>
    </template>

    <!-- Konfirmasi tetapkan -->
    <UModal
      v-model:open="decideModalOpen"
      :dismissible="!processing"
      title="Tetapkan Hasil Asesmen?"
      description="Hasil ditetapkan sekaligus untuk seluruh peserta periode ini."
    >
      <template #body>
        <div v-if="data" class="space-y-3 text-sm">
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
              <p class="text-emerald-800">Lulus</p>
              <p class="text-xl font-semibold text-emerald-700">{{ data.summary.passed }}</p>
            </div>
            <div class="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p class="text-amber-800">Remedial</p>
              <p class="text-xl font-semibold text-amber-700">{{ data.summary.remedial }}</p>
            </div>
          </div>
          <p class="text-slate-600">
            Hasil disampaikan kepada peserta pada tahap Pengumuman. Setelah ditetapkan, buka kunci penilaian
            asesor dan reset tes tertulis tidak dapat dilakukan kecuali penetapan dibatalkan.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" :disabled="processing" @click="decideModalOpen = false">Batal</UButton>
          <UButton icon="i-lucide-gavel" :loading="processing" @click="decide">Tetapkan</UButton>
        </div>
      </template>
    </UModal>

    <!-- Konfirmasi batalkan -->
    <UModal
      v-model:open="cancelModalOpen"
      :dismissible="!processing"
      title="Batalkan Penetapan?"
      description="Hasil kembali berstatus belum ditetapkan dan dapat ditetapkan ulang."
    >
      <template #body>
        <p class="text-sm text-slate-600">
          Riwayat penetapan tetap tersimpan. Gunakan ini bila ada penilaian yang perlu diperbaiki
          (buka kunci penilaian asesor atau reset tes tertulis), lalu tetapkan kembali.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" :disabled="processing" @click="cancelModalOpen = false">Kembali</UButton>
          <UButton color="error" icon="i-lucide-undo-2" :loading="processing" @click="cancelDecision">Batalkan Penetapan</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
