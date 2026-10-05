<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

definePageMeta({
  layout: 'user',
})

/* ========================================
 * INFORMASI SERTIFIKASI
 * ======================================== */

const activeCategory =
  'Certified Public Sector Performance Coach and Mentor'

const certificationPeriod = 'Periode Sertifikasi September 2026'

const formStatus = ref<'draft' | 'saved'>('draft')

/* ========================================
 * PERNYATAAN PEMOHON
 * ======================================== */

const declarationAccepted = ref(false)

/* ========================================
 * DATA PEMOHON
 * ======================================== */

const applicant = ref({
  fullName: 'Fernando Manalu',
  nip: '199001012020121001',
  rank: 'III/a',
  birthPlace: 'Jakarta',
  birthDate: '1990-01-01',
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

/* ========================================
 * RIWAYAT PELATIHAN
 * ======================================== */

const trainingHistories = ref([
  {
    trainingName: '',
    organizer: '',
    year: '',
    jp: '',
  },
])

function addTraining() {
  trainingHistories.value.push({
    trainingName: '',
    organizer: '',
    year: '',
    jp: '',
  })
}

function removeTraining(index: number) {
  if (trainingHistories.value.length === 1) return

  trainingHistories.value.splice(index, 1)
}

/* ========================================
 * PENGALAMAN PRAKTIK
 * ======================================== */

const practiceExperiences = ref([
  {
    year: '',
    coacheeMentee: '',
    topic: '',
    duration: '',
  },
])

function addPractice() {
  practiceExperiences.value.push({
    year: '',
    coacheeMentee: '',
    topic: '',
    duration: '',
  })
}

function removePractice(index: number) {
  if (practiceExperiences.value.length === 1) return

  practiceExperiences.value.splice(index, 1)
}

/* ========================================
 * DOKUMEN ADMINISTRASI
 * ======================================== */

const inheritedDocuments = [
  {
    name: 'Ijazah Terakhir',
  },
  {
    name: 'SK Jabatan Terakhir',
  },
  {
    name: 'Sertifikat Pelatihan Coaching dan Mentoring',
  },
  {
    name: 'Log Book / Portofolio Praktik Coaching',
  },
]

const newDocuments = ref({
  ktp: null as File | null,
  assignmentLetter: null as File | null,
})

const documentErrors = ref({
  ktp: '',
  assignmentLetter: '',
})

const maxDocumentSize = 5 * 1024 * 1024

function handleFileChange(
  event: Event,
  documentKey: 'ktp' | 'assignmentLetter',
) {
  const target = event.target as HTMLInputElement

  if (!target.files?.length) return

  const file = target.files[0]

  if (file.size > maxDocumentSize) {
    newDocuments.value[documentKey] = null
    documentErrors.value[documentKey] = 'Ukuran file maksimal 5 MB.'
    target.value = ''
    return
  }

  newDocuments.value[documentKey] = file
  documentErrors.value[documentKey] = ''
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

const requiredApplicantFields = computed(() => [
  applicant.value.fullName,
  applicant.value.nip,
  applicant.value.rank,
  applicant.value.birthPlace,
  applicant.value.birthDate,
  applicant.value.gender,
  applicant.value.latestEducation,
  applicant.value.educationQualification,
  applicant.value.position,
  applicant.value.workUnit,
  applicant.value.institution,
  applicant.value.phoneNumber,
  applicant.value.email,
  applicant.value.domicileAddress,
])

const applicantCompletedCount = computed(() => {
  const basicFields = [
    applicant.value.fullName,
    applicant.value.rank,
    applicant.value.birthPlace,
    applicant.value.birthDate,
    applicant.value.gender,
    applicant.value.latestEducation,
    applicant.value.educationQualification,
    applicant.value.position,
    applicant.value.workUnit,
    applicant.value.institution,
    applicant.value.domicileAddress,
  ]

  return (
    basicFields.filter(isFilled).length +
    (isValidNip(applicant.value.nip) ? 1 : 0) +
    (isValidPhoneNumber(applicant.value.phoneNumber) ? 1 : 0) +
    (isValidEmail(applicant.value.email) ? 1 : 0)
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

const trainingTotalCount = computed(() =>
  trainingHistories.value.length * 4,
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

const practiceTotalCount = computed(() =>
  practiceExperiences.value.length * 4,
)

const documentTotalCount = inheritedDocuments.length + 2

const documentCompletedCount = computed(() =>
  inheritedDocuments.length +
  (newDocuments.value.ktp ? 1 : 0) +
  (newDocuments.value.assignmentLetter ? 1 : 0),
)

const totalRequirementCount = computed(() =>
  requiredApplicantFields.value.length +
  trainingTotalCount.value +
  practiceTotalCount.value +
  documentTotalCount,
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

const isTrainingComplete = (training: typeof trainingHistories.value[number]) =>
  isFilled(training.trainingName) &&
  isFilled(training.organizer) &&
  isValidYear(training.year) &&
  isValidPositiveInteger(training.jp)

const isPracticeComplete = (practice: typeof practiceExperiences.value[number]) =>
  isFilled(practice.year) &&
  isFilled(practice.coacheeMentee) &&
  isFilled(practice.topic) &&
  isValidPositiveInteger(practice.duration)

defineExpose({
  progress: applicantProgress,
  declarationAccepted,
})

/* ========================================
 * SAVE DRAFT
 * ======================================== */

const formContainerRef = ref<HTMLElement | null>(null)
const draftBarRef = ref<HTMLElement | null>(null)
const isDraftBarFloating = ref(false)

function updateDraftBarState() {
  const container = formContainerRef.value
  const draftBar = draftBarRef.value

  if (!container || !draftBar) return

  const bottomOffset = 16
  const draftBarRect = draftBar.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const stickyBottom = window.innerHeight - bottomOffset
  const containerBottom = window.scrollY + containerRect.bottom
  const viewportBottomTarget = window.scrollY + stickyBottom

  isDraftBarFloating.value =
    Math.abs(draftBarRect.bottom - stickyBottom) <= 2 &&
    containerBottom > viewportBottomTarget + 2
}

const savedMessage = ref('')

function saveDraft() {
  formStatus.value = 'saved'

  const draftData = {
    applicant: applicant.value,
    trainingHistories: trainingHistories.value,
    practiceExperiences: practiceExperiences.value,
    documents: {
      ktp: newDocuments.value.ktp?.name ?? null,
      assignmentLetter:
        newDocuments.value.assignmentLetter?.name ?? null,
    },
    savedAt: new Date().toISOString(),
  }

  localStorage.setItem(
    'cmsp-01-draft',
    JSON.stringify(draftData),
  )

  savedMessage.value = 'Draft berhasil disimpan.'

  window.setTimeout(() => {
    savedMessage.value = ''
  }, 3000)
}

/* ========================================
 * LOAD DRAFT
 * ======================================== */

onMounted(() => {
  const savedDraft = localStorage.getItem('cmsp-01-draft')

  if (!savedDraft) return

  try {
    const draftData = JSON.parse(savedDraft)

    if (draftData.applicant) {
      applicant.value = {
        ...applicant.value,
        ...draftData.applicant,
      }
    }

    if (Array.isArray(draftData.trainingHistories)) {
      trainingHistories.value = draftData.trainingHistories
    }

    if (Array.isArray(draftData.practiceExperiences)) {
      practiceExperiences.value = draftData.practiceExperiences
    }

    formStatus.value = 'saved'
  } catch (error) {
    console.error('Gagal memuat draft CMSP.01:', error)
  }
})

onMounted(() => {
  updateDraftBarState()
  window.addEventListener('scroll', updateDraftBarState, { passive: true })
  window.addEventListener('resize', updateDraftBarState)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateDraftBarState)
  window.removeEventListener('resize', updateDraftBarState)
})

</script>

<template>
  <div ref="formContainerRef" class="mx-auto w-full max-w-5xl space-y-8 pb-8">

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
            class="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900"
          >
            Permohonan Sertifikasi
          </h1>

          <p class="mt-2 text-sm leading-6 text-slate-500">
            Lengkapi data pemohon, pengalaman coaching dan mentoring,
            serta persyaratan administrasi.
          </p>
        </div>

        <UBadge
          :label="formStatus === 'saved' ? 'Tersimpan' : 'Draft'"
          :color="formStatus === 'saved' ? 'success' : 'warning'"
          variant="subtle"
          class="shrink-0"
        />
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

        <p class="mt-1 text-sm text-slate-500">
          Informasi mengikuti kategori dan periode sertifikasi
          yang sedang aktif.
        </p>
      </div>

      <UCard class="bg-white/90 shadow-sm">
        <div class="space-y-5">

          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-primary"
            >
              Nama Sertifikasi
            </p>

            <p class="mt-1.5 text-base font-medium text-slate-900">
              Coach dan Mentor Sektor Publik
            </p>
          </div>

          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-primary"
            >
              Kategori
            </p>

            <p class="mt-1.5 text-base font-medium text-slate-900">
              {{ activeCategory }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UBadge
              label="Periode Aktif"
              color="primary"
              variant="subtle"
            />

            <UBadge
              :label="certificationPeriod"
              color="neutral"
              variant="subtle"
            />
          </div>

        </div>
      </UCard>
    </section>

    <!-- ========================================
         2. DATA PEMOHON
         ======================================== -->

    <section class="space-y-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">
          2. Data Pemohon Sertifikasi
        </h2>

        <p class="mt-1 text-sm text-slate-500">
          Lengkapi data diri sesuai identitas dan kondisi saat ini.
        </p>
      </div>

      <UCard class="bg-white/90 shadow-sm">

        <!-- INPUT GRID -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-5">

          <!-- Nama Lengkap -->
          <UFormField
            label="Nama Lengkap"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.fullName"
              required
              placeholder="Masukkan nama lengkap"
              class="w-full my-2"
            />
          </UFormField>

          <!-- NIP -->
          <UFormField
            label="NIP"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.nip"
              required
              type="text"
              inputmode="numeric"
              minlength="18"
              maxlength="18"
              pattern="[0-9]{18}"
              placeholder="Masukkan 18 digit NIP"
              class="w-full my-2"
            />

            <p
              v-if="getFieldError(applicant.nip, isValidNip, 'NIP harus terdiri dari 18 digit angka.')"
              class="mb-2 block text-xs font-medium cms-validation-error"
            >
              NIP harus terdiri dari 18 digit angka.
            </p>
          </UFormField>

          <!-- Pangkat -->
          <UFormField
            label="Pangkat / Gol. Ruang"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.rank"
              required
              placeholder="Contoh: III/a"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Jenis Kelamin -->
          <UFormField
            label="Jenis Kelamin"
            required
            class="min-w-0"
          >
            <USelect
              v-model="applicant.gender"
              required
              :items="[
                'Laki-laki',
                'Wanita',
              ]"
              placeholder="Pilih jenis kelamin"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Tempat Lahir -->
          <UFormField
            label="Tempat Lahir"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.birthPlace"
              required
              placeholder="Masukkan tempat lahir"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Tanggal Lahir -->
          <UFormField
            label="Tanggal Lahir"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.birthDate"
              required
              type="date"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Pendidikan Terakhir -->
          <UFormField
            label="Pendidikan Terakhir"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.latestEducation"
              required
              placeholder="Contoh: S1 Ilmu Komputer"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Kualifikasi Pendidikan -->
          <UFormField
            label="Kualifikasi Pendidikan"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.educationQualification"
              required
              placeholder="Masukkan kualifikasi pendidikan"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Jabatan -->
          <UFormField
            label="Jabatan"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.position"
              required
              placeholder="Masukkan jabatan"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Unit Kerja -->
          <UFormField
            label="Unit Kerja"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.workUnit"
              required
              placeholder="Masukkan unit kerja"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Instansi -->
          <UFormField
            label="Instansi"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.institution"
              required
              placeholder="Masukkan instansi"
              class="w-full my-2"
            />
          </UFormField>

          <!-- Nomor Telepon -->
          <UFormField
            label="Nomor Telepon"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.phoneNumber"
              required
              type="tel"
              inputmode="numeric"
              pattern="\+?[0-9\s()\-]{8,20}"
              placeholder="Contoh: 081234567890"
              class="w-full my-2"
            />

            <p
              v-if="getFieldError(applicant.phoneNumber, isValidPhoneNumber, 'Nomor telepon hanya boleh berisi angka dan terdiri dari 8–15 digit.')"
              class="mb-2 block text-xs font-medium cms-validation-error"
            >
              Nomor telepon hanya boleh berisi angka dan terdiri dari 8–15 digit.
            </p>
          </UFormField>

          <!-- E-mail -->
          <UFormField
            label="E-mail"
            required
            class="min-w-0"
          >
            <UInput
              v-model="applicant.email"
              required
              type="email"
              placeholder="nama@email.com"
              class="w-full my-2"
            />

            <p
              v-if="getFieldError(applicant.email, isValidEmail, 'Gunakan format e-mail yang benar, misalnya nama@email.com.')"
              class="mb-2 block text-xs font-medium cms-validation-error"
            >
              Gunakan format e-mail yang benar, misalnya nama@email.com.
            </p>
          </UFormField>

          <!-- Alamat Domisili -->
          <UFormField
            label="Alamat Domisili"
            required
            class="min-w-0"
          >
            <UTextarea
              v-model="applicant.domicileAddress"
              required
              :rows="3"
              placeholder="Masukkan alamat domisili"
              class="w-full my-2"
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

      <p class="mt-1 text-sm text-slate-500">
        Minimal satu riwayat pelatihan wajib diisi. Tambahkan riwayat sesuai kebutuhan.
      </p>
    </div>

    <!-- Button -->
    <div class="shrink-0">
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
  <UCard class="bg-white/90 shadow-sm">
    <div class="space-y-4">

      <div
  v-for="(training, index) in trainingHistories"
  :key="index"
  class="rounded-xl bg-slate-50/40 px-5"
  :class="index > 0 ? 'border-t border-slate-300 pt-5' : ''"
>

        <!-- Item Header -->
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <p class="text-sm font-semibold text-primary">
              Riwayat {{ index + 1 }}
            </p>

            <UBadge
              :label="isTrainingComplete(training) ? 'Lengkap' : 'Belum lengkap'"
              :color="isTrainingComplete(training) ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
              class="shrink-0"
            />
          </div>

          <UButton
            v-if="trainingHistories.length > 1"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            square
            size="sm"
            aria-label="Hapus riwayat"
            @click="removeTraining(index)"
          />
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

      <p class="mt-1 text-sm text-slate-500">
        Minimal satu pengalaman praktik wajib diisi. Tambahkan pengalaman sesuai kebutuhan.
      </p>
    </div>

    <!-- Button -->
    <div class="shrink-0">
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
  <UCard class="bg-white/90 shadow-sm">
    <div class="space-y-4">

      <div
  v-for="(practice, index) in practiceExperiences"
  :key="index"
  class="rounded-xl bg-slate-50/40 px-5"
  :class="index > 0 ? 'border-t border-slate-300 pt-5' : ''"
>

        <!-- Item Header -->
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <p class="text-sm font-semibold text-primary">
              Pengalaman {{ index + 1 }}
            </p>

            <UBadge
              :label="isPracticeComplete(practice) ? 'Lengkap' : 'Belum lengkap'"
              :color="isPracticeComplete(practice) ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
              class="shrink-0"
            />
          </div>

          <UButton
            v-if="practiceExperiences.length > 1"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            square
            size="sm"
            aria-label="Hapus pengalaman"
            @click="removePractice(index)"
          />
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

    <!-- ========================================
     5. PERSYARATAN ADMINISTRASI
     ======================================== -->

<section class="space-y-3">

  <!-- Header -->
  <div>
    <h2 class="text-lg font-semibold text-slate-900">
      5. Persyaratan Administrasi
    </h2>

    <p class="mt-1 text-sm text-slate-500">
      Dokumen yang sudah dilampirkan saat pendaftaran akan digunakan
      kembali. Lengkapi dokumen tambahan yang diperlukan.
    </p>
  </div>

  <!-- Card -->
  <UCard class="bg-white/90 shadow-sm">
    <div class="space-y-3">

      <!-- ====================================
           DOKUMEN DARI PENDAFTARAN
           ==================================== -->

      <div
        v-for="document in inheritedDocuments"
        :key="document.name"
        class="flex items-center justify-between gap-4 rounded-xl bg-slate-50/60 p-4"
      >
        <!-- Document Info -->
        <div class="flex min-w-0 items-center gap-3">

          <!-- Icon -->
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <UIcon
              name="i-lucide-file-check-2"
              class="size-5"
            />
          </div>

          <!-- Text -->
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-900">
              {{ document.name }}
            </p>

            <p class="mt-0.5 text-xs text-slate-500">
              Diambil dari data pendaftaran
            </p>
          </div>

        </div>

        <!-- Status -->
        <UBadge
          label="Tersedia"
          color="success"
          variant="subtle"
          size="sm"
          class="shrink-0"
        />
      </div>

      <!-- ====================================
     KTP
     ==================================== -->

<div
  class="rounded-xl border border-dashed border-slate-300 bg-white p-4"
>
  <div class="flex items-center justify-between gap-6">

    <!-- KTP Info -->
    <div class="flex min-w-0 items-center gap-3">

      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        <UIcon
          name="i-lucide-id-card"
          class="size-5"
        />
      </div>

      <div class="min-w-0">
        <p class="text-sm font-medium text-slate-900">
          KTP
        </p>

        <p class="mt-0.5 text-xs text-slate-500">
          Upload dokumen KTP. Maksimal 5 MB.
        </p>

        <p
          v-if="newDocuments.ktp"
          class="mt-1 truncate text-xs font-medium text-success-600"
        >
          {{ newDocuments.ktp.name }}
        </p>

        <p
          v-else
          class="mt-1 text-xs text-slate-400"
        >
          Belum ada file dipilih.
        </p>

        <p
          v-if="documentErrors.ktp"
          class="mb-2 block text-xs font-medium cms-validation-error"
        >
          {{ documentErrors.ktp }}
        </p>
      </div>

    </div>

    <!-- KTP Action -->
    <div class="shrink-0">
      <input
        id="ktp-upload"
        type="file"
        required
        accept=".pdf,.jpg,.jpeg,.png"
        class="hidden"
        @change="handleFileChange($event, 'ktp')"
      />

      <label
        for="ktp-upload"
        class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
      >
        <UIcon
          name="i-lucide-upload"
          class="size-4"
        />

        Pilih File
      </label>
    </div>

  </div>
</div>

      <!-- ====================================
     SURAT TUGAS INSTANSI
     ==================================== -->

<div
  class="rounded-xl border border-dashed border-slate-300 bg-white p-4"
>
  <div class="flex items-center justify-between gap-6">

    <!-- Surat Tugas Info -->
    <div class="flex min-w-0 items-center gap-3">

      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        <UIcon
          name="i-lucide-file-text"
          class="size-5"
        />
      </div>

      <div class="min-w-0">
        <p class="text-sm font-medium text-slate-900">
          Surat Tugas Instansi
        </p>

        <p class="mt-0.5 text-xs text-slate-500">
          Upload surat tugas dari instansi. Maksimal 5 MB.
        </p>

        <p
          v-if="newDocuments.assignmentLetter"
          class="mt-1 truncate text-xs font-medium text-success-600"
        >
          {{ newDocuments.assignmentLetter.name }}
        </p>

        <p
          v-else
          class="mt-1 text-xs text-slate-400"
        >
          Belum ada file dipilih.
        </p>

        <p
          v-if="documentErrors.assignmentLetter"
          class="mb-2 block text-xs font-medium cms-validation-error"
        >
          {{ documentErrors.assignmentLetter }}
        </p>
      </div>

    </div>

    <!-- Surat Tugas Action -->
    <div class="shrink-0">
      <input
        id="assignment-letter-upload"
        type="file"
        required
        accept=".pdf,.jpg,.jpeg,.png"
        class="hidden"
        @change="
          handleFileChange(
            $event,
            'assignmentLetter',
          )
        "
      />

      <label
        for="assignment-letter-upload"
        class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
      >
        <UIcon
          name="i-lucide-upload"
          class="size-4"
        />

        Pilih File
      </label>
    </div>

  </div>
</div>

    </div>
  </UCard>
</section>

        <!-- ====================================
             PROGRESS
             DI LUAR GRID INPUT
             ==================================== -->

        <div class="mt-6 w-full">
          <div class="rounded-xl bg-slate-50 p-4">

            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-500">
                Kelengkapan CMSP.01
              </span>

              <span class="font-semibold text-slate-900">
                {{ applicantProgress }}%
              </span>
            </div>

            <div
              class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
            >
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{ width: `${applicantProgress}%` }"
              />
            </div>

          </div>
        </div>

<!-- ========================================
     6. PERNYATAAN PEMOHON
     ======================================== -->

<section class="space-y-3">

  <!-- Header -->
  <div>
    <h2 class="text-lg font-semibold text-slate-900">
      6. Pernyataan Pemohon
    </h2>

    <p class="mt-1 text-sm text-slate-500">
      Baca dan pahami seluruh pernyataan berikut sebelum melakukan
      Submit Final.
    </p>
  </div>

  <!-- Card -->
  <UCard class="bg-white/90 shadow-sm">

    <div v-if="applicantProgress < 100" class="text-sm leading-6 text-slate-500">
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
        class="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/10"
      >
        <UCheckbox
          v-model="declarationAccepted"
          required
          label="Saya telah membaca, memahami, dan menyetujui seluruh pernyataan di atas."
        />

        <p class="mt-2 pl-7 text-xs text-slate-500">
          Pernyataan ini wajib disetujui sebelum melakukan Submit Final.
        </p>
      </div>

    </div>

  </UCard>
</section>

    <!-- ========================================
     SIMPAN DRAFT
     ======================================== -->

<div
  ref="draftBarRef"
  class="sticky bottom-4 z-10 transition-shadow duration-200"
>
  <UCard
    class="bg-white/90"
    :class="isDraftBarFloating ? 'shadow-lg' : 'shadow-sm'"
  >
    <div class="flex items-center gap-6">

    <!-- Informasi -->
    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium text-slate-900">
        Simpan perkembangan pengisian
      </p>

      <p class="mt-1 text-xs text-slate-500">
        Form belum perlu lengkap untuk disimpan sebagai draft.
      </p>

      <p
        v-if="savedMessage"
        class="mt-1 text-xs font-medium text-success-600"
      >
        {{ savedMessage }}
      </p>
    </div>

    <!-- Tombol -->
    <UButton
      label="Simpan Draft"
      icon="i-lucide-save"
      size="lg"
      class="ml-auto shrink-0"
      @click="saveDraft"
    />

    </div>
  </UCard>
</div>

  </div>
</template>

<style scoped>
.cms-validation-error {
  color: #dc2626 !important;
}
</style>
