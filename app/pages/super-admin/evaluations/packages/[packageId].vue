<script setup lang="ts">
import { EVALUATION_LIMITS } from '~~/shared/utils/evaluation'

/**
 * Buat / ubah paket soal (Super Admin). `packageId = baru` untuk paket baru.
 * Soal dipilih dari bank soal (hanya soal aktif yang dapat ditambahkan).
 */
definePageMeta({ layout: 'super-admin' })

type Question = {
  question_id: string
  topic: string
  question_text: string
  status: 'ACTIVE' | 'ARCHIVED'
}

type PackageDetail = {
  package_id: string
  package_name: string
  description: string
  status: 'ACTIVE' | 'ARCHIVED'
  question_ids: string[]
  period_ids: string[]
  periods: { period_id: string, period_name: string }[]
  required_count: number
  used: boolean
}

const route = useRoute()
const toast = useToast()
const BACK_PATH = '/super-admin/evaluations/packages'

const packageId = computed(() => String(route.params.packageId || ''))
const isNew = computed(() => packageId.value === 'baru')
useHead({ title: () => (isNew.value ? 'Buat Paket Soal' : 'Ubah Paket Soal') })

const loading = ref(true)
const errorMessage = ref('')
const saving = ref(false)
const questions = ref<Question[]>([])
const detail = ref<PackageDetail | null>(null)

const form = reactive({ packageName: '', description: '' })
const selected = ref<string[]>([])
const selectedSet = computed(() => new Set(selected.value))

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [questionResponse, packageResponse] = await Promise.all([
      $fetch<{ data: Question[] }>('/api/evaluation/questions', { credentials: 'include' }),
      isNew.value
        ? Promise.resolve(null)
        : $fetch<{ data: PackageDetail }>(`/api/evaluation/packages/${encodeURIComponent(packageId.value)}`, { credentials: 'include' }),
    ])

    questions.value = questionResponse.data
    detail.value = packageResponse?.data ?? null

    if (detail.value) {
      form.packageName = detail.value.package_name
      form.description = detail.value.description
      selected.value = [...detail.value.question_ids]
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Data paket soal belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------------- Daftar soal ---------------- */
const searchQuery = ref('')
const topicFilter = ref('ALL')
const selectionFilter = ref('ALL')
const page = ref(1)
const PAGE_SIZE = 20

const SELECTION_FILTERS = [
  { value: 'ALL', label: 'Semua Soal' },
  { value: 'SELECTED', label: 'Sudah Dipilih' },
  { value: 'UNSELECTED', label: 'Belum Dipilih' },
]

/** Soal aktif + soal arsip yang masih tercantum di paket (agar bisa dikeluarkan). */
const availableQuestions = computed(() =>
  questions.value.filter((item) => item.status === 'ACTIVE' || selectedSet.value.has(item.question_id)),
)

const topicItems = computed(() => [
  { value: 'ALL', label: 'Semua Topik' },
  ...[...new Set(availableQuestions.value.map((item) => item.topic).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'id'))
    .map((topic) => ({ value: topic, label: topic })),
])

const filteredQuestions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return availableQuestions.value.filter((item) => {
    const isSelected = selectedSet.value.has(item.question_id)
    return (
      (topicFilter.value === 'ALL' || item.topic === topicFilter.value) &&
      (selectionFilter.value === 'ALL' || (selectionFilter.value === 'SELECTED') === isSelected) &&
      (!query || item.question_text.toLowerCase().includes(query))
    )
  })
})

const pagedQuestions = computed(() =>
  filteredQuestions.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

watch([searchQuery, topicFilter, selectionFilter], () => {
  page.value = 1
})

const archivedSelectedCount = computed(() =>
  questions.value.filter((item) => item.status === 'ARCHIVED' && selectedSet.value.has(item.question_id)).length,
)

function toggle(questionId: string, value: boolean | 'indeterminate') {
  selected.value = value === true
    ? [...new Set([...selected.value, questionId])]
    : selected.value.filter((id) => id !== questionId)
}

/** Centang semua = semua soal AKTIF pada hasil filter (lintas halaman). */
const filteredActiveIds = computed(() =>
  filteredQuestions.value.filter((item) => item.status === 'ACTIVE').map((item) => item.question_id),
)

const allFilteredState = computed<boolean | 'indeterminate'>(() => {
  const count = filteredActiveIds.value.filter((id) => selectedSet.value.has(id)).length
  if (count === 0 || filteredActiveIds.value.length === 0) return false
  return count === filteredActiveIds.value.length ? true : 'indeterminate'
})

function toggleAllFiltered(value: boolean | 'indeterminate') {
  const ids = new Set(filteredActiveIds.value)
  selected.value = value === true
    ? [...new Set([...selected.value, ...ids])]
    : selected.value.filter((id) => !ids.has(id))
}

/* ---------------- Simpan ---------------- */
const formError = computed(() => {
  if (!form.packageName.trim()) return 'Nama paket wajib diisi.'
  if (selected.value.length === 0) return 'Pilih minimal satu soal.'
  if (archivedSelectedCount.value > 0) return 'Keluarkan soal yang sudah diarsipkan dari paket.'
  return ''
})

async function save() {
  if (formError.value) return
  saving.value = true

  try {
    const body = { packageName: form.packageName, description: form.description, questionIds: selected.value }
    const response = isNew.value
      ? await $fetch<{ message: string }>('/api/evaluation/packages', { method: 'POST', body, credentials: 'include' })
      : await $fetch<{ message: string }>(`/api/evaluation/packages/${encodeURIComponent(packageId.value)}`, { method: 'PUT', body, credentials: 'include' })

    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    await navigateTo(BACK_PATH)
  } catch (error) {
    toast.add({ title: 'Gagal menyimpan paket', description: getApiErrorMessage(error, 'Terjadi kesalahan. Silakan coba lagi.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    saving.value = false
  }
}

/* ---------------- Arsip / aktifkan ---------------- */
const statusModalOpen = ref(false)
const changingStatus = ref(false)

async function confirmToggleStatus() {
  if (!detail.value) return
  changingStatus.value = true

  try {
    const response = await $fetch<{ message: string }>(
      `/api/evaluation/packages/${encodeURIComponent(detail.value.package_id)}/status`,
      { method: 'PATCH', body: { status: detail.value.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' }, credentials: 'include' },
    )
    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    statusModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Gagal mengubah status', description: getApiErrorMessage(error, 'Terjadi kesalahan.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    changingStatus.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- Header: judul kiri; Kembali + status kanan -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold text-slate-900">
          {{ isNew ? 'Buat Paket Soal' : 'Ubah Paket Soal' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ isNew ? 'Pilih soal dari bank soal untuk dimasukkan ke paket.' : 'Atur nama paket dan soal di dalamnya.' }}
        </p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton :to="BACK_PATH" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <UBadge v-if="detail" :color="detail.status === 'ACTIVE' ? 'success' : 'neutral'" variant="subtle">
          {{ detail.status === 'ACTIVE' ? 'Aktif' : 'Arsip' }}
        </UBadge>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-500">Memuat data paket...</span>
    </div>

    <UAlert v-else-if="errorMessage" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <template v-else>
      <UAlert
        v-if="detail?.used"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Paket ini sudah digunakan pada evaluasi peserta"
        description="Perubahan tidak memengaruhi soal & nilai peserta yang sudah ada. Perubahan berlaku setelah perencanaan evaluasi periode diterapkan ulang."
      />

      <UCard>
        <template #header>
          <h2 class="font-semibold text-slate-900">Informasi Paket</h2>
        </template>
        <div class="grid gap-5 md:grid-cols-2">
          <UFormField label="Nama Paket" required>
            <UInput v-model="form.packageName" :maxlength="EVALUATION_LIMITS.packageName" placeholder="Contoh: Paket Evaluasi Coaching 2026" class="mt-1 w-full" />
          </UFormField>
          <UFormField label="Deskripsi" :hint="`${form.description.length}/${EVALUATION_LIMITS.packageDescription}`">
            <UInput v-model="form.description" :maxlength="EVALUATION_LIMITS.packageDescription" placeholder="Opsional" class="mt-1 w-full" />
          </UFormField>
        </div>

        <div v-if="detail" class="mt-5 border-t border-slate-100 pt-4">
          <p class="text-sm font-medium text-slate-700">Dipakai pada Periode</p>
          <div v-if="detail.periods.length" class="mt-2 space-y-2">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="period in detail.periods"
                :key="period.period_id"
                :to="`/super-admin/evaluations/plans/${period.period_id}`"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-calendar-check"
              >
                {{ period.period_name }}
              </UButton>
            </div>
            <p class="text-xs text-slate-500">
              Setelah paket diubah, buka perencanaan periode di atas lalu tekan <span class="font-medium">Terapkan Ulang</span>
              agar perubahan berlaku. Periode tersebut memakai {{ detail.required_count }} soal per peserta.
            </p>
          </div>
          <p v-else class="mt-1 text-sm text-slate-500">Belum dipakai pada perencanaan evaluasi periode mana pun.</p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="font-semibold text-slate-900">Soal dalam Paket</h2>
                <p class="mt-1 text-sm text-slate-500">
                  <span class="font-semibold text-slate-800">{{ selected.length }}</span> soal dipilih.
                  <span v-if="archivedSelectedCount" class="text-amber-600">{{ archivedSelectedCount }} di antaranya sudah diarsipkan.</span>
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 sm:flex-row">
              <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Cari teks soal..." class="w-full" />
              <USelect v-model="topicFilter" :items="topicItems" value-key="value" label-key="label" class="w-full sm:w-56" />
              <USelect v-model="selectionFilter" :items="SELECTION_FILTERS" value-key="value" label-key="label" class="w-full sm:w-44" />
            </div>
          </div>
        </template>

        <div v-if="filteredQuestions.length === 0" class="py-10 text-center">
          <UIcon name="i-lucide-library" class="mx-auto size-9 text-slate-400" />
          <p class="mt-3 font-medium text-slate-700">
            {{ availableQuestions.length === 0 ? 'Bank soal masih kosong' : 'Tidak ada soal yang sesuai' }}
          </p>
          <p class="mt-1 text-sm text-slate-500">
            {{ availableQuestions.length === 0 ? 'Tambahkan soal terlebih dahulu melalui menu Bank Soal.' : 'Coba ubah filter atau kata pencarian.' }}
          </p>
          <UButton v-if="availableQuestions.length === 0" class="mt-4" to="/super-admin/evaluations/questions" icon="i-lucide-library">
            Buka Bank Soal
          </UButton>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[560px] table-fixed text-left text-sm">
            <colgroup>
              <col class="w-14" />
              <col />
              <col class="w-[22%]" />
            </colgroup>
            <thead>
              <tr class="border-b border-blue-100">
                <th class="px-4 py-3 text-center">
                  <UCheckbox
                    :model-value="allFilteredState"
                    aria-label="Pilih semua soal pada hasil filter"
                    @update:model-value="toggleAllFiltered"
                  />
                </th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Soal</th>
                <th class="px-4 py-3 text-center font-semibold text-blue-600">Topik</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in pagedQuestions"
                :key="item.question_id"
                class="border-b border-slate-100 last:border-0"
                :class="selectedSet.has(item.question_id) ? 'bg-primary/5' : ''"
              >
                <td class="px-4 py-3 text-center">
                  <UCheckbox
                    class="inline-flex"
                    :model-value="selectedSet.has(item.question_id)"
                    :disabled="(item.status === 'ARCHIVED' && !selectedSet.has(item.question_id))"
                    :aria-label="`Pilih soal: ${item.question_text.slice(0, 60)}`"
                    @update:model-value="toggle(item.question_id, $event)"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <p class="truncate text-slate-800" :title="item.question_text">{{ item.question_text }}</p>
                    <UBadge v-if="item.status === 'ARCHIVED'" color="warning" variant="subtle" size="sm" class="shrink-0">Arsip</UBadge>
                  </div>
                </td>
                <td class="truncate px-4 py-3 text-slate-600" :title="item.topic">{{ item.topic || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-slate-500">Menampilkan {{ pagedQuestions.length }} dari {{ filteredQuestions.length }} soal.</p>
            <UPagination v-if="filteredQuestions.length > PAGE_SIZE" v-model:page="page" :total="filteredQuestions.length" :items-per-page="PAGE_SIZE" />
          </div>
        </template>
      </UCard>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <UButton
          v-if="detail"
          :color="detail.status === 'ACTIVE' ? 'error' : 'success'"
          variant="outline"
          :icon="detail.status === 'ACTIVE' ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
          @click="statusModalOpen = true"
        >
          {{ detail.status === 'ACTIVE' ? 'Arsipkan Paket' : 'Aktifkan Kembali' }}
        </UButton>
        <span v-else />

        <div class="flex items-center gap-3">
          <p v-if="formError" class="hidden text-sm text-slate-500 md:block">{{ formError }}</p>
          <UButton :to="BACK_PATH" color="neutral" variant="outline" :disabled="saving">Batal</UButton>
          <UButton icon="i-lucide-save" :loading="saving" :disabled="saving || Boolean(formError)" @click="save">Simpan Paket</UButton>
        </div>
      </div>
    </template>

    <UModal
      v-model:open="statusModalOpen"
      :dismissible="!changingStatus"
      :title="detail?.status === 'ACTIVE' ? 'Arsipkan Paket?' : 'Aktifkan Kembali Paket?'"
      :description="detail?.package_name"
    >
      <template #body>
        <p class="text-sm text-slate-600">
          {{ detail?.status === 'ACTIVE'
            ? 'Paket yang diarsipkan tidak dapat dipilih pada perencanaan evaluasi. Paket yang masih dipakai periode tidak dapat diarsipkan.'
            : 'Paket akan kembali dapat dipilih pada perencanaan evaluasi.' }}
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="outline" :disabled="changingStatus" @click="statusModalOpen = false">Batal</UButton>
          <UButton :color="detail?.status === 'ACTIVE' ? 'error' : 'success'" :loading="changingStatus" :disabled="changingStatus" @click="confirmToggleStatus">
            {{ detail?.status === 'ACTIVE' ? 'Arsipkan' : 'Aktifkan' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
