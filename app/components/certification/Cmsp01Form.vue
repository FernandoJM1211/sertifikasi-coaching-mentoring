<script setup lang="ts">
import { computed, ref } from 'vue'
import { GENDER_OPTIONS, normalizeGender } from '~~/shared/utils/person'
import {
  getApplicationDocumentIcon,
  getApplicationDocumentLabel,
} from '~~/shared/utils/documents'
import {
  SELF_ASSESSMENT_UPLOAD_ACCEPT,
  type SelfAssessmentUploadPurpose,
} from '~~/shared/utils/self-assessment'
import {
  useSelfAssessmentFiles,
  type SelfAssessmentFile,
} from '~/composables/useSelfAssessmentFiles'

/* ========================================
 * PROPS (data awal dari server)
 * ======================================== */

type Applicant = {
  fullName: string
  nip: string
  rankName: string
  rankGroup: string
  birthPlace: string
  birthDate: string
  gender: string
  latestEducation: string
  educationQualification: string
  position: string
  workUnit: string
  institution: string
  phoneNumber: string
  email: string
  domicileAddress: string
}

type Training = { trainingName: string, organizer: string, year: string, jp: string }
type Practice = { year: string, coacheeMentee: string, topic: string, duration: string }
type DocumentItem = { documentType: string, file: SelfAssessmentFile | null }

export type Cmsp01Initial = {
  certification: { type_name: string, category_name: string, period_name: string }
  /** Data profil; hanya dipakai jika draft belum pernah disimpan. */
  profile: {
    full_name: string
    nip: string
    email: string
    gender: string
    birth_place: string
    birth_date: string
    institution_name: string
    phone_number: string
    education_level: string
    position_name: string
  } | null
  cmsp01: {
    applicant: Applicant | null
    trainings: Training[]
    practices: Practice[]
    documents: DocumentItem[]
    declarationAccepted: boolean
  }
}

const props = defineProps<{
  applicationId: string
  initial: Cmsp01Initial
  readonly: boolean
  /** Tampilan ringkas untuk Verifikator/Super Admin: sembunyikan panduan pengisian. */
  reviewMode?: boolean
  /** Endpoint preview berkas selain milik peserta (mis. halaman Verifikator). */
  filesBasePath?: string
  /** Status gabungan self assessment, mis. NEW/DRAFT/SUBMITTED. */
  status: string
}>()

const genderItems: string[] = [...GENDER_OPTIONS]

const { upload, previewUrl } = useSelfAssessmentFiles(() => props.applicationId, () => props.filesBasePath)

/* ========================================
 * INFORMASI SERTIFIKASI
 * ======================================== */

const certificationName = computed(
  () => props.initial.certification.type_name || 'Coach dan Mentor Sektor Publik',
)
const activeCategory = computed(() => props.initial.certification.category_name || '-')
const certificationPeriod = computed(() => props.initial.certification.period_name || '-')

const rankNameOptions = [
  'Penata',
  'Penata Tingkat I',
  'Pembina',
  'Pembina Tingkat I',
  'Pembina Utama Muda',
  'Pembina Utama Madya',
  'Pembina Utama',
]

const rankGroupOptions = [
  'III/c',
  'III/d',
  'IV/a',
  'IV/b',
  'IV/c',
  'IV/d',
  'IV/e',
]

/* ========================================
 * DATA PEMOHON
 * ======================================== */

const emptyApplicant = (): Applicant => ({
  fullName: '',
  nip: '',
  rankName: '',
  rankGroup: '',
  birthPlace: '',
  birthDate: '',
  gender: '',
  latestEducation: '',
  educationQualification: '',
  position: '',
  workUnit: '',
  institution: '',
  phoneNumber: '',
  email: '',
  domicileAddress: '',
})

/**
 * Jika draft sudah pernah disimpan, isian draft dipakai apa adanya.
 * Jika belum, form diisi dari Profil (disalin, bukan ditautkan).
 */
function buildInitialApplicant(): Applicant {
  const saved = props.initial.cmsp01.applicant

  if (saved) {
    return { ...emptyApplicant(), ...saved, gender: normalizeGender(saved.gender) }
  }

  const profile = props.initial.profile

  return {
    ...emptyApplicant(),
    fullName: profile?.full_name ?? '',
    nip: profile?.nip ?? '',
    gender: normalizeGender(profile?.gender),
    birthPlace: profile?.birth_place ?? '',
    birthDate: profile?.birth_date ?? '',
    latestEducation: profile?.education_level ?? '',
    position: profile?.position_name ?? '',
    institution: profile?.institution_name ?? '',
    phoneNumber: profile?.phone_number ?? '',
    email: profile?.email ?? '',
  }
}

const applicant = ref<Applicant>(buildInitialApplicant())

const declarationAccepted = ref(props.initial.cmsp01.declarationAccepted)

/* ========================================
 * RIWAYAT PELATIHAN
 * ======================================== */

const emptyTraining = (): Training => ({ trainingName: '', organizer: '', year: '', jp: '' })

const trainingHistories = ref<Training[]>(
  props.initial.cmsp01.trainings.length > 0
    ? props.initial.cmsp01.trainings.map((item) => ({ ...item }))
    : [emptyTraining()],
)

// Item baru ditaruh paling atas (sama seperti evidence CMSP-02).
function addTraining() {
  trainingHistories.value.unshift(emptyTraining())
}

function removeTraining(index: number) {
  if (trainingHistories.value.length === 1) return

  trainingHistories.value.splice(index, 1)
}

/* ========================================
 * PENGALAMAN PRAKTIK
 * ======================================== */

const emptyPractice = (): Practice => ({ year: '', coacheeMentee: '', topic: '', duration: '' })

const practiceExperiences = ref<Practice[]>(
  props.initial.cmsp01.practices.length > 0
    ? props.initial.cmsp01.practices.map((item) => ({ ...item }))
    : [emptyPractice()],
)

function addPractice() {
  practiceExperiences.value.unshift(emptyPractice())
}

/** Key stabil untuk v-for (item bisa ditambah di atas / dihapus) tanpa ikut ke payload. */
const itemKeys = new WeakMap<object, number>()
let nextItemKey = 0

function itemKey(item: object) {
  if (!itemKeys.has(item)) itemKeys.set(item, nextItemKey++)
  return itemKeys.get(item)!
}

function removePractice(index: number) {
  if (practiceExperiences.value.length === 1) return

  practiceExperiences.value.splice(index, 1)
}

/* ========================================
 * DOKUMEN ADMINISTRASI
 * ======================================== */

// 4 dokumen dari pendaftaran + KTP + Surat Tugas. Mengganti dokumen di
// sini hanya mengubah data CMSP-01, tidak mengubah dokumen pendaftaran.
const documents = ref<DocumentItem[]>(
  props.initial.cmsp01.documents.map((item) => ({ ...item })),
)

const uploadingDocumentType = ref<string | null>(null)

async function handleDocumentChange(event: Event, document: DocumentItem) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) return

  uploadingDocumentType.value = document.documentType

  try {
    const uploaded = await upload(document.documentType as SelfAssessmentUploadPurpose, file)

    if (uploaded) {
      document.file = uploaded
    }
  } finally {
    uploadingDocumentType.value = null
  }
}

function documentAccept(documentType: string) {
  return SELF_ASSESSMENT_UPLOAD_ACCEPT[documentType as SelfAssessmentUploadPurpose] ?? '.pdf'
}

function documentHint(documentType: string) {
  return documentType === 'KTP' || documentType === 'SURAT_TUGAS'
    ? 'PDF, JPG, atau PNG. Maksimal 4 MB.'
    : 'PDF. Maksimal 4 MB.'
}

const previewOpen = ref(false)
const previewDocument = ref<DocumentItem | null>(null)

const documentPreviewUrl = computed(() =>
  previewDocument.value?.file ? previewUrl(previewDocument.value.file.file_id) : '',
)

function openPreview(document: DocumentItem) {
  previewDocument.value = document
  previewOpen.value = true
}

/* ========================================
 * PROGRESS CMSP.01
 * ======================================== */

const isFilled = (value: unknown) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== ''

const isValidNip = (value: unknown) =>
  /^[0-9]{18}$/.test(String(value ?? '').trim())

const isValidEmail = (value: unknown) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())

const isValidPhoneNumber = (value: unknown) => {
  const normalized = String(value ?? '').trim().replace(/[\s()-]/g, '')

  return /^\+?[0-9]{8,15}$/.test(normalized)
}

const isValidYear = (value: unknown) => {
  const normalized = String(value ?? '').trim()
  const year = Number(normalized)

  return /^\d{4}$/.test(normalized) && year >= 1900 && year <= 2100
}

const isValidPositiveInteger = (value: unknown) =>
  /^[1-9][0-9]*$/.test(String(value ?? '').trim())

const getFieldError = (
  value: unknown,
  validator: (value: unknown) => boolean,
  message: string,
) => {
  if (!isFilled(value)) return ''

  return validator(value) ? '' : message
}

const APPLICANT_FIELD_COUNT = Object.keys(emptyApplicant()).length

const applicantCompletedCount = computed(() => {
  const { nip, phoneNumber, email, ...basicFields } = applicant.value

  return (
    Object.values(basicFields).filter(isFilled).length +
    (isValidNip(nip) ? 1 : 0) +
    (isValidPhoneNumber(phoneNumber) ? 1 : 0) +
    (isValidEmail(email) ? 1 : 0)
  )
})

const trainingCompletedCount = computed(() =>
  trainingHistories.value.reduce((total, training) =>
    total +
    [
      isFilled(training.trainingName),
      isFilled(training.organizer),
      isValidYear(training.year),
      isValidPositiveInteger(training.jp),
    ].filter(Boolean).length,
  0),
)

const practiceCompletedCount = computed(() =>
  practiceExperiences.value.reduce((total, practice) =>
    total +
    [
      isValidYear(practice.year),
      isFilled(practice.coacheeMentee),
      isFilled(practice.topic),
      isValidPositiveInteger(practice.duration),
    ].filter(Boolean).length,
  0),
)

const documentCompletedCount = computed(() =>
  documents.value.filter((document) => document.file).length,
)

const totalRequirementCount = computed(() =>
  APPLICANT_FIELD_COUNT +
  trainingHistories.value.length * 4 +
  practiceExperiences.value.length * 4 +
  documents.value.length,
)

const totalCompletedCount = computed(() =>
  applicantCompletedCount.value +
  trainingCompletedCount.value +
  practiceCompletedCount.value +
  documentCompletedCount.value,
)

const applicantProgress = computed(() =>
  totalRequirementCount.value === 0
    ? 0
    : Math.round(
        (totalCompletedCount.value / totalRequirementCount.value) * 100,
      ),
)

const remainingCount = computed(() =>
  Math.max(totalRequirementCount.value - totalCompletedCount.value, 0),
)

const remainingLabel = computed(() =>
  remainingCount.value === 0 ? 'Lengkap' : `${remainingCount.value} isian lagi`,
)

const isApplicantComplete = computed(
  () => applicantCompletedCount.value === APPLICANT_FIELD_COUNT,
)

const isTrainingComplete = (training: Training) =>
  isFilled(training.trainingName) &&
  isFilled(training.organizer) &&
  isValidYear(training.year) &&
  isValidPositiveInteger(training.jp)

const isPracticeComplete = (practice: Practice) =>
  isValidYear(practice.year) &&
  isFilled(practice.coacheeMentee) &&
  isFilled(practice.topic) &&
  isValidPositiveInteger(practice.duration)

const completedTrainingCount = computed(() => trainingHistories.value.filter(isTrainingComplete).length)
const completedPracticeCount = computed(() => practiceExperiences.value.filter(isPracticeComplete).length)

const isTrainingSectionComplete = computed(() => completedTrainingCount.value === trainingHistories.value.length)
const isPracticeSectionComplete = computed(() => completedPracticeCount.value === practiceExperiences.value.length)
const isDocumentSectionComplete = computed(() => documentCompletedCount.value === documents.value.length)

/**
 * Semua nilai isian dikirim sebagai teks. Input type="number" mengubah nilai
 * v-model menjadi number, jadi dinormalkan di sini.
 */
function toTextRecord<T extends Record<string, unknown>>(item: T): Record<keyof T, string> {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, value === null || value === undefined ? '' : String(value)]),
  ) as Record<keyof T, string>
}

/** Data yang dikirim saat Simpan Draft (lihat server/services/self-assessment.service.ts). */
const payload = computed(() => ({
  applicant: toTextRecord(applicant.value),
  trainings: trainingHistories.value.map(toTextRecord),
  practices: practiceExperiences.value.map(toTextRecord),
  documents: documents.value.map((item) => ({
    documentType: item.documentType,
    fileId: item.file?.file_id ?? '',
  })),
  declarationAccepted: declarationAccepted.value,
}))

defineExpose({
  progress: applicantProgress,
  declarationAccepted,
  payload,
})
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-8">

    <!-- ========================================
         PAGE HEADER
         ======================================== -->

    <section>
      <div class="flex items-start justify-between gap-5">
        <div class="min-w-0">
          <p class="text-sm font-medium text-primary">
            CMSP.01
          </p>

          <h1
            class="mt-1.5 text-3xl font-semibold tracking-tight text-blue-500"
          >
            Permohonan Sertifikasi
          </h1>

          <p v-if="!reviewMode" class="mt-2 text-sm leading-6 text-slate-600">
            Lengkapi data pemohon, pengalaman coaching dan mentoring,
            serta persyaratan administrasi.
          </p>
        </div>

        <CertificationSelfAssessmentStatusBadge :status="status" class="mt-1" />
      </div>

      <div v-if="!reviewMode" class="mt-5">
        <div class="flex items-center justify-between gap-3 text-xs">
          <span class="font-medium text-slate-600">Kelengkapan CMSP-01</span>
          <span class="whitespace-nowrap font-semibold text-slate-900">
            {{ applicantProgress }}% · {{ remainingLabel }}
          </span>
        </div>
        <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            class="h-full rounded-full transition-all"
            :class="applicantProgress === 100 ? 'bg-success' : 'bg-primary'"
            :style="{ width: `${applicantProgress}%` }"
          />
        </div>
      </div>
    </section>

    <!-- ========================================
         1. INFORMASI SERTIFIKASI
         ======================================== -->

    <section class="space-y-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">
          1. Informasi Sertifikasi
        </h2>

        <p v-if="!reviewMode" class="mt-1 text-sm text-slate-600">
          Informasi mengikuti kategori dan periode sertifikasi
          yang sedang aktif.
        </p>
      </div>

      <UCard class="border border-primary/30 bg-white/90 shadow-sm">
        <div class="space-y-5">
          <div>
            <p class="text-sm font-medium text-primary">
              Nama Sertifikasi
            </p>
            <p class="mt-1.5 text-base font-semibold text-slate-900">
              {{ certificationName }}
            </p>
          </div>

          <div>
            <p class="text-sm font-medium text-primary">
              Kategori
            </p>
            <p class="mt-1.5 text-base font-semibold text-slate-900">
              {{ activeCategory }}
            </p>
          </div>

          <div>
            <p class="text-sm font-medium text-primary">
              Periode
            </p>
            <p class="mt-1.5 text-base font-semibold text-slate-900">
              {{ certificationPeriod }}
            </p>
          </div>
        </div>
      </UCard>
    </section>

    <fieldset :disabled="readonly" class="min-w-0 space-y-8">

    <!-- ========================================
         2. DATA PEMOHON
         ======================================== -->

    <section class="space-y-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">
          2. Data Pemohon Sertifikasi
        </h2>

        <p v-if="!reviewMode" class="mt-1 text-sm text-slate-600">
          Lengkapi data diri sesuai identitas dan kondisi saat ini.
        </p>
      </div>

      <UCard class="border border-primary/30 bg-white/90 shadow-sm">

        <div v-if="!reviewMode" class="mb-5 flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-primary">
            Data Pemohon
            <span class="font-normal text-slate-600">
              ({{ applicantCompletedCount }} dari {{ APPLICANT_FIELD_COUNT }} terisi)
            </span>
          </p>

          <UBadge
            :label="isApplicantComplete ? 'Lengkap' : 'Belum lengkap'"
            :color="isApplicantComplete ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
            class="shrink-0"
          />
        </div>

        <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <UFormField label="Nama Lengkap" required class="min-w-0">
            <UInput
              v-model="applicant.fullName"
              placeholder="Masukkan nama lengkap"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="NIP"
            required
            class="min-w-0"
            :error="getFieldError(applicant.nip, isValidNip, 'NIP harus terdiri dari 18 digit angka.') || undefined"
          >
            <UInput
              v-model="applicant.nip"
              inputmode="numeric"
              maxlength="18"
              placeholder="Masukkan 18 digit NIP"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Pangkat" required class="min-w-0">
            <USelect
              v-model="applicant.rankName"
              :items="rankNameOptions"
              placeholder="Pilih pangkat"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Golongan Ruang" required class="min-w-0">
            <USelect
              v-model="applicant.rankGroup"
              :items="rankGroupOptions"
              placeholder="Pilih golongan ruang"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Tempat Lahir" required class="min-w-0">
            <UInput
              v-model="applicant.birthPlace"
              placeholder="Masukkan tempat lahir"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Tanggal Lahir" required class="min-w-0">
            <UInput
              v-model="applicant.birthDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Jenis Kelamin" required class="min-w-0">
            <USelect
              v-model="applicant.gender"
              :items="genderItems"
              placeholder="Pilih jenis kelamin"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Nomor Telepon"
            required
            class="min-w-0"
            :error="getFieldError(applicant.phoneNumber, isValidPhoneNumber, 'Nomor telepon harus berupa 8–15 digit angka.') || undefined"
          >
            <UInput
              v-model="applicant.phoneNumber"
              type="tel"
              inputmode="tel"
              placeholder="Contoh: 081234567890"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="E-mail"
            required
            class="min-w-0"
            :error="getFieldError(applicant.email, isValidEmail, 'Gunakan format e-mail yang benar, misalnya nama@email.com.') || undefined"
          >
            <UInput
              v-model="applicant.email"
              type="email"
              placeholder="nama@email.com"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Instansi" required class="min-w-0">
            <UInput
              v-model="applicant.institution"
              placeholder="Masukkan instansi"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Unit Kerja" required class="min-w-0">
            <UInput
              v-model="applicant.workUnit"
              placeholder="Masukkan unit kerja"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Jabatan" required class="min-w-0">
            <UInput
              v-model="applicant.position"
              placeholder="Masukkan jabatan"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Pendidikan Terakhir" required class="min-w-0">
            <UInput
              v-model="applicant.latestEducation"
              placeholder="Contoh: S1 Ilmu Komputer"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Kualifikasi Pendidikan" required class="min-w-0">
            <UInput
              v-model="applicant.educationQualification"
              placeholder="Masukkan kualifikasi pendidikan"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Alamat Domisili" required class="min-w-0 sm:col-span-2">
            <UTextarea
              v-model="applicant.domicileAddress"
              :rows="3"
              placeholder="Masukkan alamat domisili"
              class="w-full"
            />
          </UFormField>
        </div>

      </UCard>
    </section>

    <!-- ========================================
     3. RIWAYAT PELATIHAN
     ======================================== -->

<section class="space-y-3">

  <!-- Header -->
  <div class="flex items-end justify-between gap-4">
    <div class="min-w-0">
      <h2 class="text-lg font-semibold text-slate-900">
        3. Riwayat Pelatihan Coaching dan Mentoring
      </h2>

      <p v-if="!reviewMode" class="mt-1 text-sm text-slate-600">
        Minimal satu riwayat pelatihan wajib diisi. Tambahkan riwayat sesuai kebutuhan.
      </p>
    </div>

    <!-- Button -->
    <div v-if="!readonly" class="shrink-0">
      <UButton
        label="Tambah Riwayat"
        icon="i-lucide-plus"
        variant="outline"
        size="sm"
        @click="addTraining"
      />
    </div>
  </div>

  <!-- Card -->
  <UCard class="border border-primary/30 bg-white/90 shadow-sm">
    <div v-if="!reviewMode" class="mb-5 flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-primary">
        Riwayat Pelatihan
        <span class="font-normal text-slate-600">
          ({{ completedTrainingCount }} dari {{ trainingHistories.length }} lengkap)
        </span>
      </p>

      <UBadge
        :label="isTrainingSectionComplete ? 'Lengkap' : 'Belum lengkap'"
        :color="isTrainingSectionComplete ? 'success' : 'neutral'"
        variant="subtle"
        size="sm"
        class="shrink-0"
      />
    </div>
    <div class="space-y-4">

      <div
  v-for="(training, index) in trainingHistories"
  :key="itemKey(training)"
  class="rounded-xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-primary/30"
>

        <!-- Item Header -->
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <p class="text-sm font-semibold text-slate-900">
              Riwayat {{ trainingHistories.length - index }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">

          <UButton
            v-if="!readonly && trainingHistories.length > 1"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            square
            size="sm"
            aria-label="Hapus riwayat"
            @click="removeTraining(index)"
          />
          </div>
        </div>

        <!-- 2 Kolom -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-5">

          <!-- Nama Pelatihan -->
          <UFormField label="Nama Pelatihan" required>
            <UInput
              v-model="training.trainingName"
              required
              placeholder="Nama pelatihan"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Penyelenggara -->
          <UFormField label="Penyelenggara" required>
            <UInput
              v-model="training.organizer"
              required
              placeholder="Nama penyelenggara"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Tahun -->
          <UFormField label="Tahun" required>
            <UInput
              v-model="training.year"
              required
              type="number"
              inputmode="numeric"
              min="1900"
              max="2100"
              step="1"
              placeholder="Contoh: 2025"
              class="w-full my-2"
            />

            <p
              v-if="getFieldError(training.year, isValidYear, 'Tahun harus berupa 4 digit angka (1900–2100).')"
              class="mb-2 block text-xs font-medium cms-validation-error"
            >
              Tahun harus berupa 4 digit angka (1900–2100).
            </p>
          </UFormField>

          <!-- Jumlah JP -->
          <UFormField label="Jumlah JP" required>
            <UInput
              v-model="training.jp"
              required
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              placeholder="Contoh: 24"
              class="w-full my-2"
            />

            <p
              v-if="getFieldError(training.jp, isValidPositiveInteger, 'Jumlah JP harus berupa angka bulat lebih dari 0.')"
              class="mb-2 block text-xs font-medium cms-validation-error"
            >
              Jumlah JP harus berupa angka bulat lebih dari 0.
            </p>
          </UFormField>

        </div>
      </div>

    </div>
  </UCard>
</section>

    <!-- ========================================
     4. PENGALAMAN PRAKTIK
     ======================================== -->

<section class="space-y-3">

  <!-- Header -->
  <div class="flex items-end justify-between gap-4">
    <div class="min-w-0">
      <h2 class="text-lg font-semibold text-slate-900">
        4. Pengalaman Praktik Coaching dan Mentoring
      </h2>

      <p v-if="!reviewMode" class="mt-1 text-sm text-slate-600">
        Minimal satu pengalaman praktik wajib diisi. Tambahkan pengalaman sesuai kebutuhan.
      </p>
    </div>

    <!-- Button -->
    <div v-if="!readonly" class="shrink-0">
      <UButton
        label="Tambah Pengalaman"
        icon="i-lucide-plus"
        variant="outline"
        size="sm"
        @click="addPractice"
      />
    </div>
  </div>

  <!-- Card -->
  <UCard class="border border-primary/30 bg-white/90 shadow-sm">
    <div v-if="!reviewMode" class="mb-5 flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-primary">
        Pengalaman Praktik
        <span class="font-normal text-slate-600">
          ({{ completedPracticeCount }} dari {{ practiceExperiences.length }} lengkap)
        </span>
      </p>

      <UBadge
        :label="isPracticeSectionComplete ? 'Lengkap' : 'Belum lengkap'"
        :color="isPracticeSectionComplete ? 'success' : 'neutral'"
        variant="subtle"
        size="sm"
        class="shrink-0"
      />
    </div>
    <div class="space-y-4">

      <div
  v-for="(practice, index) in practiceExperiences"
  :key="itemKey(practice)"
  class="rounded-xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-primary/30"
>

        <!-- Item Header -->
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <p class="text-sm font-semibold text-slate-900">
              Pengalaman {{ practiceExperiences.length - index }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">

            <UButton
            v-if="!readonly && practiceExperiences.length > 1"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            square
            size="sm"
            aria-label="Hapus pengalaman"
            @click="removePractice(index)"
          />
          </div>
        </div>

        <!-- 2 Kolom -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-5">

          <!-- Tahun -->
          <UFormField label="Tahun" required>
            <UInput
              v-model="practice.year"
              required
              type="number"
              inputmode="numeric"
              min="1900"
              max="2100"
              step="1"
              placeholder="Contoh: 2025"
              class="w-full my-2"
            />

            <p
              v-if="getFieldError(practice.year, isValidYear, 'Tahun harus berupa 4 digit angka (1900–2100).')"
              class="mb-2 block text-xs font-medium cms-validation-error"
            >
              Tahun harus berupa 4 digit angka (1900–2100).
            </p>
          </UFormField>

          <!-- Nama Coachee / Mentee -->
          <UFormField label="Nama Coachee / Mentee" required>
            <UInput
              v-model="practice.coacheeMentee"
              required
              placeholder="Nama coachee / mentee"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Topik Coaching / Mentoring -->
          <UFormField label="Topik Coaching / Mentoring" required>
            <UInput
              v-model="practice.topic"
              required
              placeholder="Topik coaching / mentoring"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Durasi -->
          <UFormField label="Durasi" required>
            <UInput
              v-model="practice.duration"
              required
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              placeholder="Contoh: 60"
              class="w-full my-2"
            />

            <p
              v-if="getFieldError(practice.duration, isValidPositiveInteger, 'Durasi harus berupa angka bulat lebih dari 0.')"
              class="mb-2 block text-xs font-medium cms-validation-error"
            >
              Durasi harus berupa angka bulat lebih dari 0.
            </p>
          </UFormField>

        </div>
      </div>

    </div>
  </UCard>
</section>

    </fieldset>

    <!-- ========================================
     5. PERSYARATAN ADMINISTRASI
     ======================================== -->

<section class="space-y-3">
  <div>
    <h2 class="text-lg font-semibold text-slate-900">
      5. Persyaratan Administrasi
    </h2>

    <p v-if="!reviewMode" class="mt-1 text-sm text-slate-600">
      Dokumen dari pendaftaran digunakan kembali dan dapat diganti. Penggantian
      hanya berlaku untuk CMSP-01 (dokumen pendaftaran tidak berubah) dan
      tersimpan saat Simpan Draft.
    </p>
  </div>

  <UCard class="border border-primary/30 bg-white/90 shadow-sm">
    <div v-if="!reviewMode" class="mb-5 flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-primary">
        Dokumen Persyaratan
        <span class="font-normal text-slate-600">
          ({{ documentCompletedCount }} dari {{ documents.length }} terunggah)
        </span>
      </p>

      <UBadge
        :label="isDocumentSectionComplete ? 'Lengkap' : 'Belum lengkap'"
        :color="isDocumentSectionComplete ? 'success' : 'neutral'"
        variant="subtle"
        size="sm"
        class="shrink-0"
      />
    </div>
    <div class="space-y-3">
      <div
        v-for="document in documents"
        :key="document.documentType"
        class="flex flex-col gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon :name="getApplicationDocumentIcon(document.documentType)" class="size-5" />
          </div>

          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-900">
              {{ getApplicationDocumentLabel(document.documentType) }}
              <span class="text-red-500">*</span>
            </p>
            <p
              class="mt-0.5 truncate text-xs"
              :class="document.file ? (readonly ? 'text-slate-600' : 'font-medium text-green-600') : 'text-slate-500'"
            >
              {{ document.file?.original_file_name || 'Belum ada file.' }}
            </p>
            <p v-if="!readonly" class="mt-0.5 text-xs text-slate-500">
              {{ documentHint(document.documentType) }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-eye"
            class="min-w-28 justify-center"
            :disabled="!document.file"
            @click="openPreview(document)"
          >
            Lihat
          </UButton>

          <template v-if="!readonly">
            <input
              :id="`cmsp01-${document.documentType}`"
              type="file"
              :accept="documentAccept(document.documentType)"
              class="hidden"
              :disabled="uploadingDocumentType !== null"
              @change="handleDocumentChange($event, document)"
            />
            <UButton
              as="label"
              :for="`cmsp01-${document.documentType}`"
              variant="outline"
              icon="i-lucide-upload"
              :loading="uploadingDocumentType === document.documentType"
              :disabled="uploadingDocumentType !== null"
              class="min-w-28 cursor-pointer justify-center"
            >
              {{ document.file ? 'Ganti' : 'Pilih File' }}
            </UButton>
          </template>
        </div>
      </div>
    </div>
  </UCard>
</section>

<!-- ========================================
     6. PERNYATAAN PEMOHON
     ======================================== -->

<section class="space-y-3">

  <!-- Header -->
  <div>
    <h2 class="text-lg font-semibold text-slate-900">
      6. Pernyataan Pemohon
    </h2>

    <p v-if="!reviewMode" class="mt-1 text-sm text-slate-600">
      Baca dan pahami seluruh pernyataan berikut sebelum melakukan
      Submit Final.
    </p>
  </div>

  <!-- Card -->
  <UCard class="border border-primary/30 bg-white/90 shadow-sm">

    <div v-if="applicantProgress < 100" class="text-sm leading-6 text-slate-600">
      Lengkapi seluruh data dan dokumen yang dipersyaratkan pada CMSP.01
      untuk menampilkan pernyataan pemohon.
    </div>

    <div v-else class="space-y-5">

      <!-- Pernyataan -->
      <div class="space-y-4 text-sm leading-6 text-slate-700">

  <p>
    Saya yang bertanda tangan di bawah ini menyatakan bahwa:
  </p>

  <div class="space-y-3 pl-2">

    <div class="flex gap-3">
      <span class="w-5 shrink-0 font-medium text-slate-700">
        1.
      </span>

      <p>
        Seluruh informasi yang saya sampaikan adalah benar.
      </p>
    </div>

    <div class="flex gap-3">
      <span class="w-5 shrink-0 font-medium text-slate-700">
        2.
      </span>

      <p>
        Seluruh dokumen yang saya lampirkan adalah sah dan dapat
        dipertanggungjawabkan.
      </p>
    </div>

    <div class="flex gap-3">
      <span class="w-5 shrink-0 font-medium text-slate-700">
        3.
      </span>

      <p>
        Saya bersedia mengikuti seluruh tahapan sertifikasi kompetensi
        sesuai ketentuan penyelenggara sertifikasi.
      </p>
    </div>

    <div class="flex gap-3">
      <span class="w-5 shrink-0 font-medium text-slate-700">
        4.
      </span>

      <p>
        Saya bersedia menerima keputusan hasil uji kompetensi sesuai
        mekanisme yang berlaku.
      </p>
    </div>

  </div>

</div>

      <!-- Checkbox Persetujuan -->
      <div
        class="rounded-xl border border-primary/50 bg-primary/5 p-4"
      >
        <UCheckbox
          v-model="declarationAccepted"
          :disabled="readonly"
          required
          label="Saya telah membaca, memahami, dan menyetujui seluruh pernyataan di atas."
        />

        <p class="mt-2 pl-7 text-xs text-slate-600">
          Pernyataan ini wajib disetujui sebelum melakukan Submit Final.
        </p>
      </div>

    </div>

  </UCard>
</section>

    <DocumentPreviewModal
      v-model:open="previewOpen"
      :url="documentPreviewUrl"
      :title="previewDocument?.file?.original_file_name"
      :description="previewDocument ? getApplicationDocumentLabel(previewDocument.documentType) : ''"
    />
  </div>
</template>

<style scoped>
.cms-validation-error {
  color: #dc2626 !important;
}
</style>
