<script setup lang="ts">
import {
  EVALUATION_LIMITS,
  EVALUATION_MAX_OPTIONS,
  EVALUATION_MIN_OPTIONS,
  EVALUATION_OPTION_KEYS,
} from '~~/shared/utils/evaluation'

/**
 * Bank Soal evaluasi (Super Admin): tambah, ubah, arsipkan soal pilihan ganda.
 * Soal yang sudah muncul di pengerjaan peserta terkunci (hanya bisa diarsipkan).
 */
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Bank Soal' })

type Question = {
  question_id: string
  topic: string
  question_text: string
  options: { key: string, text: string }[]
  correct_option: string
  status: 'ACTIVE' | 'ARCHIVED'
  used: boolean
  package_count: number
  updated_at: string
}

const toast = useToast()
const loading = ref(true)
const errorMessage = ref('')
const questions = ref<Question[]>([])

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: Question[] }>('/api/evaluation/questions', { credentials: 'include' })
    questions.value = response.data
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Bank soal belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------------- Filter & paginasi ---------------- */
const searchQuery = ref('')
const topicFilter = ref('ALL')
const statusFilter = ref('ACTIVE')

const STATUS_FILTERS = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'ARCHIVED', label: 'Diarsipkan' },
  { value: 'ALL', label: 'Semua Status' },
]

const topics = computed(() =>
  [...new Set(questions.value.map((item) => item.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')),
)

const topicItems = computed(() => [
  { value: 'ALL', label: 'Semua Topik' },
  { value: '__NONE__', label: 'Tanpa Topik' },
  ...topics.value.map((topic) => ({ value: topic, label: topic })),
])

const filteredQuestions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return questions.value.filter((item) => {
    const matchesStatus = statusFilter.value === 'ALL' || item.status === statusFilter.value
    const matchesTopic =
      topicFilter.value === 'ALL' ||
      (topicFilter.value === '__NONE__' ? !item.topic : item.topic === topicFilter.value)
    const matchesQuery =
      !query ||
      item.question_text.toLowerCase().includes(query) ||
      item.options.some((option) => option.text.toLowerCase().includes(query))

    return matchesStatus && matchesTopic && matchesQuery
  })
})

const { page, pageSize, items: pagedQuestions, reset: resetPage } = useTablePagination(filteredQuestions)

watch([searchQuery, topicFilter, statusFilter], resetPage)


/* ---------------- Modal soal ---------------- */
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<Question | null>(null)

const form = reactive({
  topic: '',
  questionText: '',
  options: ['', '', '', ''] as string[],
  correctOption: '' as string,
})

function openCreate() {
  editing.value = null
  form.topic = topicFilter.value !== 'ALL' && topicFilter.value !== '__NONE__' ? topicFilter.value : ''
  form.questionText = ''
  form.options = ['', '', '', '']
  form.correctOption = ''
  modalOpen.value = true
}

function openEdit(question: Question) {
  editing.value = question
  form.topic = question.topic
  form.questionText = question.question_text
  form.options = question.options.map((option) => option.text)
  form.correctOption = question.correct_option
  modalOpen.value = true
}

function addOption() {
  if (form.options.length < EVALUATION_MAX_OPTIONS) form.options.push('')
}

function removeOption(index: number) {
  if (form.options.length <= EVALUATION_MIN_OPTIONS) return

  const removedKey = EVALUATION_OPTION_KEYS[index]
  const correctIndex = EVALUATION_OPTION_KEYS.indexOf(form.correctOption as never)
  form.options.splice(index, 1)

  // Kunci ikut bergeser bila opsi di atasnya dihapus.
  if (form.correctOption === removedKey) form.correctOption = ''
  else if (correctIndex > index) form.correctOption = EVALUATION_OPTION_KEYS[correctIndex - 1] ?? ''
}

const formError = computed(() => {
  if (!form.questionText.trim()) return 'Teks soal wajib diisi.'
  if (form.options.some((option) => !option.trim())) return 'Semua opsi jawaban wajib diisi.'
  const lowered = form.options.map((option) => option.trim().toLowerCase())
  if (new Set(lowered).size !== lowered.length) return 'Isi opsi jawaban tidak boleh sama.'
  if (!form.correctOption) return 'Pilih jawaban yang benar.'
  return ''
})

async function saveQuestion() {
  if (formError.value) return
  saving.value = true

  try {
    const body = {
      topic: form.topic,
      questionText: form.questionText,
      options: form.options,
      correctOption: form.correctOption,
    }

    const response = editing.value
      ? await $fetch<{ message: string }>(`/api/evaluation/questions/${encodeURIComponent(editing.value.question_id)}`, {
          method: 'PUT', body, credentials: 'include',
        })
      : await $fetch<{ message: string }>('/api/evaluation/questions', { method: 'POST', body, credentials: 'include' })

    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    modalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Gagal menyimpan soal', description: getApiErrorMessage(error, 'Terjadi kesalahan. Silakan coba lagi.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    saving.value = false
  }
}

/* ---------------- Import Excel ---------------- */
const importOpen = ref(false)

/* ---------------- Arsip / aktifkan ---------------- */
const statusTarget = ref<Question | null>(null)
const statusModalOpen = ref(false)
const changingStatus = ref(false)

function askToggleStatus(question: Question) {
  statusTarget.value = question
  statusModalOpen.value = true
}

async function confirmToggleStatus() {
  const target = statusTarget.value
  if (!target) return
  changingStatus.value = true

  try {
    const response = await $fetch<{ message: string }>(
      `/api/evaluation/questions/${encodeURIComponent(target.question_id)}/status`,
      { method: 'PATCH', body: { status: target.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' }, credentials: 'include' },
    )
    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    statusModalOpen.value = false
    modalOpen.value = false
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
    <section class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight text-blue-500 sm:text-3xl">Bank Soal</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Kumpulan soal pilihan ganda evaluasi. Soal aktif dapat disusun menjadi paket soal.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton color="primary" variant="outline" icon="i-lucide-file-spreadsheet" @click="importOpen = true">
          Import Excel
        </UButton>
        <UButton icon="i-lucide-plus" @click="openCreate">Tambah Soal</UButton>
      </div>
    </section>

    <div v-if="loading && questions.length === 0" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat bank soal...</span>
    </div>

    <UAlert v-else-if="errorMessage" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <UCard v-else>
      <template #header>
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 class="font-semibold text-slate-900">Daftar Soal</h2>
            <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" size="sm" :loading="loading" class="self-start" @click="load">
              Muat Ulang
            </UButton>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 sm:flex-row">
            <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Cari teks soal atau opsi..." class="w-full" />
            <USelect v-model="topicFilter" :items="topicItems" value-key="value" label-key="label" class="w-full sm:w-56" />
            <USelect v-model="statusFilter" :items="STATUS_FILTERS" value-key="value" label-key="label" class="w-full sm:w-44" />
          </div>
        </div>
      </template>

      <div v-if="filteredQuestions.length === 0" class="py-10 text-center">
        <UIcon name="i-lucide-library" class="mx-auto size-9 text-slate-500" />
        <p class="mt-3 font-medium text-slate-700">
          {{ questions.length === 0 ? 'Belum Ada Soal' : 'Tidak ada soal yang sesuai' }}
        </p>
        <p class="mt-1 text-sm text-slate-600">
          {{ questions.length === 0 ? 'Tambahkan soal pertama untuk mulai menyusun bank soal.' : 'Coba ubah filter atau kata pencarian.' }}
        </p>
        <UButton v-if="questions.length === 0" class="mt-4" icon="i-lucide-plus" @click="openCreate">Tambah Soal</UButton>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] table-fixed text-left text-sm">
          <colgroup>
            <col />
            <col class="w-[20%]" />
            <col class="w-28" />
            <col class="w-20" />
          </colgroup>
          <thead>
            <tr class="border-b border-blue-100">
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Soal</th>
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Topik</th>
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Status</th>
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pagedQuestions" :key="item.question_id" class="border-b border-slate-200 last:border-0">
              <td class="px-4 py-3">
                <p class="truncate font-medium text-slate-800" :title="item.question_text">{{ item.question_text }}</p>
              </td>
              <td class="truncate px-4 py-3 text-slate-600" :title="item.topic">{{ item.topic || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <UBadge :color="item.status === 'ACTIVE' ? 'success' : 'neutral'" variant="subtle">
                  {{ item.status === 'ACTIVE' ? 'Aktif' : 'Arsip' }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-center">
                <UButton
                  icon="i-lucide-pencil"
                  color="primary"
                  variant="solid"
                  square
                  size="md"
                  aria-label="Ubah soal"
                  title="Ubah soal"
                  @click="openEdit(item)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="filteredQuestions.length" label="soal" />
      </template>
    </UCard>

    <!-- Modal tambah / ubah soal -->
    <UModal
      v-model:open="modalOpen"
      :dismissible="!saving"
      :title="editing ? 'Ubah Soal' : 'Tambah Soal'"
      description="Soal pilihan ganda dengan 2–5 opsi jawaban."
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #body>
        <div class="space-y-5">
          <UAlert
            v-if="editing?.used"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="Soal ini sudah digunakan pada evaluasi peserta"
            description="Perubahan tidak memengaruhi soal & nilai peserta yang sudah ada. Perubahan berlaku untuk peserta berikutnya setelah perencanaan evaluasi periode diterapkan ulang."
          />

          <UFormField label="Topik" description="Opsional, untuk memudahkan pencarian saat menyusun paket.">
            <UInput v-model="form.topic" :maxlength="EVALUATION_LIMITS.topic" placeholder="Contoh: Prinsip Coaching" class="mt-1 w-full" />
          </UFormField>

          <UFormField label="Teks Soal" required :hint="`${form.questionText.length}/${EVALUATION_LIMITS.questionText}`">
            <UTextarea v-model="form.questionText" :rows="4" autoresize :maxlength="EVALUATION_LIMITS.questionText" class="mt-1 w-full" />
          </UFormField>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-slate-700">Opsi Jawaban <span class="text-red-500">*</span></p>
              <p class="text-xs text-slate-600">Klik huruf untuk menandai jawaban benar.</p>
            </div>

            <div v-for="(_, index) in form.options" :key="index" class="flex items-center gap-2">
              <button
                type="button"
                class="flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition"
                :class="form.correctOption === EVALUATION_OPTION_KEYS[index]
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400'"
                :aria-label="`Tandai opsi ${EVALUATION_OPTION_KEYS[index]} sebagai jawaban benar`"
                :aria-pressed="form.correctOption === EVALUATION_OPTION_KEYS[index]"
                @click="form.correctOption = EVALUATION_OPTION_KEYS[index] ?? ''"
              >
                {{ EVALUATION_OPTION_KEYS[index] }}
              </button>
              <UInput
                v-model="form.options[index]"
                :maxlength="EVALUATION_LIMITS.optionText"
                :placeholder="`Isi opsi ${EVALUATION_OPTION_KEYS[index]}`"
                class="w-full"
              />
              <UButton
                color="neutral"
                variant="ghost"
                square
                icon="i-lucide-trash-2"
                :disabled="form.options.length <= EVALUATION_MIN_OPTIONS"
                :aria-label="`Hapus opsi ${EVALUATION_OPTION_KEYS[index]}`"
                @click="removeOption(index)"
              />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
              <UButton
                v-if="form.options.length < EVALUATION_MAX_OPTIONS"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-plus"
                @click="addOption"
              >
                Tambah Opsi
              </UButton>
              <p v-if="form.correctOption" class="text-xs font-medium text-emerald-700">
                Jawaban benar: {{ form.correctOption }}
              </p>
            </div>
          </div>

          <p v-if="formError" class="text-sm text-slate-600">{{ formError }}</p>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <UButton
            v-if="editing"
            :color="editing.status === 'ACTIVE' ? 'error' : 'success'"
            variant="outline"
            :icon="editing.status === 'ACTIVE' ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
            :disabled="saving"
            @click="askToggleStatus(editing)"
          >
            {{ editing.status === 'ACTIVE' ? 'Arsipkan' : 'Aktifkan Kembali' }}
          </UButton>
          <span v-else />

          <div class="flex gap-3">
            <UButton color="neutral" variant="outline" :disabled="saving" @click="modalOpen = false">
              Batal
            </UButton>
            <UButton icon="i-lucide-save" :loading="saving" :disabled="saving || Boolean(formError)" @click="saveQuestion">
              Simpan Soal
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Import soal dari Excel -->
    <EvaluationQuestionImportModal
      v-model:open="importOpen"
      :existing-texts="questions.map((item) => item.question_text)"
      @imported="load"
    />

    <!-- Konfirmasi arsip / aktifkan -->
    <UModal
      v-model:open="statusModalOpen"
      :dismissible="!changingStatus"
      :title="statusTarget?.status === 'ACTIVE' ? 'Arsipkan Soal?' : 'Aktifkan Kembali Soal?'"
    >
      <template #body>
        <div class="space-y-3 text-sm text-slate-600">
          <p class="line-clamp-3 rounded-lg bg-slate-50 p-3 text-slate-700">{{ statusTarget?.question_text }}</p>
          <p v-if="statusTarget?.status === 'ACTIVE'">
            Soal yang diarsipkan tidak akan diberikan kepada peserta berikutnya dan tidak dapat ditambahkan ke paket.
            Riwayat jawaban peserta yang sudah mengerjakan tetap tersimpan.
          </p>
          <p v-else>Soal akan kembali dapat dipakai dalam paket soal.</p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="outline" :disabled="changingStatus" @click="statusModalOpen = false">Batal</UButton>
          <UButton
            :color="statusTarget?.status === 'ACTIVE' ? 'error' : 'success'"
            :loading="changingStatus"
            :disabled="changingStatus"
            @click="confirmToggleStatus"
          >
            {{ statusTarget?.status === 'ACTIVE' ? 'Arsipkan' : 'Aktifkan' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
