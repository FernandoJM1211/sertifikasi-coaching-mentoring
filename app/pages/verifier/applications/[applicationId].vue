<template>

  <div class="space-y-6">

    <!-- Page Header -->

    <div class="flex items-start justify-between gap-4">

      <div>

        <h1 class="text-2xl font-semibold text-slate-900">

          Detail Pengajuan

        </h1>

        <p class="mt-1 text-sm text-slate-500">

          Pemeriksaan data dan dokumen pendaftaran sertifikasi.

        </p>

      </div>

      <div class="flex items-center gap-3">

        <UBadge
          v-if="application"
          :label="applicationStatusLabel"
          :color="applicationStatusColor"
          variant="soft"
        />

        <UButton
          :to="application ? `/verifier/periods/${application.period_id}` : '/verifier/periods'"
          label="Kembali"

          icon="i-lucide-arrow-left"

          color="neutral"

          variant="outline"

        />

      </div>

    </div>

    <!-- Loading -->

    <UCard v-if="loading">

      <div class="flex items-center justify-center py-16">

        <UIcon

          name="i-lucide-loader-circle"

          class="size-7 animate-spin text-primary"

        />

        <span class="ml-3 text-sm text-slate-500">

          Memuat detail pengajuan...

        </span>

      </div>

    </UCard>

    <!-- Error -->

    <UAlert

      v-else-if="errorMessage"

      icon="i-lucide-circle-alert"

      color="error"

      variant="soft"

      :title="errorMessage"

    />

    <template v-else-if="application">

      <UAlert
        v-if="!canVerifyApplication"
        color="neutral"
        variant="soft"
        icon="i-lucide-eye"
        title="Mode lihat saja"
        description="Pengajuan ini sudah diputuskan. Data dan dokumen dapat dilihat, tetapi keputusan tidak dapat diubah."
      />

      <!-- ========================= -->

      <!-- DATA PESERTA -->

      <!-- ========================= -->

      <UCard>

        <template #header>

          <div>

            <h2 class="text-base font-semibold text-slate-900">

              Data Peserta

            </h2>

            <p class="mt-1 text-sm text-slate-500">

              Informasi yang disampaikan pada saat pendaftaran.

            </p>

          </div>

        </template>

        <!-- Selalu 2 kolom -->

        <div class="participant-grid">

          <!-- Nama Lengkap -->

          <div class="participant-field min-w-0">

            <p class="text-sm font-medium text-slate-500">

              Nama Lengkap

            </p>

            <p

              class="mt-2 truncate text-sm font-medium text-slate-900"

              :title="application.full_name_snapshot"

            >

              {{ application.full_name_snapshot }}

            </p>

          </div>

          <!-- NIP -->

          <div class="participant-field min-w-0">

            <p class="text-sm font-medium text-slate-500">

              NIP

            </p>

            <p class="mt-2 truncate text-sm font-medium text-slate-900">

              {{ application.nip_snapshot }}

            </p>

          </div>

          <!-- Instansi -->

          <div class="participant-field min-w-0">

            <p class="text-sm font-medium text-slate-500">

              Instansi

            </p>

            <p

              class="mt-2 truncate text-sm font-medium text-slate-900"

              :title="application.institution_name"

            >

              {{ application.institution_name }}

            </p>

          </div>

          <!-- Wilayah -->

          <div class="participant-field min-w-0">

            <p class="text-sm font-medium text-slate-500">

              Wilayah

            </p>

            <p class="mt-2 truncate text-sm font-medium text-slate-900">

              {{ application.region }}

            </p>

          </div>

          <!-- Email -->

          <div class="participant-field min-w-0">

            <p class="text-sm font-medium text-slate-500">

              Email

            </p>

            <p

              class="mt-2 truncate text-sm font-medium text-slate-900"

              :title="application.email_snapshot"

            >

              {{ application.email_snapshot }}

            </p>

          </div>

          <!-- WhatsApp -->

          <div class="participant-field min-w-0">

            <p class="text-sm font-medium text-slate-500">

              WhatsApp

            </p>

            <p class="mt-2 truncate text-sm font-medium text-slate-900">

              {{ application.phone_snapshot }}

            </p>

          </div>

          <!-- Pendidikan -->

          <div class="participant-field min-w-0">

            <p class="text-sm font-medium text-slate-500">

              Pendidikan

            </p>

            <p class="mt-2 truncate text-sm font-medium text-slate-900">

              {{ application.last_education }}

            </p>

          </div>

          <!-- Jabatan -->

          <div class="participant-field min-w-0">

            <p class="text-sm font-medium text-slate-500">

              Jabatan

            </p>

            <p

              class="mt-2 truncate text-sm font-medium text-slate-900"

              :title="application.position"

            >

              {{ application.position }}

            </p>

          </div>

          <!-- Tanggal Pengajuan -->

          <div class="min-w-0">

            <p class="text-sm font-medium text-slate-500">

              Tanggal Pengajuan

            </p>

            <p class="mt-2 truncate text-sm font-medium text-slate-900">

              {{ formatDate(application.submitted_at) }}

            </p>

          </div>

          <!-- ID Pengajuan -->

          <div class="min-w-0">

            <p class="text-sm font-medium text-slate-500">

              ID Pengajuan

            </p>

            <p class="mt-2 truncate text-sm font-medium text-slate-900">

              {{ application.application_id }}

            </p>

          </div>

        </div>

      </UCard>

      <!-- ========================= -->

      <!-- DOKUMEN PERSYARATAN -->

      <!-- ========================= -->

      <UCard>

        <template #header>

          <div>

            <h2 class="text-base font-semibold text-slate-900">

              Dokumen Persyaratan

            </h2>

            <p class="mt-1 text-sm text-slate-500">

              Periksa berkas yang diunggah peserta melalui fitur preview.

            </p>

          </div>

        </template>

        <!-- Selalu 2 kolom -->

        <div class="grid grid-cols-2 gap-5">

          <div

            v-for="document in documents"

            :key="document.application_document_id"

            class="flex min-h-[190px] items-center gap-5 rounded-xl border border-dashed border-slate-300 p-5 transition hover:border-primary/40 hover:bg-slate-50/50"

          >

            <!-- Icon -->

            <div

              class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"

            >

              <UIcon

                :name="getDocumentIcon(document.document_type)"

                class="size-7"

              />

            </div>

            <!-- Content -->

            <div class="min-w-0 flex-1">

              <!-- Nama dokumen -->

              <p

                class="truncate font-semibold text-slate-900"

                :title="getDocumentLabel(document.document_type)"

              >

                {{ getDocumentLabel(document.document_type) }}

              </p>

              <!-- Nama file -->

              <p

                v-if="document.file"

                class="mt-2 truncate text-sm text-slate-500"

                :title="document.file.original_file_name"

              >

                {{ document.file.original_file_name }}

              </p>

              <p

                v-else

                class="mt-2 text-sm text-red-500"

              >

                File tidak ditemukan.

              </p>

              <!-- Actions -->

              <div class="mt-4 flex items-center gap-2">

                <!-- Preview -->

                <UButton

                  v-if="document.file?.file_url"

                  label="Lihat Dokumen"

                  icon="i-lucide-eye"

                  color="primary"

                  size="sm"

                  @click="openDocumentPreview(document)"

                />

              </div>

            </div>

          </div>

        </div>

      </UCard>

<!-- ========================= -->

      <!-- CATATAN VERIFIKATOR -->

      <!-- ========================= -->

      <UCard>

        <template #header>

          <div>

            <h2 class="text-base font-semibold text-slate-900">

              Catatan Verifikator

            </h2>

            <p class="mt-1 text-sm text-slate-500">

              Catatan pemeriksaan terhadap pengajuan.

            </p>

          </div>

        </template>

        <div class="space-y-3">

          <UTextarea

            v-model="verificationNote"
            :rows="5"
            :disabled="!canVerifyApplication"

            placeholder="Tulis catatan pemeriksaan terhadap pengajuan..."

            class="w-full"

          />

          <div v-if="canVerifyApplication" class="flex justify-end">
            <UButton
              label="Simpan Catatan"

              icon="i-lucide-save"

              color="primary"

              :loading="savingNote"

              :disabled="savingNote"

              @click="saveVerificationNote"

            />

          </div>

        </div>

      </UCard>

<!-- ========================= -->

<!-- KEPUTUSAN VERIFIKASI -->

<!-- ========================= -->

<UCard v-if="canVerifyApplication">

  <template #header>

    <div>

      <h2 class="text-base font-semibold text-slate-900">

        Keputusan Verifikasi

      </h2>

      <p class="mt-1 text-sm text-slate-500">

        Tentukan hasil pemeriksaan terhadap data dan dokumen pengajuan.

      </p>

    </div>

  </template>

  <div class="space-y-5">

    <!--

      Pengingat ditempatkan dalam card informasi agar Verifikator

      memastikan pemeriksaan selesai sebelum menetapkan keputusan.

    -->

    <div class="verification-notice rounded-xl px-5 py-4">

      <p class="text-sm verification-notice-text">

        Pastikan seluruh data dan dokumen telah diperiksa sebelum memberikan keputusan.

      </p>

    </div>

    <div class="flex items-center justify-center gap-3">

      <UButton

        label="Tolak"

        color="error"

        icon="i-lucide-x"

        class="w-32 justify-center"

        :loading="submittingDecision"

        :disabled="submittingDecision"

        @click="openDecisionModal('DITOLAK')"

      />

      <UButton

        label="Terima"

        color="success"

        icon="i-lucide-check"

        class="w-32 justify-center"

        :loading="submittingDecision"

        :disabled="submittingDecision"

        @click="openDecisionModal('DITERIMA')"

      />

    </div>

  </div>

</UCard>

      <!-- ========================= -->

      <!-- PREVIEW DOCUMENT MODAL -->

      <!-- ========================= -->

      <UModal

        v-model:open="previewOpen"

        :title="

          selectedDocument?.file?.original_file_name ??

          'Preview Dokumen'

        "

        :description="

          selectedDocument

            ? getDocumentLabel(selectedDocument.document_type)

            : ''

        "

        :ui="{

          content: 'max-w-5xl',

        }"

      >

        <template #body>

          <div

            v-if="selectedDocument?.file"

            class="h-[70vh] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"

          >

            <iframe
              :src="documentPreviewUrl"
              class="h-full w-full"
              title="Preview Dokumen"
            />

          </div>

          <div

            v-else

            class="flex h-64 items-center justify-center text-sm text-slate-500"

          >

            Dokumen tidak dapat ditampilkan.

          </div>

        </template>

      </UModal>

      <!-- ========================= -->
      <!-- DECISION CONFIRMATION MODAL -->
      <!-- ========================= -->

      <UModal
        v-model:open="decisionModalOpen"
        :title="
          pendingDecision === 'DITERIMA'
            ? 'Terima Pengajuan'
            : 'Tolak Pengajuan'
        "
        :description="
          pendingDecision === 'DITERIMA'
            ? 'Pastikan seluruh data dan dokumen telah diperiksa sebelum menerima pengajuan.'
            : 'Pastikan seluruh data dan dokumen telah diperiksa sebelum menolak pengajuan.'
        "
      >
        <template #body>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm text-slate-700">
              {{
                pendingDecision === 'DITERIMA'
                  ? 'Apakah Anda yakin ingin menerima pengajuan ini?'
                  : 'Apakah Anda yakin ingin menolak pengajuan ini?'
              }}
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton
              label="Batal"
              color="neutral"
              variant="outline"
              :disabled="submittingDecision"
              @click="decisionModalOpen = false"
            />

            <UButton
              :label="
                pendingDecision === 'DITERIMA'
                  ? 'Ya, Terima'
                  : 'Ya, Tolak'
              "
              :color="
                pendingDecision === 'DITERIMA'
                  ? 'success'
                  : 'error'
              "
              :loading="submittingDecision"
              :disabled="submittingDecision"
              @click="submitApplicationDecision"
            />
          </div>
        </template>
      </UModal>

    </template>

  </div>

</template>

<script setup lang="ts">

type Application = {

  application_id: string

  person_id: string

  period_id: string

  category_id: string

  full_name_snapshot: string

  nip_snapshot: string

  institution_name: string

  region: string

  email_snapshot: string

  phone_snapshot: string

  last_education: string

  position: string

  application_status: string

  verification_note: string

  submitted_at: string

  created_at: string

  updated_at: string

}

type FileRecord = {

  file_id: string

  original_file_name: string

  storage_provider: string

  storage_file_id: string

  file_url: string

  mime_type: string

  file_size_bytes: string

  uploaded_by: string

  uploaded_at: string

  status: string

}

type ApplicationDocument = {

  application_document_id: string

  application_id: string

  document_type: string

  file_id: string

  is_required: string

  uploaded_at: string

  status: string

  created_at: string

  updated_at: string

  file: FileRecord | null

}

type ApplicationDetailResponse = {

  success: boolean

  data: {

    application: Application

    documents: ApplicationDocument[]

  }

}

definePageMeta({

  layout: 'verifier',

})

const route = useRoute()

const toast = useToast()

const application = ref<Application | null>(null)

const documents = ref<ApplicationDocument[]>([])

const loading = ref(false)

const errorMessage = ref('')

const verificationNote = ref('')

const savingNote = ref(false)

const submittingDecision = ref(false)

const decisionModalOpen = ref(false)

const pendingDecision = ref<
  'DITERIMA' | 'DITOLAK' | null
>(null)

const previewOpen = ref(false)

const selectedDocument = ref<ApplicationDocument | null>(null)

// Preview melalui backend agar tidak bergantung pada izin Google Drive pengguna.
const documentPreviewUrl = computed(() => {
  const document = selectedDocument.value
  if (!document) return ''
  return `/api/application-verifications/${applicationId.value}/documents/${document.application_document_id}/preview`
})

/*

 * Sementara menggunakan ID Verifikator untuk pengujian.

 * Setelah modul login selesai, nilai ini akan berasal

 * dari user yang sedang login.

 */

const verifierId = 'USR-VER-000001'

const applicationId = computed(() => {
  return String(route.params.applicationId)
})

// Pengajuan yang sudah diputuskan hanya dapat dibaca; keputusan awal tidak boleh diulang.
const canVerifyApplication = computed(
  () => application.value?.application_status === 'pending_verification',
)

const applicationStatusLabel = computed(() => {
  const labels: Record<string, string> = {
    pending_verification: 'Menunggu Verifikasi',
    accepted: 'Diterima',
    rejected: 'Ditolak',
  }
  return labels[application.value?.application_status ?? ''] ?? 'Status tidak diketahui'
})

const applicationStatusColor = computed(() => {
  const colors: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
    pending_verification: 'warning',
    accepted: 'success',
    rejected: 'error',
  }
  return colors[application.value?.application_status ?? ''] ?? 'neutral'
})

function getDocumentLabel(documentType: string) {

  const labels: Record<string, string> = {

    IJAZAH: 'Ijazah Terakhir',

    SK_JABATAN:

      'SK Jabatan Terakhir',

    SERTIFIKAT_COACHING_MENTORING:

      'Sertifikat Pelatihan Coaching dan Mentoring',

    BUKTI_PRAKTIK_COACHING_MENTORING:

      'Bukti Pengalaman Praktik Coaching dan Mentoring',

  }

  return labels[documentType] ?? documentType

}

function getDocumentIcon(documentType: string) {

  const icons: Record<string, string> = {

    IJAZAH:

      'i-lucide-graduation-cap',

    SK_JABATAN:

      'i-lucide-file-badge-2',

    SERTIFIKAT_COACHING_MENTORING:

      'i-lucide-award',

    BUKTI_PRAKTIK_COACHING_MENTORING:

      'i-lucide-briefcase-business',

  }

  return icons[documentType] ?? 'i-lucide-file-text'

}

function formatDate(value: string) {

  if (!value) {

    return '-'

  }

  return new Intl.DateTimeFormat('id-ID', {

    dateStyle: 'medium',

    timeStyle: 'short',

  }).format(new Date(value))

}

/**

 * Membuka preview dokumen di dalam modal.

 * Verifikator tidak perlu meninggalkan halaman detail.

 */

function openDocumentPreview(

  document: ApplicationDocument,

) {

  selectedDocument.value = document

  previewOpen.value = true

}

/**

 * Menyimpan hasil pemeriksaan dokumen.

 *

 * Status VALID/TIDAK_VALID ditentukan oleh Verifikator.

 * Setiap perubahan membuat record verifikasi baru,

 * sehingga riwayat pemeriksaan tetap tersimpan.

 */

async function saveVerificationNote() {
  if (!canVerifyApplication.value) return
  savingNote.value = true

  try {

    await $fetch(

      `/api/application-verifications/${applicationId.value}/note`,

      {

        method: 'PUT',

        body: {

          verificationNote: verificationNote.value,

        },

      },

    )

    if (application.value) {

      application.value.verification_note = verificationNote.value

    }

    alert('Catatan verifikator berhasil disimpan.')

  } catch (error: any) {

    console.error(

      'Gagal menyimpan catatan verifikator:',

      error,

    )

    alert(

      error?.data?.statusMessage ||

        error?.data?.message ||

        'Gagal menyimpan catatan verifikator.',

    )

  } finally {

    savingNote.value = false

  }

}

function openDecisionModal(
  verificationStatus: 'DITERIMA' | 'DITOLAK',
) {
  if (!canVerifyApplication.value) return
  pendingDecision.value = verificationStatus

  decisionModalOpen.value = true

}

async function submitApplicationDecision() {
  if (!canVerifyApplication.value || !pendingDecision.value) {

    return

  }

  const verificationStatus =

    pendingDecision.value

  submittingDecision.value = true

  try {

    await $fetch(

      '/api/application-verifications',

      {

        method: 'POST',

        body: {

          applicationId: applicationId.value,

          verifiedBy: verifierId,

          verificationStatus,

        },

      },

    )

    decisionModalOpen.value = false

    pendingDecision.value = null

    await navigateTo(`/verifier/periods/${application.value?.period_id ?? ''}`)


} catch (error: any) {
  console.error(
    'Gagal menyimpan keputusan verifikasi:',
    error,
  )

  const message =
    error?.data?.statusMessage ||
    error?.data?.message ||
    'Gagal menyimpan keputusan verifikasi.'

decisionModalOpen.value = false

  toast.add({
    title: 'Keputusan tidak dapat diproses',
    description: message,
    color: 'error',
  })
} finally {
  submittingDecision.value = false
}


}

async function fetchApplicationDetail() {

  loading.value = true

  errorMessage.value = ''

  try {

    const response =

      await $fetch<ApplicationDetailResponse>(

        `/api/application-verifications/${applicationId.value}`,

      )

    application.value =

      response.data.application

    verificationNote.value =

      response.data.application.verification_note ?? ''

    documents.value =

      response.data.documents

  } catch (error: any) {

    console.error(

      'Gagal mengambil detail pengajuan:',

      error,

    )

    errorMessage.value =

      error?.data?.statusMessage ||

      error?.data?.message ||

      'Gagal mengambil detail pengajuan.'

  } finally {

    loading.value = false

  }

}

onMounted(() => {

  fetchApplicationDetail()

})

</script>

<style scoped>

.participant-grid {

  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  column-gap: 48px;

  row-gap: 24px;

}

.participant-field {

  min-width: 0;

}

.verification-notice {

  border: 1px solid #93c5fd;

  background: #eff6ff;

}

.verification-notice-text {

  color: #2563eb;

}

@media (max-width: 768px) {

  .participant-grid {

    grid-template-columns: 1fr;

    row-gap: 28px;

  }

}

</style>
