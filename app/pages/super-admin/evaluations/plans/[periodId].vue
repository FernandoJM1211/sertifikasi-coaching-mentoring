<script setup lang="ts">
import { EVALUATION_DURATION_OPTIONS } from '~~/shared/utils/evaluation'
import type { TableAction } from '~/utils/table-action'

/**
 * Perencanaan tes tertulis satu periode (Super Admin): paket soal, jumlah soal, durasi,
 * passing grade, pengaturan acak, serta nilai peserta (hanya dapat dilihat Super Admin).
 * "Simpan & Terapkan" membuat snapshot soal; peserta berikutnya memakai snapshot terbaru.
 */
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Perencanaan Tes Tertulis' })

type PlanItem = {
  application_id: string
  attempt_id: string
  full_name: string
  nip: string
  institution_name: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED'
  submit_type: string
  config_version: number | null
  passing_grade: number | null
  work_seconds: number | null
  score: number | null
  passed: boolean | null
}

type PlanResponse = {
  period: { period_id: string, period_name: string, period_status: string }
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  config: { package_id: string, question_count: number, duration_minutes: number, passing_grade: number, shuffle_questions: boolean, shuffle_options: boolean, applied_at: string, config_version: number, updated_at: string } | null
  apply_state: 'NOT_APPLIED' | 'OUTDATED' | 'CURRENT'
  started_count: number
  packages: { package_id: string, package_name: string, status: string, active_question_count: number }[]
  summary: { eligible: number, notStarted: number, inProgress: number, submitted: number, passed: number, failed: number }
  items: PlanItem[]
}

const route = useRoute()
const toast = useToast()
const periodId = computed(() => String(route.params.periodId || ''))
const BACK_PATH = '/super-admin/evaluations/plans'

const loading = ref(true)
const errorMessage = ref('')
const data = ref<PlanResponse | null>(null)

const form = reactive({
  packageId: '',
  questionCount: 20 as number | undefined,
  durationMinutes: 60,
  passingGrade: 70 as number | undefined,
  shuffleQuestions: true,
  shuffleOptions: true,
})

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: PlanResponse }>(
      `/api/evaluation/periods/${encodeURIComponent(periodId.value)}`,
      { credentials: 'include' },
    )
    data.value = response.data

    const config = response.data.config
    if (config) {
      form.packageId = config.package_id
      form.questionCount = config.question_count
      form.durationMinutes = config.duration_minutes
      form.passingGrade = config.passing_grade
      form.shuffleQuestions = config.shuffle_questions
      form.shuffleOptions = config.shuffle_options
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Data tes tertulis periode belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------------- Pengaturan ---------------- */
const packageItems = computed(() =>
  (data.value?.packages ?? []).map((item) => ({
    value: item.package_id,
    label: `${item.package_name} (${item.active_question_count} soal)${item.status === 'ACTIVE' ? '' : ' · diarsipkan'}`,
  })),
)

const durationItems = EVALUATION_DURATION_OPTIONS.map((value) => ({ value: value as number, label: `${value} menit` }))

const selectedPackage = computed(() => data.value?.packages.find((item) => item.package_id === form.packageId))
const maxQuestions = computed(() => selectedPackage.value?.active_question_count ?? 0)

const formError = computed(() => {
  if (!form.packageId) return 'Pilih paket soal.'
  if (!Number.isInteger(form.questionCount) || (form.questionCount ?? 0) < 1) return 'Jumlah soal minimal 1.'
  if ((form.questionCount ?? 0) > maxQuestions.value) return `Jumlah soal maksimal ${maxQuestions.value} (soal aktif pada paket).`
  if (!Number.isInteger(form.passingGrade) || (form.passingGrade ?? -1) < 0 || (form.passingGrade ?? 101) > 100) return 'Passing grade harus 0–100.'
  return ''
})

/** Peringatan bila soal aktif paket berkurang (mis. ada soal diarsipkan) setelah disimpan. */
const configShortage = computed(() => {
  const config = data.value?.config
  if (!config) return 0
  const pack = data.value?.packages.find((item) => item.package_id === config.package_id)
  return Math.max(0, config.question_count - (pack?.active_question_count ?? 0))
})

const isDirty = computed(() => {
  const config = data.value?.config
  if (!config) return true
  return (
    config.package_id !== form.packageId ||
    config.question_count !== form.questionCount ||
    config.duration_minutes !== form.durationMinutes ||
    config.passing_grade !== form.passingGrade ||
    config.shuffle_questions !== form.shuffleQuestions ||
    config.shuffle_options !== form.shuffleOptions
  )
})

/** Tombol aktif bila form berubah atau snapshot perlu diterapkan (ulang). */
const canApply = computed(() => isDirty.value || data.value?.apply_state !== 'CURRENT')

const saving = ref(false)
const applyModalOpen = ref(false)

/** Konfirmasi dulu bila sudah ada peserta yang mulai mengerjakan. */
function requestSave() {
  if (formError.value) return
  if ((data.value?.started_count ?? 0) > 0) applyModalOpen.value = true
  else save()
}

async function save() {
  if (formError.value) return
  saving.value = true

  try {
    const response = await $fetch<{ message: string }>(`/api/evaluation/periods/${encodeURIComponent(periodId.value)}`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        packageId: form.packageId,
        questionCount: form.questionCount,
        durationMinutes: form.durationMinutes,
        passingGrade: form.passingGrade,
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
      },
    })
    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    applyModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Gagal menyimpan pengaturan', description: getApiErrorMessage(error, 'Terjadi kesalahan. Silakan coba lagi.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    saving.value = false
  }
}

/* ---------------- Hasil ---------------- */
const STATUS_BADGES = {
  NOT_STARTED: { label: 'Belum Mulai', color: 'neutral' },
  IN_PROGRESS: { label: 'Mengerjakan', color: 'warning' },
  // Ungu, sama dengan card ringkasan "Selesai".
  SUBMITTED: { label: 'Selesai', color: 'secondary' },
} as const

const FILTERS = [
  { value: 'ALL', label: 'Semua Peserta' },
  { value: 'NOT_STARTED', label: 'Belum Mulai' },
  { value: 'IN_PROGRESS', label: 'Sedang Mengerjakan' },
  { value: 'SUBMITTED', label: 'Selesai' },
  { value: 'PASSED', label: 'Mencapai Passing Grade' },
  { value: 'FAILED', label: 'Di Bawah Passing Grade' },
]

const activeFilter = ref('ALL')
const searchQuery = ref('')

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return (data.value?.items ?? []).filter((item) => {
    const matchesFilter =
      activeFilter.value === 'ALL' ||
      item.status === activeFilter.value ||
      (activeFilter.value === 'PASSED' && item.passed === true) ||
      (activeFilter.value === 'FAILED' && item.passed === false)
    const matchesQuery = !query || [item.full_name, item.nip, item.institution_name].some((value) => value.toLowerCase().includes(query))

    return matchesFilter && matchesQuery
  })
})

const summaryCards = computed(() => [
  { key: 'ALL', label: 'Peserta Berhak', value: data.value?.summary.eligible ?? 0, icon: 'i-lucide-users', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { key: 'NOT_STARTED', label: 'Belum Mulai', value: data.value?.summary.notStarted ?? 0, icon: 'i-lucide-clock', tone: 'border-slate-300 bg-slate-50 text-slate-600' },
  { key: 'IN_PROGRESS', label: 'Mengerjakan', value: data.value?.summary.inProgress ?? 0, icon: 'i-lucide-pencil-line', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'SUBMITTED', label: 'Selesai', value: data.value?.summary.submitted ?? 0, icon: 'i-lucide-circle-check', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
  { key: 'PASSED', label: 'Mencapai PG', value: data.value?.summary.passed ?? 0, icon: 'i-lucide-trophy', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'FAILED', label: 'Di Bawah PG', value: data.value?.summary.failed ?? 0, icon: 'i-lucide-circle-x', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
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

const formatScore = (value: number) => value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Lama mengerjakan dalam menit (dibulatkan); di bawah 1 menit ditulis "< 1". */
function formatWorkMinutes(seconds: number | null) {
  if (seconds === null) return '-'
  return seconds < 60 ? '< 1 menit' : `${Math.round(seconds / 60)} menit`
}

/* ---------------- Pilihan aksi per peserta ---------------- */
const actionModalOpen = ref(false)
const actionTarget = ref<PlanItem | null>(null)

function openActions(item: PlanItem) {
  actionTarget.value = item
  actionModalOpen.value = true
}

const targetActions = computed<TableAction[]>(() => {
  const item = actionTarget.value
  if (!item) return []
  return [
    {
      label: 'Lihat Hasil Tes Tertulis',
      description: 'Jawaban, kunci, dan nilai peserta.',
      icon: 'i-lucide-eye',
      to: `/super-admin/evaluations/attempts/${item.attempt_id}`,
    },
    {
      label: 'Reset Progres',
      description: 'Hapus progres agar peserta dapat mengerjakan ulang dari awal.',
      icon: 'i-lucide-rotate-ccw',
      tone: 'red',
      onSelect: () => askReset(item),
    },
  ]
})

/* ---------------- Reset progres peserta ---------------- */
const resetTarget = ref<PlanItem | null>(null)
const resetModalOpen = ref(false)
const resetting = ref(false)

function askReset(item: PlanItem) {
  resetTarget.value = item
  resetModalOpen.value = true
}

async function confirmReset() {
  const target = resetTarget.value
  if (!target?.attempt_id) return
  resetting.value = true

  try {
    const response = await $fetch<{ message: string }>(
      `/api/evaluation/attempts/${encodeURIComponent(target.attempt_id)}/reset`,
      { method: 'POST', credentials: 'include' },
    )
    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    resetModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Gagal mereset progres', description: getApiErrorMessage(error, 'Terjadi kesalahan.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    resetting.value = false
  }
}

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
          {{ data?.period.period_name || 'Perencanaan Tes Tertulis' }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">Perencanaan Tes Tertulis</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton :to="BACK_PATH" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <UBadge v-if="data" :color="periodStatusColor(data.period.period_status)" variant="subtle">
          {{ PERIOD_STATUS_LABELS[data.period.period_status.toUpperCase()] || data.period.period_status }}
        </UBadge>
      </div>
    </div>

    <div v-if="loading && !data" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat data tes tertulis...</span>
    </div>

    <UAlert v-else-if="errorMessage || !data" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage || 'Data tes tertulis belum dapat dimuat.'">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <template v-else>
      <!-- Jadwal tahap tes tertulis -->
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
        <span class="flex items-center gap-2 font-medium text-slate-800">
          <UIcon name="i-lucide-calendar-clock" class="size-4 text-primary" />
          Tahap Tes Tertulis
        </span>
        <span class="text-slate-600">Mulai: <span class="font-medium text-slate-800">{{ formatDateTimeId(data.stage.startAt) }}</span></span>
        <span class="text-slate-600">Selesai: <span class="font-medium text-slate-800">{{ formatDateTimeId(data.stage.endAt) }}</span></span>
        <UBadge :color="data.stage.open ? 'success' : 'neutral'" variant="subtle" class="ml-auto">
          {{ data.stage.open ? 'Sedang Dibuka' : 'Tidak Dibuka' }}
        </UBadge>
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-semibold text-slate-900">Pengaturan Tes Tertulis</h2>
              <p class="mt-1 text-sm text-slate-600">
                <template v-if="data.config?.applied_at">Terakhir diterapkan {{ formatDateTimeId(data.config.applied_at) }}.</template>
                <template v-else>Pengaturan berlaku bagi peserta setelah disimpan &amp; diterapkan.</template>
              </p>
            </div>
            <UBadge v-if="data.apply_state === 'CURRENT'" color="success" variant="subtle">Diterapkan</UBadge>
            <UBadge v-else-if="data.apply_state === 'OUTDATED'" color="warning" variant="subtle">Ada Perubahan</UBadge>
            <UBadge v-else color="neutral" variant="subtle">Belum Diterapkan</UBadge>
          </div>
        </template>

        <div class="space-y-5">
          <UAlert
            v-if="data.apply_state === 'OUTDATED'"
            color="warning"
            variant="subtle"
            icon="i-lucide-refresh-ccw"
            title="Paket atau soal berubah sejak terakhir diterapkan"
            description="Peserta yang mulai sekarang masih mendapat soal versi lama. Tekan Terapkan Ulang agar soal terbaru dipakai peserta berikutnya."
          />
          <UAlert
            v-else-if="data.config && data.apply_state === 'NOT_APPLIED'"
            color="warning"
            variant="subtle"
            icon="i-lucide-circle-alert"
            title="Pengaturan belum diterapkan"
            description="Peserta belum dapat memulai tes tertulis. Tekan Simpan & Terapkan."
          />
          <UAlert
            v-if="configShortage > 0"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            title="Soal aktif pada paket kurang"
            :description="`Paket kekurangan ${configShortage} soal aktif dari jumlah soal yang ditetapkan (ada soal yang diarsipkan). Peserta tidak dapat memulai tes tertulis sampai pengaturan diperbaiki.`"
          />
          <UAlert
            v-else-if="data.packages.length === 0"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="Belum ada paket soal aktif"
            description="Buat paket soal terlebih dahulu melalui menu Paket Soal."
          />

          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <UFormField label="Paket Soal" required class="md:col-span-2 xl:col-span-1">
              <USelect
                v-model="form.packageId"
                :items="packageItems"
                value-key="value"
                label-key="label"
                placeholder="Pilih paket soal"
                class="mt-1 w-full"
              />
            </UFormField>
            <UFormField label="Jumlah Soal" required :hint="selectedPackage ? `Maks. ${maxQuestions}` : ''">
              <UInputNumber v-model="form.questionCount" :min="1" :max="maxQuestions || undefined" class="mt-1 w-full" />
            </UFormField>
            <UFormField label="Durasi" required>
              <USelect v-model="form.durationMinutes" :items="durationItems" value-key="value" label-key="label" class="mt-1 w-full" />
            </UFormField>
            <UFormField label="Passing Grade" required hint="Skala 0–100">
              <UInputNumber v-model="form.passingGrade" :min="0" :max="100" class="mt-1 w-full" />
            </UFormField>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <UCheckbox
              v-model="form.shuffleQuestions"
             
              label="Acak soal"
              description="Soal diambil acak dari paket dan urutannya berbeda tiap peserta. Bila nonaktif, dipakai N soal pertama sesuai urutan paket."
              class="rounded-lg border border-slate-300 p-3"
            />
            <UCheckbox
              v-model="form.shuffleOptions"
             
              label="Acak opsi jawaban"
              description="Urutan opsi A–E diacak per soal untuk tiap peserta. Bila nonaktif, opsi tampil sesuai urutan di bank soal."
              class="rounded-lg border border-slate-300 p-3"
            />
          </div>

          <ul class="space-y-1 rounded-lg border border-slate-400 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <li>• Nilai = jumlah jawaban benar ÷ jumlah soal × 100; soal yang tidak dijawab dihitung salah.</li>
            <li>• Batas waktu peserta = waktu mulai + durasi, namun tidak melewati akhir tahap Tes Tertulis.</li>
            <li>• Setiap peserta mengerjakan satu kali (Super Admin dapat mereset progres bila diperlukan). Nilai hanya dapat dilihat Super Admin.</li>
            <li>• Simpan &amp; Terapkan menyalin isi soal paket saat itu. Perubahan bank soal/paket sesudahnya baru berlaku setelah diterapkan ulang; peserta yang sudah mulai tetap memakai soal versinya.</li>
          </ul>

          <div class="flex items-center justify-end gap-3">
            <p v-if="formError" class="text-sm text-slate-600">{{ formError }}</p>
            <UButton
              :icon="data.apply_state === 'OUTDATED' && !isDirty ? 'i-lucide-refresh-ccw' : 'i-lucide-save'"
              :loading="saving"
              :disabled="saving || Boolean(formError) || !canApply"
              @click="requestSave"
            >
              {{ data.apply_state === 'OUTDATED' && !isDirty ? 'Terapkan Ulang' : 'Simpan & Terapkan' }}
            </UButton>
          </div>
        </div>
      </UCard>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Hasil Tes Tertulis</h2>
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
      </section>

      <UCard>
        <template #header>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-semibold text-slate-900">Daftar Nilai Peserta</h2>
                  <UBadge
                    v-if="data.config && data.config.config_version > 0"
                    color="primary"
                    variant="subtle"
                    icon="i-lucide-history"
                    :title="data.config.applied_at ? `Diterapkan ${formatDateTimeId(data.config.applied_at)}` : undefined"
                  >
                    Konfigurasi ke-{{ data.config.config_version }}
                  </UBadge>
                </div>
              </div>
              <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" size="sm" :loading="loading" class="self-start" @click="load">
                Muat Ulang
              </UButton>
            </div>
            <div class="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 sm:flex-row">
              <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Cari nama, NIP, atau instansi..." class="w-full" />
              <USelect v-model="activeFilter" :items="FILTERS" value-key="value" label-key="label" class="w-full sm:w-60" />
            </div>
          </div>
        </template>

        <div v-if="filteredItems.length === 0" class="py-8 text-center">
          <UIcon name="i-lucide-inbox" class="mx-auto size-9 text-slate-500" />
          <p class="mt-3 font-medium text-slate-700">Tidak ada data yang sesuai</p>
          <p class="mt-1 text-sm text-slate-600">Coba ubah filter atau kata pencarian.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[960px] table-fixed text-left text-sm">
            <colgroup>
              <col class="w-[28%]" />
              <col />
              <col class="w-44" />
              <col class="w-32" />
              <col class="w-24" />
              <col class="w-28" />
            </colgroup>
            <thead>
              <tr class="border-b border-blue-100">
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Peserta</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Instansi</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Waktu Mengerjakan</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Status</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Nilai</th>
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
                  <p class="truncate" :title="item.institution_name">{{ item.institution_name }}</p>
                </td>
                <td class="px-4 py-3 text-center text-slate-600">
                  {{ formatWorkMinutes(item.work_seconds) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <UBadge :color="STATUS_BADGES[item.status].color" variant="subtle">
                    {{ STATUS_BADGES[item.status].label }}
                  </UBadge>
                </td>
                <td class="px-4 py-3 text-center">
                  <UBadge v-if="item.score !== null" :color="item.passed ? 'success' : 'error'" variant="subtle">
                    {{ formatScore(item.score) }}
                  </UBadge>
                  <span v-else class="text-slate-500">-</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <UButton
                    v-if="item.attempt_id"
                    icon="i-lucide-settings-2"
                    color="primary"
                    variant="solid"
                    square
                    size="md"
                    aria-label="Pilihan aksi"
                    title="Pilihan aksi"
                    @click="openActions(item)"
                  />
                  <span v-else class="text-slate-500">-</span>
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

    <!-- Konfirmasi terapkan ulang saat sudah ada peserta yang mulai -->
    <UModal
      v-model:open="applyModalOpen"
      :dismissible="!saving"
      title="Terapkan Pengaturan Tes Tertulis?"
      description="Sudah ada peserta yang mulai mengerjakan tes tertulis pada periode ini."
    >
      <template #body>
        <div class="space-y-3 text-sm text-slate-600">
          <p class="rounded-lg border border-slate-400 bg-slate-50 p-3 text-slate-700">
            <span class="font-semibold">{{ data?.started_count }}</span> peserta sudah mulai/selesai mengerjakan.
          </p>
          <p>
            Mereka tetap memakai soal dan pengaturan versi saat mereka mulai, termasuk nilainya.
            Peserta yang mulai setelah ini akan mendapat pengaturan dan soal terbaru, sehingga dalam satu periode
            peserta dapat mengerjakan versi soal yang berbeda.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="outline" :disabled="saving" @click="applyModalOpen = false">Batal</UButton>
          <UButton color="warning" icon="i-lucide-refresh-ccw" :loading="saving" :disabled="saving" @click="save">Ya, Terapkan</UButton>
        </div>
      </template>
    </UModal>

    <!-- Konfirmasi reset progres peserta -->
    <UModal
      v-model:open="resetModalOpen"
      :dismissible="!resetting"
      title="Reset Progres Tes Tertulis?"
      :description="resetTarget?.full_name"
    >
      <template #body>
        <div class="space-y-3 text-sm text-slate-600">
          <p>
            Pengerjaan peserta ini
            <template v-if="resetTarget?.status === 'SUBMITTED'">beserta nilainya</template>
            akan dibatalkan dan peserta dapat memulai tes tertulis lagi dari awal selama tahap Tes Tertulis dibuka.
          </p>
          <p>Data pengerjaan lama tetap tersimpan sebagai riwayat, tetapi tidak lagi ditampilkan atau dihitung.</p>
          <p v-if="resetTarget?.status === 'IN_PROGRESS'" class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
            Peserta sedang mengerjakan. Jawaban yang sedang diisi tidak dapat disimpan lagi setelah direset.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="outline" :disabled="resetting" @click="resetModalOpen = false">Batal</UButton>
          <UButton color="error" icon="i-lucide-rotate-ccw" :loading="resetting" :disabled="resetting" @click="confirmReset">Reset Progres</UButton>
        </div>
      </template>
    </UModal>

    <!-- Pilihan aksi per peserta (gaya Manajemen Akun) -->
    <TableActionModal
      v-model:open="actionModalOpen"
      title="Pilihan Aksi"
      :description="actionTarget?.full_name"
      :actions="targetActions"
    >
      <template v-if="actionTarget" #summary>
        <p class="font-semibold text-slate-900">{{ actionTarget.full_name }}</p>
        <p class="mt-1 text-sm text-slate-600">{{ actionTarget.nip }} · {{ actionTarget.institution_name }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UBadge :color="STATUS_BADGES[actionTarget.status].color" variant="subtle">
            {{ STATUS_BADGES[actionTarget.status].label }}
          </UBadge>
          <UBadge v-if="actionTarget.score !== null" :color="actionTarget.passed ? 'success' : 'error'" variant="subtle">
            Nilai {{ formatScore(actionTarget.score) }}
          </UBadge>
          <span v-if="actionTarget.work_seconds !== null" class="text-xs text-slate-600">
            {{ formatWorkMinutes(actionTarget.work_seconds) }}{{ actionTarget.submit_type === 'AUTO' ? ' · terkirim otomatis (waktu habis)' : '' }}
          </span>
        </div>
      </template>
    </TableActionModal>
  </div>
</template>
