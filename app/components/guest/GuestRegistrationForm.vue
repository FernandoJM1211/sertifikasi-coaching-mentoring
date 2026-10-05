<script setup lang="ts">
type FileField = {
  file: File | null
  error: string
}

const submitted = ref(false)

const activePeriod = {
  name: 'Periode Sertifikasi September 2026',
  category: 'Certified Public Sector Performance Coach and Mentor',
}

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
  diploma: {
    file: null,
    error: '',
  },
  appointment: {
    file: null,
    error: '',
  },
  trainingCertificate: {
    file: null,
    error: '',
  },
  practiceEvidence: {
    file: null,
    error: '',
  },
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

const submitting = ref(false)

const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MAX_FILE_SIZE = 5 * 1024 * 1024

const fileLabels: Record<string, string> = {
  diploma: 'Ijazah Terakhir',
  appointment: 'SK Jabatan Terakhir',
  trainingCertificate: 'Sertifikat Pelatihan Coaching dan Mentoring',
  practiceEvidence: 'Bukti Pengalaman Praktik Coaching dan Mentoring',
}

const fieldErrors = computed(() => ({
  fullName:
    !form.fullName.trim()
      ? 'Nama lengkap wajib diisi.'
      : '',

  nip:
    !form.nip.trim()
      ? 'NIP wajib diisi.'
      : !/^\d{18}$/.test(form.nip)
        ? 'NIP harus terdiri dari 18 digit.'
        : '',

  institution:
    !form.institution.trim()
      ? 'Nama instansi wajib diisi.'
      : '',

  region:
    !form.region.trim()
      ? 'Asal daerah wajib diisi.'
      : '',

  email:
    !form.email.trim()
      ? 'Email wajib diisi.'
      : !emailPattern.test(form.email)
        ? 'Format email tidak valid.'
        : '',

  whatsapp:
    !form.whatsapp.trim()
      ? 'Nomor WhatsApp wajib diisi.'
      : !/^\d{8,15}$/.test(form.whatsapp)
        ? 'Nomor WhatsApp harus berupa 8–15 digit angka.'
        : '',

  education:
    !form.education.trim()
      ? 'Pendidikan terakhir wajib diisi.'
      : '',

  position:
    !form.position.trim()
      ? 'Jabatan wajib diisi.'
      : '',
}))

const allFilesValid = computed(() => {
  return Object.values(files).every(
    (item) => item.file && !item.error,
  )
})

const allFieldsValid = computed(() => {
  return Object.values(fieldErrors.value).every(
    (error) => !error,
  )
})

const formValid = computed(() => {
  return allFieldsValid.value && allFilesValid.value
})

function markTouched(field: string) {
  touched[field] = true
}

function handleNipInput() {
  form.nip = form.nip.replace(/\D/g, '').slice(0, 18)
}

function handleWhatsappInput() {
  form.whatsapp = form.whatsapp
    .replace(/\D/g, '')
    .slice(0, 15)
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
    files[key].error =
      'Ukuran file maksimal 5 MB.'
    files[key].file = null
    return
  }

  files[key].file = file
}

function handleFileChange(
  key: string,
  event: Event,
) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null

  validateFile(key, file)
}

function removeFile(key: string) {
  files[key].file = null
  files[key].error = ''
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

async function submitRegistration() {
  touchAllFields()

  Object.keys(files).forEach((key) => {
    if (!files[key].file) {
      files[key].error =
        'Dokumen wajib diunggah.'
    }
  })

  if (!formValid.value) {
    return
  }

  submitting.value = true

  await new Promise((resolve) =>
    setTimeout(resolve, 700),
  )

  submitting.value = false
  submitted.value = true
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
  })

  Object.keys(touched).forEach((key) => {
    touched[key] = false
  })

  submitted.value = false
}

function errorFor(field: keyof typeof fieldErrors.value) {
  return touched[field] ? fieldErrors.value[field] : ''
}
</script>

<template>
  <div class="space-y-8">

    <!-- Success -->
    <template v-if="submitted">
      <UCard
        class="bg-white/95 shadow-sm"
      >
        <div class="flex flex-col items-center px-6 py-12 text-center">
          <div
            class="flex size-16 items-center justify-center rounded-full bg-green-100"
          >
            <UIcon
              name="i-lucide-check"
              class="size-8 text-green-600"
            />
          </div>

          <h1
            class="mt-6 text-2xl font-semibold text-slate-900"
          >
            Pendaftaran Berhasil Dikirim
          </h1>

          <p
            class="mt-3 max-w-xl text-sm leading-6 text-slate-500"
          >
            Data dan dokumen pendaftaran Anda telah berhasil
            dikirim dan selanjutnya akan diperiksa oleh
            Verifikator.
          </p>

          <div
            class="mt-6 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-5 text-left"
          >
            <div class="space-y-3">
              <div>
                <p class="text-xs text-slate-500">
                  Nama
                </p>

                <p class="text-sm font-medium text-slate-900">
                  {{ form.fullName }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">
                  NIP
                </p>

                <p class="text-sm font-medium text-slate-900">
                  {{ form.nip }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">
                  Periode
                </p>

                <p class="text-sm font-medium text-slate-900">
                  {{ activePeriod.name }}
                </p>
              </div>
            </div>
          </div>

          <p
            class="mt-6 text-xs leading-5 text-slate-500"
          >
            Mohon menunggu informasi selanjutnya dari
            penyelenggara sertifikasi.
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
        <div>
          <UBadge
            label="Pendaftaran Sertifikasi"
            color="primary"
            variant="subtle"
          />
        </div>

        <h1
          class="text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl"
        >
          Pendaftaran Sertifikasi Coaching dan Mentoring
        </h1>

        <p
          class="max-w-3xl text-sm leading-6 text-slate-500"
        >
          Silakan lengkapi data dan dokumen persyaratan
          pendaftaran dengan benar. Seluruh data dan dokumen
          wajib diisi sebelum pendaftaran dikirim.
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
          Coach dan Mentor Sektor Publik
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

      <!-- Baris 1 -->
      <div class="grid grid-cols-2 gap-5">

        <UFormField
          label="Nama Lengkap + Gelar"
          required
        >
          <UInput
            class="w-full"
            v-model="form.fullName"
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
            class="w-full"
            v-model="form.nip"
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

      <!-- Baris 2 -->
      <div class="grid grid-cols-2 gap-5">

        <UFormField
          label="Nama Instansi"
          required
        >
          <UInput
            class="w-full"
            v-model="form.institution"
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

        <UFormField
          label="Asal Daerah"
          required
        >
          <UInput
            class="w-full"
            v-model="form.region"
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

      <!-- Baris 3 -->
      <div class="grid grid-cols-2 gap-5">

        <UFormField label="Email" required>
          <UInput
            class="w-full"
            v-model="form.email"
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

        <UFormField
          label="Nomor WhatsApp"
          required
        >
          <UInput
            class="w-full"
            v-model="form.whatsapp"
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

      <!-- Baris 4 -->
      <div class="grid grid-cols-2 gap-5">

        <UFormField
          label="Pendidikan Terakhir"
          required
        >
          <UInput
            class="w-full"
            v-model="form.education"
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

        <UFormField
          label="Jabatan"
          required
        >
          <UInput
            class="w-full"
            v-model="form.position"
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
      Seluruh dokumen wajib dalam format PDF dengan ukuran
      maksimal 5 MB per file.
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
          class="flex items-center justify-between gap-6"
        >

          <!-- Document Info -->
          <div class="flex min-w-0 items-center gap-3">

            <!-- Icon -->
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
                        : key === 'practiceEvidence'
                          ? 'i-lucide-briefcase-business'
                          : 'i-lucide-file-text'
                "
                class="size-5"
              />
            </div>

            <!-- Text -->
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
                class="mt-1 truncate text-xs font-medium text-success-600"
              >
                {{ item.file.name }}
              </p>

              <p
                v-else
                class="mt-1 text-xs text-slate-400"
              >
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

          <!-- Upload Action -->
          <div class="shrink-0">

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

      <!-- Confirmation -->
      <section>
        <UCard class="bg-white/90 shadow-sm">
          <div class="space-y-4">
            <div>
              <h2 class="text-base font-semibold text-slate-900">
                4. Konfirmasi Pendaftaran
              </h2>

              <p class="mt-1 text-sm leading-6 text-slate-600">
                Pastikan seluruh data dan dokumen yang Anda
                masukkan sudah benar sebelum mengirim
                pendaftaran.
              </p>
            </div>

            <div
              class="rounded-xl border border-primary/25 bg-primary/5 p-5"
            >
              <p class="text-sm leading-6 text-primary">
                Setelah pendaftaran dikirim, data dan dokumen
                tidak dapat diubah melalui halaman ini dan akan
                masuk ke tahap verifikasi administrasi.
              </p>
            </div>

            <div class="flex justify-center">
              <UButton
                size="lg"
                color="primary"
                :loading="submitting"
                :disabled="submitting"
                label="Kirim Pendaftaran"
                icon="i-lucide-send"
                @click="submitRegistration"
              />
            </div>
          </div>
        </UCard>
      </section>

    </template>
  </div>
</template>