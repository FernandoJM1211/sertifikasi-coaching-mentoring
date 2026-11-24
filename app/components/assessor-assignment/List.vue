<script setup lang="ts">
/**
 * Penugasan asesor dalam satu periode (Verifikator & Super Admin):
 * 1. Asesor periode — memilih Asesor Teknis & Kepublikan yang bertugas di periode ini.
 * 2. Penugasan peserta — satu per satu atau sekaligus (centang beberapa peserta).
 * Contoh: <AssessorAssignmentList period-id="PER-000001" back-path="/verifikator/assessor-assignments" />
 */
const props = defineProps<{
  periodId: string
  /** Halaman pilihan periode. */
  backPath: string
}>()

type AssessorRole = 'TECHNICAL_ASSESSOR' | 'PUBLIC_ASSESSOR'
type Assessor = { user_id: string, full_name: string }
type AssessorOption = Assessor & { assigned_count: number, in_period: boolean }
type AssignmentStatus = 'ASSIGNED' | 'PARTIAL' | 'UNASSIGNED' | 'NOT_VERIFIED'

type Item = {
  application_id: string
  sa_verified: boolean
  full_name: string
  nip: string
  institution_name: string
  technical_assessor: Assessor | null
  public_assessor: Assessor | null
  status: AssignmentStatus
}

type RoleAssessors = { period: AssessorOption[], candidates: AssessorOption[] }

type ListResponse = {
  period: { period_id: string, period_name: string, period_status: string }
  stage: { open: boolean, message: string }
  /** Tahap Verifikasi SA dibuka dan penilaian asesor belum dimulai. */
  canEdit: boolean
  /** Penugasan dibuka lewat dispensasi (tahap Verifikasi SA dibuka manual saat penilaian berjalan). */
  dispensation: boolean
  assessmentStarted: boolean
  summary: { total: number, assigned: number, unassigned: number, notVerified: number }
  assessors: { technical: RoleAssessors, public: RoleAssessors }
  items: Item[]
}

const toast = useToast()
const apiBase = computed(
  () => `/api/assessor-assignments/by-period/${encodeURIComponent(props.periodId)}`,
)

const loading = ref(true)
const errorMessage = ref('')
const data = ref<ListResponse | null>(null)

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: ListResponse }>(apiBase.value, { credentials: 'include' })
    data.value = response.data

    // Buang pilihan peserta yang sudah tidak ada di daftar.
    const ids = new Set(response.data.items.map((item) => item.application_id))
    selectedIds.value = selectedIds.value.filter((id) => ids.has(id))
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Data penugasan asesor belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { data?: { statusMessage?: string } }).data?.statusMessage || fallback
}

function showError(title: string, error: unknown) {
  toast.add({
    title,
    description: getErrorMessage(error, 'Terjadi kesalahan. Silakan coba lagi.'),
    color: 'error',
    icon: 'i-lucide-circle-x',
  })
}

/* ---------------- Tampilan umum ---------------- */

const ROLE_LABELS: Record<AssessorRole, string> = {
  TECHNICAL_ASSESSOR: 'Asesor Teknis',
  PUBLIC_ASSESSOR: 'Asesor Kepublikan',
}

const STATUS_BADGES: Record<AssignmentStatus, { label: string, color: 'success' | 'warning' | 'info' | 'neutral' }> = {
  ASSIGNED: { label: 'Sudah Ditugaskan', color: 'success' },
  // Termasuk card "Belum Ditugaskan" (kuning).
  PARTIAL: { label: 'Belum Lengkap', color: 'warning' },
  UNASSIGNED: { label: 'Belum Ditugaskan', color: 'warning' },
  NOT_VERIFIED: { label: 'SA Belum Terverifikasi', color: 'neutral' },
}

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

const roleSections = computed(() => [
  { role: 'TECHNICAL_ASSESSOR' as const, data: data.value?.assessors.technical },
  { role: 'PUBLIC_ASSESSOR' as const, data: data.value?.assessors.public },
])

const hasPeriodAssessors = computed(() =>
  Boolean(data.value?.assessors.technical.period.length || data.value?.assessors.public.period.length),
)

/** Role asesor periode yang masih kosong, untuk pengingat di bawah judul "Asesor Periode Ini". */
const missingAssessorText = computed(() => {
  if (!data.value) return ''
  const missing = [
    data.value.assessors.technical.period.length ? '' : 'Asesor Teknis',
    data.value.assessors.public.period.length ? '' : 'Asesor Kepublikan',
  ].filter(Boolean)
  return missing.join(' dan ')
})

/* ---------------- Filter & pencarian ---------------- */

const FILTERS = [
  { value: 'ALL', label: 'Semua Peserta' },
  { value: 'NOT_ASSIGNED', label: 'Belum Ditugaskan / Belum Lengkap' },
  { value: 'ASSIGNED', label: 'Sudah Ditugaskan' },
  { value: 'NOT_VERIFIED', label: 'SA Belum Terverifikasi' },
]

const activeFilter = ref('ALL')
const searchQuery = ref('')

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return (data.value?.items ?? []).filter((item) => {
    const matchesFilter =
      activeFilter.value === 'ALL' ||
      (activeFilter.value === 'ASSIGNED' && item.status === 'ASSIGNED') ||
      (activeFilter.value === 'NOT_ASSIGNED' && (item.status === 'UNASSIGNED' || item.status === 'PARTIAL')) ||
      (activeFilter.value === 'NOT_VERIFIED' && item.status === 'NOT_VERIFIED')

    const matchesQuery =
      !query ||
      [
        item.full_name,
        item.nip,
        item.institution_name,
        item.technical_assessor?.full_name ?? '',
        item.public_assessor?.full_name ?? '',
      ].some((value) => value.toLowerCase().includes(query))

    return matchesFilter && matchesQuery
  })
})

const summaryCards = computed(() => [
  { key: 'ALL', label: 'Total Peserta', value: data.value?.summary.total ?? 0, icon: 'i-lucide-users', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { key: 'ASSIGNED', label: 'Sudah Ditugaskan', value: data.value?.summary.assigned ?? 0, icon: 'i-lucide-user-check', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'NOT_ASSIGNED', label: 'Belum Ditugaskan', value: data.value?.summary.unassigned ?? 0, icon: 'i-lucide-user-x', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'NOT_VERIFIED', label: 'SA Belum Terverifikasi', value: data.value?.summary.notVerified ?? 0, icon: 'i-lucide-clock', tone: 'border-slate-300 bg-slate-50 text-slate-600' },
])

/* ---------------- Pilih banyak peserta ---------------- */

const selectedIds = ref<string[]>([])
const selectedSet = computed(() => new Set(selectedIds.value))

/** Peserta yang tampil di halaman tabel aktif (pilih semua hanya untuk halaman ini). */
const visibleIds = computed(() =>
  pagedItems.value.filter((item) => item.sa_verified).map((item) => item.application_id),
)

const selectAllState = computed<boolean | 'indeterminate'>(() => {
  const selectedVisible = visibleIds.value.filter((id) => selectedSet.value.has(id)).length
  if (selectedVisible === 0 || visibleIds.value.length === 0) return false
  return selectedVisible === visibleIds.value.length ? true : 'indeterminate'
})

function toggleSelectAll(value: boolean | 'indeterminate') {
  const visible = new Set(visibleIds.value)

  selectedIds.value = value === true
    ? [...new Set([...selectedIds.value, ...visibleIds.value])]
    : selectedIds.value.filter((id) => !visible.has(id))
}

function toggleItem(id: string, value: boolean | 'indeterminate') {
  selectedIds.value = value === true
    ? [...selectedIds.value, id]
    : selectedIds.value.filter((item) => item !== id)
}

/* ---------------- Modal penugasan (satu / banyak) ---------------- */

/** Nilai khusus pada pilihan asesor: tidak mengubah asesor yang sudah ada. */
const KEEP = 'KEEP'

const assignTargets = ref<Item[]>([])
const technicalChoice = ref(KEEP)
const publicChoice = ref(KEEP)
const changeReason = ref('')
const assigning = ref(false)
const REASON_MAX_LENGTH = 500

const assignModalOpen = computed({
  get: () => assignTargets.value.length > 0,
  set: (value: boolean) => {
    if (!value && !assigning.value) assignTargets.value = []
  },
})

function assessorItems(options: AssessorOption[]) {
  return [
    { value: KEEP, label: 'Tidak diubah' },
    ...options.map((option) => ({
      value: option.user_id,
      label: `${option.full_name} (${option.assigned_count} peserta)`,
    })),
  ]
}

const technicalItems = computed(() => assessorItems(data.value?.assessors.technical.period ?? []))
const publicItems = computed(() => assessorItems(data.value?.assessors.public.period ?? []))

function openAssign(items: Item[]) {
  assignTargets.value = items

  // Satu peserta: tampilkan asesor yang sudah ada sebagai pilihan awal.
  const single = items.length === 1 ? items[0] : null
  technicalChoice.value = single?.technical_assessor?.user_id ?? KEEP
  publicChoice.value = single?.public_assessor?.user_id ?? KEEP
  changeReason.value = ''
}

/** Jumlah peserta yang asesornya akan DIGANTI (bukan diisi pertama kali). */
const replacementCount = computed(() =>
  assignTargets.value.filter((item) =>
    (technicalChoice.value !== KEEP && item.technical_assessor && item.technical_assessor.user_id !== technicalChoice.value) ||
    (publicChoice.value !== KEEP && item.public_assessor && item.public_assessor.user_id !== publicChoice.value),
  ).length,
)

function openBulkAssign() {
  const items = (data.value?.items ?? []).filter((item) => selectedSet.value.has(item.application_id))
  if (items.length > 0) openAssign(items)
}

const canSaveAssignment = computed(() =>
  (technicalChoice.value !== KEEP || publicChoice.value !== KEEP) &&
  (replacementCount.value === 0 || changeReason.value.trim().length > 0),
)

async function saveAssignment() {
  if (!canSaveAssignment.value || assigning.value) return

  assigning.value = true

  try {
    const response = await $fetch<{ message: string }>(`${apiBase.value}/assign`, {
      method: 'POST',
      body: {
        applicationIds: assignTargets.value.map((item) => item.application_id),
        technicalAssessorId: technicalChoice.value === KEEP ? undefined : technicalChoice.value,
        publicAssessorId: publicChoice.value === KEEP ? undefined : publicChoice.value,
        reason: replacementCount.value > 0 ? changeReason.value.trim() : '',
      },
      credentials: 'include',
    })

    toast.add({ title: 'Penugasan tersimpan', description: response.message, color: 'success', icon: 'i-lucide-circle-check' })

    assignTargets.value = []
    selectedIds.value = []
    await load()
  } catch (error: unknown) {
    showError('Gagal menyimpan penugasan', error)
  } finally {
    assigning.value = false
  }
}

/* ---------------- Modal kelola asesor periode ---------------- */

const manageRole = ref<AssessorRole | null>(null)
const manageSelection = ref<string[]>([])
const manageSearch = ref('')
const savingAssessors = ref(false)

const manageModalOpen = computed({
  get: () => manageRole.value !== null,
  set: (value: boolean) => {
    if (!value && !savingAssessors.value) manageRole.value = null
  },
})

const manageCandidates = computed(() => {
  if (!manageRole.value || !data.value) return []

  const source = manageRole.value === 'TECHNICAL_ASSESSOR'
    ? data.value.assessors.technical.candidates
    : data.value.assessors.public.candidates
  const query = manageSearch.value.trim().toLowerCase()

  return query ? source.filter((item) => item.full_name.toLowerCase().includes(query)) : source
})

function openManage(role: AssessorRole) {
  const source = role === 'TECHNICAL_ASSESSOR' ? data.value?.assessors.technical : data.value?.assessors.public
  manageRole.value = role
  manageSearch.value = ''
  manageSelection.value = (source?.period ?? []).map((item) => item.user_id)
}

function toggleManage(id: string, value: boolean | 'indeterminate') {
  manageSelection.value = value === true
    ? [...manageSelection.value, id]
    : manageSelection.value.filter((item) => item !== id)
}

async function saveAssessors() {
  if (!manageRole.value || savingAssessors.value) return

  savingAssessors.value = true

  try {
    const response = await $fetch<{ message: string }>(`${apiBase.value}/assessors`, {
      method: 'PUT',
      body: { role: manageRole.value, userIds: manageSelection.value },
      credentials: 'include',
    })

    toast.add({ title: 'Asesor periode tersimpan', description: response.message, color: 'success', icon: 'i-lucide-circle-check' })

    manageRole.value = null
    await load()
  } catch (error: unknown) {
    showError('Gagal menyimpan asesor periode', error)
  } finally {
    savingAssessors.value = false
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
          {{ data?.period.period_name || 'Penugasan Asesor' }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          Penugasan Asesor · ID Periode:
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
      <span class="ml-3 text-sm text-slate-600">Memuat data penugasan...</span>
    </div>

    <UAlert
      v-else-if="errorMessage || !data"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="errorMessage || 'Data penugasan asesor belum dapat dimuat.'"
    />

    <template v-else>
      <UAlert
        v-if="!data.stage.open"
        color="warning"
        variant="subtle"
        icon="i-lucide-calendar-clock"
        title="Tahap Verifikasi Self Assessment tidak sedang dibuka"
        :description="`${data.stage.message} Data tetap dapat dilihat, namun asesor periode dan penugasan peserta hanya dapat diatur pada saat tahap tersebut dibuka.`"
      />

      <!-- Dibuka manual: tahap Verifikasi SA di-override OPEN saat penilaian asesor berjalan (docs/08 K-14). -->
      <UAlert
        v-else-if="data.dispensation"
        color="warning"
        variant="subtle"
        icon="i-lucide-lock-open"
        title="Penugasan dibuka manual"
        description="Tahap Verifikasi Self Assessment dibuka manual oleh Super Admin, sehingga asesor periode dan penugasan peserta dapat diatur walau tahap penilaian asesor sedang berjalan. Asesor peserta yang penilaiannya sudah dimulai tetap tidak dapat diganti. Kembalikan tahap ke Normal di halaman Timeline untuk mengunci kembali."
      />

      <UAlert
        v-else-if="data.assessmentStarted"
        color="warning"
        variant="subtle"
        icon="i-lucide-lock"
        title="Penugasan dikunci"
        description="Tahap penilaian asesor sudah dibuka, sehingga asesor periode dan penugasan peserta tidak dapat diubah. Untuk dispensasi, Super Admin dapat membuka tahap Verifikasi Self Assessment secara manual di halaman Timeline."
      />

      <!-- 1. Asesor periode -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Asesor Periode Ini</h2>
        <!-- Hilang bila Asesor Teknis & Kepublikan periode ini sudah ada. -->
        <p v-if="missingAssessorText" class="flex items-start gap-2 text-sm text-amber-700">
          <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-4 shrink-0" />
          Tambahkan {{ missingAssessorText }} pada periode ini terlebih dahulu untuk mulai menugaskan peserta.
        </p>

        <div class="grid gap-4 lg:grid-cols-2">
          <UCard
            v-for="section in roleSections"
            :key="section.role"
            class="bg-white/90 shadow-sm"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-slate-900">
                  {{ ROLE_LABELS[section.role] }}
                  <span class="font-normal text-slate-600">({{ section.data?.period.length ?? 0 }})</span>
                </p>
              </div>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-users-round"
                :disabled="!data.canEdit"
                class="shrink-0"
                @click="openManage(section.role)"
              >
                Kelola
              </UButton>
            </div>

            <!-- Maksimal 3 nama terlihat; selebihnya di-scroll -->
            <ul
              v-if="section.data?.period.length"
              class="mt-4 max-h-28 divide-y divide-slate-200 overflow-y-auto pr-1"
            >
              <li
                v-for="assessor in section.data.period"
                :key="assessor.user_id"
                class="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span class="min-w-0 truncate text-slate-700">{{ assessor.full_name }}</span>
                <span class="shrink-0 text-xs text-slate-600">{{ assessor.assigned_count }} peserta</span>
              </li>
            </ul>
            <p v-else class="mt-4 rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
              Belum ada {{ ROLE_LABELS[section.role] }} pada periode ini.
            </p>
          </UCard>
        </div>
      </section>

      <!-- 2. Ringkasan -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Ringkasan Penugasan</h2>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <!-- 3. Daftar peserta -->
      <UCard>
        <template #header>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="font-semibold text-slate-900">Daftar Penugasan Asesor</h2>
                <p class="mt-1 text-sm text-slate-600">
                  Centang beberapa peserta untuk menugaskan asesor secara bersamaan.
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
            <div class="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 sm:flex-row">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Cari nama, NIP, instansi, atau asesor..."
                class="w-full"
              />
              <USelect
                v-model="activeFilter"
                :items="FILTERS"
                value-key="value"
                label-key="label"
                class="w-full sm:w-72"
              />
            </div>

            <!-- Aksi untuk peserta terpilih -->
            <div
              v-if="selectedIds.length > 0"
              class="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-sm font-medium text-slate-700">
                {{ selectedIds.length }} peserta dipilih
              </p>
              <div class="flex gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="selectedIds = []"
                >
                  Batal Pilih
                </UButton>
                <UButton
                  icon="i-lucide-user-check"
                  size="sm"
                  :disabled="!data.canEdit || !hasPeriodAssessors"
                  @click="openBulkAssign"
                >
                  Tugaskan Terpilih
                </UButton>
              </div>
            </div>
          </div>
        </template>

        <div v-if="filteredItems.length === 0" class="py-8 text-center">
          <UIcon name="i-lucide-inbox" class="mx-auto size-9 text-slate-500" />
          <p class="mt-3 font-medium text-slate-700">Tidak ada data yang sesuai</p>
          <p class="mt-1 text-sm text-slate-600">
            {{ data.items.length === 0
              ? 'Belum ada peserta dengan self assessment terverifikasi.'
              : 'Coba ubah filter atau kata pencarian.' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr class="border-b border-blue-100">
                <th class="w-12 px-4 py-3">
                  <UCheckbox
                    :model-value="selectAllState"
                    aria-label="Pilih semua peserta yang ditampilkan"
                    @update:model-value="toggleSelectAll"
                  />
                </th>
                <th class="px-4 py-3 font-semibold text-blue-600">Peserta</th>
                <th class="px-4 py-3 font-semibold text-blue-600">Instansi</th>
                <th class="px-4 py-3 font-semibold text-blue-600">Asesor Teknis</th>
                <th class="px-4 py-3 font-semibold text-blue-600">Asesor Kepublikan</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Status</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in pagedItems"
                :key="item.application_id"
                class="border-b border-slate-300 last:border-0"
                :class="selectedSet.has(item.application_id) ? 'bg-blue-50' : ''"
              >
                <td class="px-4 py-4">
                  <UCheckbox
                    :model-value="selectedSet.has(item.application_id)"
                    :disabled="!item.sa_verified"
                    :aria-label="`Pilih ${item.full_name}`"
                    @update:model-value="toggleItem(item.application_id, $event)"
                  />
                </td>
                <td class="px-4 py-4">
                  <p class="font-medium text-slate-800">{{ item.full_name }}</p>
                  <p class="text-xs text-slate-600">{{ item.nip }}</p>
                </td>
                <td class="px-4 py-4 text-slate-600">{{ item.institution_name }}</td>
                <td class="px-4 py-4" :class="item.technical_assessor ? 'text-slate-700' : 'text-slate-500'">
                  {{ item.technical_assessor?.full_name || 'Belum ditugaskan' }}
                </td>
                <td class="px-4 py-4" :class="item.public_assessor ? 'text-slate-700' : 'text-slate-500'">
                  {{ item.public_assessor?.full_name || 'Belum ditugaskan' }}
                </td>
                <td class="px-4 py-4 text-center">
                  <UBadge
                    :color="STATUS_BADGES[item.status].color"
                    variant="subtle"
                    class="inline-flex min-w-32 justify-center"
                  >
                    {{ STATUS_BADGES[item.status].label }}
                  </UBadge>
                </td>
                <td class="px-4 py-4 text-center">
                  <UButton
                    v-if="!item.sa_verified"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    disabled
                    class="inline-flex w-32 justify-center"
                  >
                    Belum Bisa
                  </UButton>
                  <UButton
                    v-else
                    :color="item.status === 'ASSIGNED' ? 'neutral' : 'primary'"
                    :variant="item.status === 'ASSIGNED' ? 'outline' : 'solid'"
                    size="sm"
                    :disabled="!data.canEdit || !hasPeriodAssessors"
                    icon="i-lucide-pencil"
                    class="inline-flex w-32 justify-center"
                    @click="openAssign([item])"
                  >
                    {{ item.status === 'ASSIGNED' ? 'Ubah' : 'Tugaskan' }}
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <div class="space-y-3">
            <TablePagination v-model:page="tablePage" v-model:page-size="tablePageSize" :total="filteredItems.length" label="peserta" />
          </div>
        </template>
      </UCard>

      <!-- Modal penugasan -->
      <UModal
        v-model:open="assignModalOpen"
        :dismissible="!assigning"
        title="Tugaskan Asesor"
        :description="assignTargets.length === 1
          ? `${assignTargets[0]?.full_name} · ${assignTargets[0]?.nip}`
          : `${assignTargets.length} peserta dipilih`"
      >
        <template #body>
          <div class="space-y-5">
            <UFormField label="Asesor Teknis" description="Menilai CMSP-02 (K/BK per indikator).">
              <USelect
                v-model="technicalChoice"
                :items="technicalItems"
                value-key="value"
                label-key="label"
                class="mt-1 w-full"
              />
            </UFormField>

            <UFormField label="Asesor Kepublikan" description="Menilai dengan form CMSP-03.">
              <USelect
                v-model="publicChoice"
                :items="publicItems"
                value-key="value"
                label-key="label"
                class="mt-1 w-full"
              />
            </UFormField>

            <UFormField
              v-if="replacementCount > 0"
              label="Alasan Pergantian Asesor"
              :description="`${replacementCount} peserta akan berganti asesor. Alasan dicatat dalam riwayat penugasan.`"
              :hint="`${changeReason.length}/${REASON_MAX_LENGTH}`"
              required
            >
              <UTextarea
                v-model="changeReason"
                :rows="3"
                :maxlength="REASON_MAX_LENGTH"
                placeholder="Contoh: Asesor berhalangan karena tugas dinas."
                class="mt-1 w-full"
              />
            </UFormField>

            <p class="text-xs leading-5 text-slate-600">
              Pilih "Tidak diubah" untuk mempertahankan asesor yang sudah ada.
              Angka di samping nama adalah jumlah peserta yang ditangani asesor tersebut pada periode ini.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton color="neutral" variant="outline" :disabled="assigning" @click="assignTargets = []">
              Batal
            </UButton>
            <UButton
              icon="i-lucide-user-check"
              :loading="assigning"
              :disabled="!canSaveAssignment"
              @click="saveAssignment"
            >
              Simpan Penugasan
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Modal kelola asesor periode -->
      <UModal
        v-model:open="manageModalOpen"
        :dismissible="!savingAssessors"
        :title="manageRole ? `Kelola ${ROLE_LABELS[manageRole]} Periode` : ''"
        description="Centang asesor yang bertugas pada periode ini."
      >
        <template #body>
          <div class="space-y-4">
            <UInput
              v-model="manageSearch"
              icon="i-lucide-search"
              placeholder="Cari nama asesor..."
              class="w-full"
            />

            <div class="max-h-80 overflow-y-auto rounded-lg border border-slate-300">
              <p v-if="manageCandidates.length === 0" class="p-4 text-center text-sm text-slate-600">
                Tidak ada akun asesor aktif. Akun asesor dibuat oleh Super Admin melalui menu Manajemen Akun.
              </p>
              <label
                v-for="candidate in manageCandidates"
                :key="candidate.user_id"
                class="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 last:border-0 hover:bg-slate-50"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <UCheckbox
                    :model-value="manageSelection.includes(candidate.user_id)"
                    @update:model-value="toggleManage(candidate.user_id, $event)"
                  />
                  <span class="truncate text-sm text-slate-700">{{ candidate.full_name }}</span>
                </span>
                <span class="shrink-0 text-xs text-slate-600">{{ candidate.assigned_count }} peserta</span>
              </label>
            </div>

            <p class="text-xs leading-5 text-slate-600">
              {{ manageSelection.length }} asesor dipilih. Asesor yang masih menangani peserta
              tidak dapat dikeluarkan dari periode.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton color="neutral" variant="outline" :disabled="savingAssessors" @click="manageRole = null">
              Batal
            </UButton>
            <UButton icon="i-lucide-save" :loading="savingAssessors" @click="saveAssessors">
              Simpan
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
