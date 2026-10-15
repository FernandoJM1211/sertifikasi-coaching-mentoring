
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

type FileField = {
  file: File | null
  error: string
}

type CertificationInfo = {
  period_id: string
  period_name: string
  period_status: string
  certification_type_id: string
  certification_name: string
  category_id: string
  category_name: string
}

const submitted = ref(false)
const submitting = ref(false)

const activePeriod = reactive({
  id: '',
  name: 'Memuat periode sertifikasi...',
  certificationName: 'Memuat nama sertifikasi...',
  category: 'Memuat kategori...',
})

const periodLoading = ref(true)
const periodLoadError = ref('')

async function fetchCertificationInfo() {
  periodLoading.value = true
  periodLoadError.value = ''

  try {
    const response = await $fetch<{
      success: boolean
      data: CertificationInfo | null
      message?: string
    }>('/api/certification-info')

    if (!response.data) {
      activePeriod.id = ''
      activePeriod.name = 'Belum ada periode aktif'
      activePeriod.certificationName = 'Belum tersedia'
      activePeriod.category = 'Belum tersedia'
      periodLoadError.value =
        response.message ||
        'Pendaftaran belum tersedia karena belum ada periode sertifikasi aktif.'
      return
    }

    activePeriod.id = response.data.period_id
    activePeriod.name = response.data.period_name
    activePeriod.certificationName =
      response.data.certification_name ||
      'Informasi sertifikasi belum tersedia'
    activePeriod.category =
      response.data.category_name ||
      'Informasi kategori belum tersedia'

    if (
      !response.data.certification_name ||
      !response.data.category_name
    ) {
      periodLoadError.value =
        'Informasi jenis atau kategori sertifikasi belum lengkap. Silakan hubungi administrator.'
    }
  } catch (error: any) {
    console.error('Gagal memuat informasi sertifikasi:', error)

    activePeriod.id = ''
    activePeriod.name = 'Informasi periode tidak tersedia'
    activePeriod.certificationName =
      'Informasi sertifikasi tidak tersedia'
    activePeriod.category = 'Informasi kategori tidak tersedia'

    periodLoadError.value =
      error?.data?.statusMessage ||
      'Informasi sertifikasi gagal dimuat. Silakan muat ulang halaman.'
  } finally {
    periodLoading.value = false
  }
}

onMounted(() => {
  fetchCertificationInfo()
})

const form = reactive({
  fullName: '',
  nip: '',
  institution: '',
  region: '',
  email: '',
  whatsapp: '',
  education: '',
  position: '',
})

const files = reactive<Record<string, FileField>>({
  diploma: { file: null, error: '' },
  appointment: { file: null, error: '' },
  trainingCertificate: { file: null, error: '' },
  practiceEvidence: { file: null, error: '' },
})

const touched = reactive<Record<string, boolean>>({
  fullName: false,
  nip: false,
  institution: false,
  region: false,
  email: false,
  whatsapp: false,
  education: false,
  position: false,
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_FILE_SIZE = 5 * 1024 * 1024

const fileLabels: Record<string, string> = {
  diploma: 'Ijazah Terakhir',
  appointment: 'SK Jabatan Terakhir',
  trainingCertificate: 'Sertifikat Pelatihan Coaching dan Mentoring',
  practiceEvidence: 'Bukti Pengalaman Praktik Coaching dan Mentoring',
}

const errorModalOpen = ref(false)
const errorModalMessage = ref('')

const fieldErrors = computed(() => ({
  fullName: !form.fullName.trim()
    ? 'Nama lengkap wajib diisi.'
    : '',

  nip: !form.nip.trim()
    ? 'NIP wajib diisi.'
    : !/^\d{18}$/.test(form.nip)
      ? 'NIP harus terdiri dari 18 digit.'
      : '',

  institution: !form.institution.trim()
    ? 'Nama instansi wajib diisi.'
    : '',

  region: !form.region.trim()
    ? 'Asal daerah wajib diisi.'
    : '',

  email: !form.email.trim()
    ? 'Email wajib diisi.'
    : !emailPattern.test(form.email)
      ? 'Format email tidak valid.'
      : '',

  whatsapp: !form.whatsapp.trim()
    ? 'Nomor WhatsApp wajib diisi.'
    : !/^\d{8,15}$/.test(form.whatsapp)
      ? 'Nomor WhatsApp harus berupa 8–15 digit angka.'
      : '',

  education: !form.education.trim()
    ? 'Pendidikan terakhir wajib diisi.'
    : '',

  position: !form.position.trim()
    ? 'Jabatan wajib diisi.'
    : '',
}))

const allFilesValid = computed(() =>
  Object.values(files).every((item) => item.file && !item.error),
)

const allFieldsValid = computed(() =>
  Object.values(fieldErrors.value).every((error) => !error),
)

const formValid = computed(() =>
  allFieldsValid.value && allFilesValid.value,
)

function markTouched(field: string) {
  touched[field] = true
}

function handleNipInput() {
  form.nip = form.nip.replace(/\D/g, '').slice(0, 18)
}

function handleWhatsappInput() {
  form.whatsapp = form.whatsapp.replace(/\D/g, '').slice(0, 15)
}

function validateFile(key: string, file: File | null) {
  files[key].error = ''

  if (!file) {
    files[key].file = null
    return
  }

  if (file.type !== 'application/pdf') {
    files[key].error = 'File harus dalam format PDF.'
    files[key].file = null
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    files[key].error = 'Ukuran file maksimal 5 MB.'
    files[key].file = null
    return
  }

  files[key].file = file
}

function handleFileChange(key: string, event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null

  validateFile(key, file)
}

function removeFile(key: string) {
  files[key].file = null
  files[key].error = ''

  const input = document.getElementById(
    `file-${key}`,
  ) as HTMLInputElement | null

  if (input) input.value = ''
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function touchAllFields() {
  Object.keys(touched).forEach((key) => {
    touched[key] = true
  })
}

function showErrorModal(message: string) {
  errorModalMessage.value = message
  errorModalOpen.value = true
}

function errorFor(field: keyof typeof fieldErrors.value) {
  return touched[field] ? fieldErrors.value[field] : ''
}

async function submitRegistration() {
  if (submitting.value) return

  if (periodLoading.value || !activePeriod.id || periodLoadError.value) {
    showErrorModal(
      periodLoadError.value ||
        'Informasi sertifikasi belum siap. Silakan tunggu sebentar atau muat ulang halaman.',
    )
    return
  }

  touchAllFields()

  Object.keys(files).forEach((key) => {
    if (!files[key].file) {
      files[key].error = 'Dokumen wajib diunggah.'
    }
  })

  if (!formValid.value) {
    showErrorModal(
      'Periksa kembali data pemohon dan dokumen persyaratan. Pastikan seluruh kolom wajib sudah diisi dengan benar.',
    )
    return
  }

  submitting.value = true

  try {
    const formData = new FormData()

    formData.append('fullName', form.fullName)
    formData.append('nip', form.nip)
    formData.append('institution', form.institution)
    formData.append('region', form.region)
    formData.append('email', form.email)
    formData.append('whatsapp', form.whatsapp)
    formData.append('education', form.education)
    formData.append('position', form.position)

    const fileFields = [
      'diploma',
      'appointment',
      'trainingCertificate',
      'practiceEvidence',
    ]

    for (const fieldName of fileFields) {
      const file = files[fieldName].file

      if (file) {
        formData.append(fieldName, file)
      }
    }

    await $fetch('/api/applications/register', {
      method: 'POST',
      body: formData,
    })

    submitted.value = true
  } catch (error: any) {
    console.error('Gagal mengirim pendaftaran:', error)

    const message =
      error?.data?.statusMessage ||
      error?.data?.message ||
      'Pendaftaran gagal diproses. Silakan coba kembali.'

    showErrorModal(message)
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.fullName = ''
  form.nip = ''
  form.institution = ''
  form.region = ''
  form.email = ''
  form.whatsapp = ''
  form.education = ''
  form.position = ''

  Object.keys(files).forEach((key) => {
    files[key].file = null
    files[key].error = ''

    const input = document.getElementById(
      `file-${key}`,
    ) as HTMLInputElement | null

    if (input) input.value = ''
  })

  Object.keys(touched).forEach((key) => {
    touched[key] = false
  })

  submitted.value = false
  errorModalOpen.value = false
}
</script>

<template>
  <div class="space-y-8">
    <!-- Success -->
    <template v-if="submitted">
      <UCard class="bg-white/95 shadow-sm">
        <div class="flex flex-col items-center text-center">
          <div
            class="flex size-16 items-center justify-center rounded-full bg-green-100"
          >
            <UIcon
              name="i-lucide-check"
              class="size-8 text-green-600"
            />
          </div>

          <h1 class="mt-6 text-2xl font-semibold text-slate-900">
            Pendaftaran Berhasil Dikirim
          </h1>

          <p class="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Data dan dokumen pendaftaran Anda telah berhasil dikirim dan
            selanjutnya akan diperiksa oleh Verifikator.
          </p>

          <div
            class="mt-6 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-5 text-left"
          >
            <div class="space-y-3">
              <div>
                <p class="text-xs text-slate-500">Nama</p>
                <p class="text-sm font-medium text-slate-900">
                  {{ form.fullName }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">NIP</p>
                <p class="text-sm font-medium text-slate-900">
                  {{ form.nip }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Nama Sertifikasi</p>
                <p class="text-sm font-medium text-slate-900">
                  {{ activePeriod.certificationName }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Kategori</p>
                <p class="text-sm font-medium text-slate-900">
                  {{ activePeriod.category }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Periode</p>
                <p class="text-sm font-medium text-slate-900">
                  {{ activePeriod.name }}
                </p>
              </div>
            </div>
          </div>

          <p class="mt-6 text-xs leading-5 text-slate-500">
            Mohon menunggu informasi selanjutnya dari penyelenggara sertifikasi.
          </p>

          <UButton
            class="mt-8"
            color="primary"
            variant="soft"
            label="Kembali ke Beranda"
            to="/"
          />
        </div>
      </UCard>
    </template>

    <!-- Registration Form -->
    <template v-else>
      <!-- Header -->
      <section class="space-y-3">
        <UBadge
          label="Pendaftaran Sertifikasi"
          color="primary"
          variant="subtle"
        />

        <h1
          class="text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl"
        >
          Pendaftaran Sertifikasi
        </h1>

        <p class="max-w-3xl text-sm leading-6 text-slate-500">
          Silakan lengkapi data dan dokumen persyaratan pendaftaran dengan benar.
          Seluruh data dan dokumen wajib diisi sebelum pendaftaran dikirim.
        </p>
      </section>

      <!-- Certification Info -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">
          1. Informasi Sertifikasi
        </h2>

        <UCard class="bg-white/90 shadow-sm">
          <div class="space-y-5">
            <div>
              <p class="text-xs font-medium text-slate-500">
                Nama Sertifikasi
              </p>
              <p class="mt-1 text-base font-medium text-slate-900">
                {{ activePeriod.certificationName }}
              </p>
            </div>

            <div>
              <p class="text-xs font-medium text-slate-500">
                Kategori
              </p>
              <p class="mt-1 text-base font-medium text-slate-900">
                {{ activePeriod.category }}
              </p>
            </div>

            <div>
              <p class="text-xs font-medium text-slate-500">
                Periode
              </p>
              <p class="mt-1 text-base font-medium text-slate-900">
                {{ activePeriod.name }}
              </p>
            </div>

            <div
              v-if="periodLoadError"
              class="rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <p class="text-sm leading-5 text-amber-800">
                {{ periodLoadError }}
              </p>
            </div>
          </div>
        </UCard>
      </section>

      <!-- Applicant Data -->
      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            2. Data Pemohon
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            Lengkapi data sesuai identitas dan kondisi saat ini.
          </p>
        </div>

        <UCard class="bg-white/90 shadow-sm">
          <div class="space-y-6">
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <UFormField label="Nama Lengkap + Gelar" required>
                <UInput
                  v-model="form.fullName"
                  class="w-full"
                  placeholder="Masukkan nama lengkap beserta gelar"
                  :color="errorFor('fullName') ? 'error' : 'neutral'"
                  @blur="markTouched('fullName')"
                />
                <p
                  v-if="errorFor('fullName')"
                  class="mt-2 text-sm text-red-500"
                >
                  {{ errorFor('fullName') }}
                </p>
              </UFormField>

              <UFormField label="NIP" required>
                <UInput
                  v-model="form.nip"
                  class="w-full"
                  inputmode="numeric"
                  maxlength="18"
                  placeholder="Masukkan NIP 18 digit"
                  :color="errorFor('nip') ? 'error' : 'neutral'"
                  @input="handleNipInput"
                  @blur="markTouched('nip')"
                />
                <p
                  v-if="errorFor('nip')"
                  class="mt-2 text-sm text-red-500"
                >
                  {{ errorFor('nip') }}
                </p>
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <UFormField label="Nama Instansi" required>
                <UInput
                  v-model="form.institution"
                  class="w-full"
                  placeholder="Masukkan nama instansi"
                  :color="errorFor('institution') ? 'error' : 'neutral'"
                  @blur="markTouched('institution')"
                />
                <p
                  v-if="errorFor('institution')"
                  class="mt-2 text-sm text-red-500"
                >
                  {{ errorFor('institution') }}
                </p>
              </UFormField>

              <UFormField label="Asal Daerah" required>
                <UInput
                  v-model="form.region"
                  class="w-full"
                  placeholder="Masukkan asal daerah"
                  :color="errorFor('region') ? 'error' : 'neutral'"
                  @blur="markTouched('region')"
                />
                <p
                  v-if="errorFor('region')"
                  class="mt-2 text-sm text-red-500"
                >
                  {{ errorFor('region') }}
                </p>
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <UFormField label="Email" required>
                <UInput
                  v-model="form.email"
                  class="w-full"
                  type="email"
                  placeholder="contoh@email.com"
                  :color="errorFor('email') ? 'error' : 'neutral'"
                  @blur="markTouched('email')"
                />
                <p
                  v-if="errorFor('email')"
                  class="mt-2 text-sm text-red-500"
                >
                  {{ errorFor('email') }}
                </p>
              </UFormField>

              <UFormField label="Nomor WhatsApp" required>
                <UInput
                  v-model="form.whatsapp"
                  class="w-full"
                  inputmode="numeric"
                  maxlength="15"
                  placeholder="Masukkan nomor WhatsApp"
                  :color="errorFor('whatsapp') ? 'error' : 'neutral'"
                  @input="handleWhatsappInput"
                  @blur="markTouched('whatsapp')"
                />
                <p
                  v-if="errorFor('whatsapp')"
                  class="mt-2 text-sm text-red-500"
                >
                  {{ errorFor('whatsapp') }}
                </p>
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <UFormField label="Pendidikan Terakhir" required>
                <UInput
                  v-model="form.education"
                  class="w-full"
                  placeholder="Contoh: S1 Ilmu Komputer"
                  :color="errorFor('education') ? 'error' : 'neutral'"
                  @blur="markTouched('education')"
                />
                <p
                  v-if="errorFor('education')"
                  class="mt-2 text-sm text-red-500"
                >
                  {{ errorFor('education') }}
                </p>
              </UFormField>

              <UFormField label="Jabatan" required>
                <UInput
                  v-model="form.position"
                  class="w-full"
                  placeholder="Masukkan jabatan"
                  :color="errorFor('position') ? 'error' : 'neutral'"
                  @blur="markTouched('position')"
                />
                <p
                  v-if="errorFor('position')"
                  class="mt-2 text-sm text-red-500"
                >
                  {{ errorFor('position') }}
                </p>
              </UFormField>
            </div>
          </div>
        </UCard>
      </section>

      <!-- Documents -->
      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            3. Dokumen Persyaratan
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            Seluruh dokumen wajib dalam format PDF dengan ukuran maksimal
            5 MB per file.
          </p>
        </div>

        <UCard class="bg-white/90 shadow-sm">
          <div class="space-y-3">
            <div
              v-for="(item, key) in files"
              :key="key"
              class="rounded-xl border border-dashed border-slate-300 bg-white p-4"
            >
              <div
                class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <div
                    class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  >
                    <UIcon
                      :name="
                        key === 'diploma'
                          ? 'i-lucide-graduation-cap'
                          : key === 'appointment'
                            ? 'i-lucide-file-badge'
                            : key === 'trainingCertificate'
                              ? 'i-lucide-award'
                              : 'i-lucide-briefcase-business'
                      "
                      class="size-5"
                    />
                  </div>

                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-900">
                      {{ fileLabels[key] }}
                      <span class="text-red-500">*</span>
                    </p>

                    <p class="mt-0.5 text-xs text-slate-500">
                      Dokumen PDF, maksimal 5 MB.
                    </p>

                    <p
                      v-if="item.file"
                      class="mt-1 break-all text-xs font-medium text-green-600"
                    >
                      {{ item.file.name }} ({{ formatFileSize(item.file.size) }})
                    </p>
                    <p v-else class="mt-1 text-xs text-slate-400">
                      Belum ada file dipilih.
                    </p>

                    <p
                      v-if="item.error"
                      class="mt-1 text-xs text-red-500"
                    >
                      {{ item.error }}
                    </p>
                  </div>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                  <input
                    :id="`file-${key}`"
                    type="file"
                    accept=".pdf,application/pdf"
                    class="hidden"
                    @change="handleFileChange(key, $event)"
                  />

                  <label
                    :for="`file-${key}`"
                    class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
                  >
                    <UIcon name="i-lucide-upload" class="size-4" />
                    {{ item.file ? 'Ganti File' : 'Pilih File' }}
                  </label>

                  <UButton
                    v-if="item.file"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    aria-label="Hapus file"
                    @click="removeFile(key)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </section>

      <!-- Confirmation -->
      <section>
        <UCard class="bg-white/90 shadow-sm">
          <div class="space-y-4">
            <div>
              <h2 class="text-base font-semibold text-slate-900">
                4. Konfirmasi Pendaftaran
              </h2>
              <p class="mt-1 text-sm leading-6 text-slate-600">
                Pastikan seluruh data dan dokumen yang Anda masukkan sudah benar
                sebelum mengirim pendaftaran.
              </p>
            </div>

            <div class="rounded-xl border border-primary/25 bg-primary/5 p-5">
              <p class="text-sm leading-6 text-primary">
                Setelah pendaftaran dikirim, data dan dokumen tidak dapat diubah
                melalui halaman ini dan akan masuk ke tahap verifikasi administrasi.
              </p>
            </div>

            <div class="flex justify-center">
              <UButton
                size="lg"
                color="primary"
                :loading="submitting"
                :disabled="
                  submitting ||
                  periodLoading ||
                  !activePeriod.id ||
                  !!periodLoadError
                "
                label="Kirim Pendaftaran"
                icon="i-lucide-send"
                @click="submitRegistration"
              />
            </div>
          </div>
        </UCard>
      </section>
    </template>

    <!-- Modal error -->
    <UModal v-model:open="errorModalOpen">
      <template #content>
        <div class="space-y-5 p-6">
          <div class="flex items-start gap-4">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200"
            >
              <UIcon
                name="i-lucide-circle-alert"
                class="size-6"
              />
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-900">
                Pendaftaran Belum Dapat Diproses
              </h2>
              <p class="mt-1 text-sm leading-6 text-slate-500">
                Periksa informasi berikut sebelum mencoba kembali.
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-red-200 bg-red-50/70 p-4">
            <p class="whitespace-pre-line text-sm leading-6 text-red-800">
              {{ errorModalMessage }}
            </p>
          </div>

          <div class="flex justify-end">
            <UButton
              color="primary"
              icon="i-lucide-check-circle"
              @click="errorModalOpen = false"
            >
              Mengerti
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
