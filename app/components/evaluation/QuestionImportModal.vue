<script setup lang="ts">
import {
  QUESTION_IMPORT_MAX_FILE_BYTES,
  QUESTION_IMPORT_MAX_ROWS,
  QUESTION_IMPORT_SHEET,
  QUESTION_IMPORT_TEMPLATE_URL,
  parseQuestionImportSheet,
  questionDuplicateKey,
  type ImportRow,
} from '~~/shared/utils/evaluation-import'

/**
 * Import soal dari Excel: unduh template → pilih file → pratinjau per baris → impor.
 * File dibaca di browser (read-excel-file); server memvalidasi ulang setiap soal.
 */
const props = defineProps<{
  /** Teks soal yang sudah ada di bank soal (untuk deteksi duplikat). */
  existingTexts: string[]
}>()

const emit = defineEmits<{ imported: [] }>()
const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const reading = ref(false)
const importing = ref(false)
const fileError = ref('')
const rows = ref<ImportRow[]>([])
const skipDuplicates = ref(true)

type PreviewRow = ImportRow & { duplicate: '' | 'bank' | 'file' }

const preview = computed<PreviewRow[]>(() => {
  const existing = new Set(props.existingTexts.map(questionDuplicateKey))
  const seen = new Set<string>()

  return rows.value.map((row) => {
    if (!row.question) return { ...row, duplicate: '' }
    const key = questionDuplicateKey(row.question.questionText)
    const duplicate = existing.has(key) ? 'bank' : seen.has(key) ? 'file' : ''
    seen.add(key)
    return { ...row, duplicate }
  })
})

const validRows = computed(() => preview.value.filter((row) => row.question))
const invalidCount = computed(() => preview.value.length - validRows.value.length)
const duplicateCount = computed(() => validRows.value.filter((row) => row.duplicate).length)
const rowsToImport = computed(() =>
  validRows.value.filter((row) => !(skipDuplicates.value && row.duplicate)),
)
const tooMany = computed(() => rowsToImport.value.length > QUESTION_IMPORT_MAX_ROWS)

function resetState() {
  fileName.value = ''
  fileError.value = ''
  rows.value = []
  skipDuplicates.value = true
  if (fileInput.value) fileInput.value.value = ''
}

watch(open, (value) => {
  if (value) resetState()
})

async function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  resetState()
  fileName.value = file.name

  if (!/\.xlsx$/i.test(file.name)) {
    fileError.value = 'File harus berformat Excel .xlsx (gunakan template yang disediakan).'
    return
  }
  if (file.size > QUESTION_IMPORT_MAX_FILE_BYTES) {
    fileError.value = 'Ukuran file maksimal 2 MB.'
    return
  }

  reading.value = true

  try {
    const { readSheet } = await import('read-excel-file/browser')
    let data
    try {
      data = await readSheet(file, QUESTION_IMPORT_SHEET)
    } catch {
      // Sheet "Soal" tidak ada (mis. diganti nama) → pakai sheet pertama.
      data = await readSheet(file, 1)
    }

    const result = parseQuestionImportSheet(data)
    rows.value = result.rows
    fileError.value = result.error ?? ''
  } catch {
    fileError.value = 'File tidak dapat dibaca. Pastikan file Excel tidak rusak dan tidak terkunci kata sandi.'
  } finally {
    reading.value = false
  }
}

async function submitImport() {
  if (!rowsToImport.value.length || tooMany.value || importing.value) return
  importing.value = true

  try {
    const response = await $fetch<{ message: string }>('/api/evaluation/questions/import', {
      method: 'POST',
      credentials: 'include',
      body: { questions: rowsToImport.value.map((row) => row.question) },
    })

    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    open.value = false
    emit('imported')
  } catch (error) {
    toast.add({
      title: 'Gagal mengimpor soal',
      description: getApiErrorMessage(error, 'Terjadi kesalahan. Silakan coba lagi.'),
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="!importing"
    title="Import Soal dari Excel"
    description="Unggah file Excel sesuai template untuk menambahkan banyak soal sekaligus."
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-5">
        <!-- Langkah 1: template -->
        <div class="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex gap-3">
            <UIcon name="i-lucide-file-spreadsheet" class="mt-0.5 size-5 shrink-0 text-blue-600" />
            <div class="text-sm text-slate-700">
              <p class="font-medium text-slate-900">Gunakan template resmi</p>
              <p class="mt-1 text-slate-600">
                Isi sheet <span class="font-medium">Soal</span>: Pertanyaan, Opsi A–E (minimal A & B, berurutan),
                dan Kunci Jawaban (A–E). Petunjuk lengkap ada di sheet Petunjuk.
              </p>
            </div>
          </div>
          <UButton
            :to="QUESTION_IMPORT_TEMPLATE_URL"
            external
            download
            color="primary"
            variant="outline"
            icon="i-lucide-download"
            class="shrink-0 self-start sm:self-auto"
          >
            Unduh Template
          </UButton>
        </div>

        <!-- Langkah 2: pilih file -->
        <div class="flex flex-wrap items-center gap-3">
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="hidden"
            @change="handleFile"
          >
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-upload"
            :loading="reading"
            :disabled="importing"
            @click="fileInput?.click()"
          >
            {{ fileName ? 'Ganti File' : 'Pilih File Excel' }}
          </UButton>
          <p v-if="fileName" class="min-w-0 break-all text-sm font-medium text-green-600">{{ fileName }}</p>
          <p v-else class="text-sm text-slate-600">Format .xlsx, maksimal 2 MB, {{ QUESTION_IMPORT_MAX_ROWS }} soal per import.</p>
        </div>

        <UAlert v-if="fileError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="fileError" />

        <!-- Langkah 3: pratinjau -->
        <template v-if="preview.length">
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p class="text-2xl font-semibold text-emerald-700">{{ validRows.length }}</p>
              <p class="text-xs text-emerald-700">Valid</p>
            </div>
            <div class="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p class="text-2xl font-semibold text-rose-700">{{ invalidCount }}</p>
              <p class="text-xs text-rose-700">Tidak valid (dilewati)</p>
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p class="text-2xl font-semibold text-amber-700">{{ duplicateCount }}</p>
              <p class="text-xs text-amber-700">Duplikat</p>
            </div>
          </div>

          <UCheckbox
            v-if="duplicateCount"
            v-model="skipDuplicates"
            label="Lewati soal duplikat"
            description="Pertanyaan yang sama persis dengan soal di bank soal atau baris sebelumnya di file."
          />

          <div class="max-h-80 overflow-auto rounded-xl border border-slate-200">
            <table class="w-full table-fixed text-left text-sm">
              <colgroup>
                <col class="w-16">
                <col>
                <col class="w-20">
                <col class="w-[34%]">
              </colgroup>
              <thead class="sticky top-0 bg-white">
                <tr class="border-b border-blue-100">
                  <th class="px-3 py-2 text-center font-semibold text-blue-600">Baris</th>
                  <th class="px-3 py-2 text-center font-semibold text-blue-600">Pertanyaan</th>
                  <th class="px-3 py-2 text-center font-semibold text-blue-600">Kunci</th>
                  <th class="px-3 py-2 text-center font-semibold text-blue-600">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in preview" :key="row.rowNumber" class="border-b border-slate-200 align-top last:border-0">
                  <td class="px-3 py-2 text-center text-slate-600">{{ row.rowNumber }}</td>
                  <td class="px-3 py-2">
                    <p class="line-clamp-2 text-slate-800">{{ row.question?.questionText || '—' }}</p>
                  </td>
                  <td class="px-3 py-2 text-center font-medium text-slate-800">{{ row.question?.correctOption || '—' }}</td>
                  <td class="px-3 py-2">
                    <ul v-if="row.errors.length" class="space-y-0.5 text-xs text-rose-600">
                      <li v-for="message in row.errors" :key="message">{{ message }}</li>
                    </ul>
                    <UBadge v-else-if="row.duplicate" color="warning" variant="subtle">
                      {{ row.duplicate === 'bank' ? 'Sudah ada di bank soal' : 'Duplikat di file' }}
                    </UBadge>
                    <UBadge v-else color="success" variant="subtle">Siap diimpor</UBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-if="tooMany" class="text-sm text-rose-600">
            Jumlah soal yang akan diimpor melebihi {{ QUESTION_IMPORT_MAX_ROWS }}. Bagi file menjadi beberapa bagian.
          </p>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton color="neutral" variant="outline" :disabled="importing" @click="open = false">Batal</UButton>
        <UButton
          icon="i-lucide-file-up"
          :loading="importing"
          :disabled="importing || reading || !rowsToImport.length || tooMany"
          @click="submitImport"
        >
          Impor {{ rowsToImport.length || '' }} Soal
        </UButton>
      </div>
    </template>
  </UModal>
</template>
