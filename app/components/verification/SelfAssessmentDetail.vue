<script setup lang="ts">
/**
 * Detail verifikasi CMSP-01 & CMSP-02 seorang peserta (Verifikator & Super Admin).
 * Form ditampilkan read-only memakai komponen yang sama dengan halaman peserta.
 * Contoh: <VerificationSelfAssessmentDetail :application-id="id" back-path="/verifikator/self-assessments" />
 */
import Cmsp01Form, { type Cmsp01Initial } from '~/components/certification/Cmsp01Form.vue'
import Cmsp02Form, { type Cmsp02Initial } from '~/components/certification/Cmsp02Form.vue'

const props = defineProps<{
  applicationId: string
  /** Halaman daftar untuk tombol Kembali. */
  backPath: string
}>()

type Review = {
  review_id: string
  decision: 'VERIFIED' | 'REVISION_REQUESTED'
  cmsp01_note: string
  cmsp02_note: string
  reviewed_by_name: string
  reviewed_at: string
}

type VerificationData = Omit<Cmsp01Initial, 'profile'> & {
  status: string
  submittedAt: string
  revisionCount: number
  cmsp02: Cmsp02Initial
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  canReview: boolean
  reviews: Review[]
}

const toast = useToast()

const apiPath = computed(
  () => `/api/self-assessment-verifications/${encodeURIComponent(props.applicationId)}`,
)
const filesBasePath = computed(() => `${apiPath.value}/files`)

const loading = ref(true)
const errorMessage = ref('')
const data = ref<VerificationData | null>(null)
const formVersion = ref(0)

const formInitial = computed<Cmsp01Initial | null>(() =>
  data.value ? { ...data.value, profile: null } : null,
)

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: VerificationData }>(apiPath.value, {
      credentials: 'include',
    })

    data.value = response.data
    formVersion.value++
  } catch (error: unknown) {
    const errorData = (error as { data?: { statusMessage?: string } }).data
    errorMessage.value = errorData?.statusMessage || 'Self assessment belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* Tab form */
type AssessmentTab = 'CMSP01' | 'CMSP02'
const activeTab = ref<AssessmentTab>('CMSP01')

const tabs = [
  { id: 'CMSP01' as const, number: '01', title: 'Formulir Permohonan Sertifikasi', description: 'Data peserta dan persyaratan administrasi' },
  { id: 'CMSP02' as const, number: '02', title: 'Self Assessment Teknis', description: 'Evidence per unit kompetensi' },
]

const applicantName = computed(() => data.value?.cmsp01.applicant?.fullName ?? '')
const applicantNip = computed(() => data.value?.cmsp01.applicant?.nip ?? '')
const applicantInstitution = computed(() => data.value?.cmsp01.applicant?.institution ?? '')

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/* Keputusan */
const NOTE_MAX_LENGTH = 2000
const cmsp01Note = ref('')
const cmsp02Note = ref('')
const pendingDecision = ref<Review['decision'] | null>(null)
const submitting = ref(false)

const hasRevisionNote = computed(() => Boolean(cmsp01Note.value.trim() || cmsp02Note.value.trim()))

function askDecision(decision: Review['decision']) {
  if (decision === 'REVISION_REQUESTED' && !hasRevisionNote.value) {
    toast.add({
      title: 'Catatan perbaikan belum diisi',
      description: 'Isi catatan pada tab CMSP-01 atau CMSP-02 agar peserta tahu apa yang perlu diperbaiki.',
      color: 'warning',
      icon: 'i-lucide-circle-alert',
    })
    return
  }

  pendingDecision.value = decision
}

const confirmOpen = computed({
  get: () => pendingDecision.value !== null,
  set: (value: boolean) => {
    if (!value && !submitting.value) pendingDecision.value = null
  },
})

async function confirmDecision() {
  if (!pendingDecision.value || submitting.value) return

  submitting.value = true

  try {
    const response = await $fetch<{ message: string }>(`${apiPath.value}/review`, {
      method: 'POST',
      body: {
        decision: pendingDecision.value,
        cmsp01Note: cmsp01Note.value,
        cmsp02Note: cmsp02Note.value,
      },
      credentials: 'include',
    })

    toast.add({
      title: 'Keputusan tersimpan',
      description: response.message,
      color: 'success',
      icon: 'i-lucide-circle-check',
    })

    pendingDecision.value = null
    cmsp01Note.value = ''
    cmsp02Note.value = ''
    await load()
  } catch (error: unknown) {
    const errorData = (error as { data?: { statusMessage?: string } }).data

    toast.add({
      title: 'Gagal menyimpan keputusan',
      description: errorData?.statusMessage || 'Terjadi kesalahan. Silakan coba lagi.',
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- Lebar konten sama dengan halaman self assessment peserta & penilaian asesor (UContainer). -->
  <UContainer class="space-y-6 pb-8">
    <!-- Header: judul kiri; Kembali + status kanan -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold text-slate-900">Detail Self Assessment</h1>
        <p class="mt-1 text-sm text-slate-500">
          Pemeriksaan CMSP-01 dan CMSP-02 peserta serta keputusan verifikasi.
        </p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton :to="backPath" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <CertificationSelfAssessmentStatusBadge v-if="data" :status="data.status" />
      </div>
    </div>

    <div v-if="loading && !data" class="space-y-4">
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UAlert
      v-else-if="errorMessage || !data || !formInitial"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Self Assessment Tidak Dapat Dibuka"
      :description="errorMessage"
    >
      <template #actions>
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="load">
          Muat Ulang
        </UButton>
      </template>
    </UAlert>

    <template v-else>
      <!-- Ringkasan peserta -->
      <UCard class="border border-primary/30 bg-white/90 shadow-sm">
        <dl class="grid gap-x-6 gap-y-5 text-center text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-slate-500">Nama Peserta</dt>
            <dd class="mt-1 font-medium text-slate-900">{{ applicantName || '-' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">NIP</dt>
            <dd class="mt-1 font-medium text-slate-900">{{ applicantNip || '-' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Instansi</dt>
            <dd class="mt-1 font-medium text-slate-900">{{ applicantInstitution || '-' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Periode</dt>
            <dd class="mt-1 font-medium text-slate-900">{{ data.certification.period_name || '-' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Dikirim</dt>
            <dd class="mt-1 font-medium text-slate-900">{{ formatDateTime(data.submittedAt) }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Perbaikan</dt>
            <dd class="mt-1 font-medium text-slate-900">
              {{ data.revisionCount > 0 ? `${data.revisionCount} kali` : 'Belum pernah' }}
            </dd>
          </div>
        </dl>
      </UCard>

      <UAlert
        v-if="data.status === 'SUBMITTED' && !data.stage.open"
        color="warning"
        variant="subtle"
        icon="i-lucide-calendar-clock"
        title="Keputusan belum dapat diberikan"
        :description="`Tahap Verifikasi Self Assessment: ${data.stage.message}`"
      />

      <!-- Riwayat keputusan -->
      <UCard v-if="data.reviews.length > 0" class="bg-white/90 shadow-sm">
        <template #header>
          <h2 class="font-semibold text-slate-900">Riwayat Verifikasi</h2>
        </template>

        <ol class="space-y-4">
          <li
            v-for="review in data.reviews"
            :key="review.review_id"
            class="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <UBadge
                :color="review.decision === 'VERIFIED' ? 'success' : 'warning'"
                variant="subtle"
              >
                {{ review.decision === 'VERIFIED' ? 'Terverifikasi' : 'Minta Perbaikan' }}
              </UBadge>
              <span class="text-xs text-slate-500">
                {{ review.reviewed_by_name }} · {{ formatDateTime(review.reviewed_at) }}
              </span>
            </div>
            <div
              v-if="review.cmsp01_note || review.cmsp02_note"
              class="mt-3 space-y-1 text-sm leading-6 text-slate-700"
            >
              <p v-if="review.cmsp01_note" class="whitespace-pre-line">
                <strong>CMSP-01:</strong> {{ review.cmsp01_note }}
              </p>
              <p v-if="review.cmsp02_note" class="whitespace-pre-line">
                <strong>CMSP-02:</strong> {{ review.cmsp02_note }}
              </p>
            </div>
          </li>
        </ol>
      </UCard>

      <!-- Tab form -->
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-xl border p-4 text-left transition"
          :class="activeTab === tab.id
            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
            : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="activeTab = tab.id"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
              :class="activeTab === tab.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'"
            >
              {{ tab.number }}
            </span>
            <span class="min-w-0">
              <span class="block font-semibold text-slate-900">{{ tab.title }}</span>
              <span class="mt-1 block text-sm text-slate-500">{{ tab.description }}</span>
              <span
                v-if="(tab.id === 'CMSP01' ? cmsp01Note : cmsp02Note).trim()"
                class="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600"
              >
                <span class="size-2 rounded-full bg-amber-400" />
                Catatan perbaikan terisi
              </span>
            </span>
          </div>
        </button>
      </div>

      <div v-show="activeTab === 'CMSP01'" class="space-y-6">
        <Cmsp01Form
          :key="`cmsp01-${formVersion}`"
          :application-id="applicationId"
          :initial="formInitial"
          :files-base-path="filesBasePath"
          :status="data.status"
          readonly
          review-mode
        />
        <UCard v-if="data.canReview" class="border border-primary/30 bg-white/90 shadow-sm">
          <UFormField
            label="Catatan Verifikator untuk CMSP-01"
            description="Isi jika ada bagian CMSP-01 yang perlu diperbaiki peserta."
            :hint="`${cmsp01Note.length}/${NOTE_MAX_LENGTH}`"
          >
            <UTextarea
              v-model="cmsp01Note"
              :rows="4"
              :maxlength="NOTE_MAX_LENGTH"
              placeholder="Contoh: Dokumen SK Jabatan belum yang terbaru."
              class="mt-1 w-full"
            />
          </UFormField>
        </UCard>
      </div>
      <div v-show="activeTab === 'CMSP02'" class="space-y-6">
        <Cmsp02Form
          :key="`cmsp02-${formVersion}`"
          :application-id="applicationId"
          :initial="data.cmsp02"
          :files-base-path="filesBasePath"
          :status="data.status"
          readonly
          review-mode
        />
        <UCard v-if="data.canReview" class="border border-primary/30 bg-white/90 shadow-sm">
          <UFormField
            label="Catatan Verifikator untuk CMSP-02"
            description="Isi jika ada bagian CMSP-02 yang perlu diperbaiki peserta."
            :hint="`${cmsp02Note.length}/${NOTE_MAX_LENGTH}`"
          >
            <UTextarea
              v-model="cmsp02Note"
              :rows="4"
              :maxlength="NOTE_MAX_LENGTH"
              placeholder="Contoh: Evidence Unit 3 belum relevan dengan elemen kompetensi."
              class="mt-1 w-full"
            />
          </UFormField>
        </UCard>
      </div>

      <!-- Keputusan verifikator (berlaku untuk kedua form) -->
      <UCard v-if="data.canReview" class="border border-primary/30 bg-white/90 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h2 class="font-semibold text-slate-900">Keputusan Verifikasi</h2>
            <p class="mt-1 text-sm text-slate-500">
              Catatan perbaikan:
              <span :class="cmsp01Note.trim() ? 'font-medium text-slate-700' : ''">
                CMSP-01 {{ cmsp01Note.trim() ? 'terisi' : 'kosong' }}
              </span>
              ·
              <span :class="cmsp02Note.trim() ? 'font-medium text-slate-700' : ''">
                CMSP-02 {{ cmsp02Note.trim() ? 'terisi' : 'kosong' }}
              </span>
            </p>
          </div>

          <div class="flex shrink-0 flex-col-reverse gap-3 sm:flex-row">
            <UButton
              color="warning"
              variant="outline"
              icon="i-lucide-pencil-line"
              class="justify-center"
              @click="askDecision('REVISION_REQUESTED')"
            >
              Minta Perbaikan
            </UButton>
            <UButton
              color="success"
              icon="i-lucide-circle-check"
              class="justify-center"
              @click="askDecision('VERIFIED')"
            >
              Verifikasi
            </UButton>
          </div>
        </div>
      </UCard>

      <UModal
        v-model:open="confirmOpen"
        :dismissible="!submitting"
        :title="pendingDecision === 'VERIFIED' ? 'Verifikasi self assessment?' : 'Minta perbaikan?'"
        :description="pendingDecision === 'VERIFIED'
          ? 'CMSP-01 dan CMSP-02 dinyatakan sesuai dan tidak dapat diubah lagi oleh peserta.'
          : 'Self assessment dikembalikan ke peserta beserta catatan untuk diperbaiki dan dikirim ulang.'"
      >
        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="submitting"
              @click="pendingDecision = null"
            >
              Batal
            </UButton>
            <UButton
              :color="pendingDecision === 'VERIFIED' ? 'success' : 'warning'"
              :loading="submitting"
              @click="confirmDecision"
            >
              {{ pendingDecision === 'VERIFIED' ? 'Ya, Verifikasi' : 'Ya, Minta Perbaikan' }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UContainer>
</template>
