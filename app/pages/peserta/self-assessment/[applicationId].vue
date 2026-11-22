<script setup lang="ts">
import Cmsp01Form, { type Cmsp01Initial } from '~/components/certification/Cmsp01Form.vue'
import Cmsp02Form, { type Cmsp02Initial } from '~/components/certification/Cmsp02Form.vue'

definePageMeta({ layout: 'peserta' })
useHead({ title: 'Formulir Self Assessment' })

type AssessmentTab = 'CMSP01' | 'CMSP02'

type SelfAssessmentData = Cmsp01Initial & {
  application: { application_id: string, application_status: string }
  status: string
  submittedAt: string
  editing: { allowed: boolean, message: string }
  review: { cmsp01_note: string, cmsp02_note: string, reviewed_at: string } | null
  cmsp02: Cmsp02Initial
}

const route = useRoute()
const toast = useToast()
const applicationId = computed(() => String(route.params.applicationId || ''))
const apiPath = computed(
  () => `/api/peserta/applications/${encodeURIComponent(applicationId.value)}/self-assessment`,
)

const activeTab = ref<AssessmentTab>('CMSP01')
const loading = ref(true)
const errorMessage = ref('')
const data = ref<SelfAssessmentData | null>(null)
/** Dinaikkan setiap data dimuat ulang agar form dibuat ulang dari data server. */
const formVersion = ref(0)

const cmsp01Ref = ref<InstanceType<typeof Cmsp01Form> | null>(null)
const cmsp02Ref = ref<InstanceType<typeof Cmsp02Form> | null>(null)

const tabs = [
  {
    id: 'CMSP01' as const,
    number: '01',
    title: 'Formulir Permohonan Sertifikasi',
    description: 'Data peserta dan persyaratan administrasi',
  },
  {
    id: 'CMSP02' as const,
    number: '02',
    title: 'Self Assessment Teknis',
    description: 'Penilaian mandiri kompetensi dan bukti pendukung',
  },
]

const status = ref('NEW')
const lastSavedAt = ref('')
const savedSnapshot = ref('')

const isEditable = computed(() => data.value?.editing.allowed ?? false)

/** Catatan perbaikan terakhir, hanya saat status Perlu Perbaikan. */
const revisionNotes = computed(() => {
  const review = status.value === 'REVISION_REQUESTED' ? data.value?.review : null

  return {
    cmsp01: review?.cmsp01_note?.trim() ?? '',
    cmsp02: review?.cmsp02_note?.trim() ?? '',
  }
})

const currentPayload = computed(() => {
  if (!cmsp01Ref.value || !cmsp02Ref.value) return null

  return {
    cmsp01: cmsp01Ref.value.payload,
    cmsp02: cmsp02Ref.value.payload,
  }
})

const currentSnapshot = computed(() => JSON.stringify(currentPayload.value))

const isDirty = computed(() =>
  isEditable.value &&
  Boolean(currentPayload.value) &&
  currentSnapshot.value !== savedSnapshot.value,
)

async function loadSelfAssessment() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: SelfAssessmentData }>(apiPath.value, {
      credentials: 'include',
    })

    data.value = response.data
    status.value = response.data.status
    lastSavedAt.value = ''
    formVersion.value++

    // Form baru dirender setelah loading selesai; snapshot diambil sesudahnya agar
    // bar Simpan Draft hanya muncul setelah peserta benar-benar mengubah isian.
    loading.value = false
    await nextTick()
    savedSnapshot.value = currentSnapshot.value
  } catch (error: unknown) {
    const errorData = (error as { data?: { statusMessage?: string } }).data
    errorMessage.value =
      errorData?.statusMessage || 'Data self assessment belum dapat dimuat. Silakan coba kembali.'
  } finally {
    loading.value = false
  }
}

const saving = ref(false)
const submitting = ref(false)

function showError(title: string, error: unknown) {
  const errorData = (error as { data?: { statusMessage?: string } }).data

  toast.add({
    title,
    description: errorData?.statusMessage || 'Terjadi kesalahan. Silakan coba lagi.',
    color: 'error',
    icon: 'i-lucide-circle-x',
  })
}

/** Menyimpan CMSP-01 dan CMSP-02 sekaligus. */
async function saveDraft(options: { silent?: boolean } = {}): Promise<boolean> {
  if (!currentPayload.value || saving.value) return false

  saving.value = true

  try {
    const snapshot = currentSnapshot.value
    const response = await $fetch<{ data: { status: string, savedAt: string } }>(apiPath.value, {
      method: 'PUT',
      body: currentPayload.value,
      credentials: 'include',
    })

    status.value = response.data.status
    lastSavedAt.value = response.data.savedAt
    savedSnapshot.value = snapshot

    if (!options.silent) {
      toast.add({
        title: 'Draft tersimpan',
        description: 'Perubahan CMSP-01 dan CMSP-02 berhasil disimpan.',
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
    }

    return true
  } catch (error: unknown) {
    showError('Gagal menyimpan draft', error)
    return false
  } finally {
    saving.value = false
  }
}

const submitModalOpen = ref(false)

async function confirmSubmit() {
  if (submitting.value) return

  submitting.value = true

  try {
    // Simpan perubahan terakhir sebelum dikirim.
    const saved = await saveDraft({ silent: true })
    if (!saved) return

    await $fetch(`${apiPath.value}/submit`, {
      method: 'POST',
      credentials: 'include',
    })

    submitModalOpen.value = false

    toast.add({
      title: 'Self assessment terkirim',
      description: 'CMSP-01 dan CMSP-02 berhasil dikirim untuk diverifikasi.',
      color: 'success',
      icon: 'i-lucide-circle-check',
    })

    await loadSelfAssessment()
  } catch (error: unknown) {
    showError('Gagal mengirim self assessment', error)
  } finally {
    submitting.value = false
  }
}

// Peringatan jika meninggalkan halaman dengan perubahan belum disimpan.
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return

  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (isDirty.value) {
    return window.confirm('Ada perubahan yang belum disimpan. Tinggalkan halaman ini?')
  }
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  loadSelfAssessment()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <UContainer class="py-6">
    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-16 w-full" />
      <USkeleton class="h-12 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else-if="errorMessage || !data" class="space-y-4">
      <div class="flex justify-end">
        <UButton
          to="/peserta/self-assessment"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
        >
          Kembali
        </UButton>
      </div>

      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Self Assessment Tidak Dapat Dibuka"
        :description="errorMessage"
      >
        <template #actions>
          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="loadSelfAssessment">
            Muat Ulang
          </UButton>
        </template>
      </UAlert>
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm font-medium text-primary">Pengajuan Sertifikasi</p>
          <h1 class="mt-1 text-2xl font-semibold text-blue-500">
            {{ data.certification.period_name || 'Formulir Self Assessment' }}
          </h1>
          <p class="mt-2 text-sm text-slate-600">
            Lengkapi kedua formulir berikut, lalu kirim bersamaan untuk diverifikasi.
          </p>
        </div>

        <UButton
          to="/peserta/self-assessment"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
          class="shrink-0"
        >
          Kembali
        </UButton>
      </div>

      <!-- Form terkunci -->
      <UAlert
        v-if="!isEditable"
        color="info"
        variant="subtle"
        icon="i-lucide-lock"
        title="Formulir Hanya Dapat Dibaca"
        :description="data.editing.message"
        class="mb-6"
      />

      <div class="mb-6 grid gap-3 sm:grid-cols-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-xl border p-4 text-left transition"
          :class="activeTab === tab.id
            ? 'border-primary bg-blue-50 ring-1 ring-blue-200'
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
              <span class="mt-1 block text-sm text-slate-600">{{ tab.description }}</span>
              <span
                v-if="tab.id === 'CMSP01' ? revisionNotes.cmsp01 : revisionNotes.cmsp02"
                class="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600"
              >
                <span class="size-2 rounded-full bg-amber-400" />
                Ada catatan perbaikan
              </span>
            </span>
          </div>
        </button>
      </div>

      <div v-show="activeTab === 'CMSP01'" class="space-y-6">
        <!-- Catatan perbaikan ditampilkan terpisah di tab masing-masing form -->
        <CertificationSelfAssessmentReviewNote
          v-if="revisionNotes.cmsp01"
          title="Catatan Perbaikan CMSP-01 dari Verifikator"
          :note="revisionNotes.cmsp01"
          :reviewed-at="data.review?.reviewed_at"
          class="mx-auto max-w-5xl"
        />
        <Cmsp01Form
          :key="`cmsp01-${formVersion}`"
          ref="cmsp01Ref"
          :application-id="applicationId"
          :initial="data"
          :readonly="!isEditable"
          :status="status"
        />
      </div>
      <div v-show="activeTab === 'CMSP02'" class="space-y-6">
        <CertificationSelfAssessmentReviewNote
          v-if="revisionNotes.cmsp02"
          title="Catatan Perbaikan CMSP-02 dari Verifikator"
          :note="revisionNotes.cmsp02"
          :reviewed-at="data.review?.reviewed_at"
        />
        <Cmsp02Form
          :key="`cmsp02-${formVersion}`"
          ref="cmsp02Ref"
          :application-id="applicationId"
          :initial="data.cmsp02"
          :readonly="!isEditable"
          :status="status"
        />
      </div>

      <!-- Kirim: aktif hanya jika kedua form lengkap -->
      <CertificationSelfAssessmentSubmitCard
        v-if="isEditable"
        :progress-cmsp01="cmsp01Ref?.progress ?? 0"
        :progress-cmsp02="cmsp02Ref?.progress ?? 0"
        :declaration-accepted="cmsp01Ref?.declarationAccepted ?? false"
        :submitting="submitting"
        :disabled="saving"
        class="mt-6"
        @submit="submitModalOpen = true"
      />

      <!-- Simpan draft melayang: hanya muncul jika ada perubahan yang belum disimpan -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-4 opacity-0"
        leave-active-class="transition duration-200 ease-in"
        leave-to-class="translate-y-4 opacity-0"
      >
      <CertificationSelfAssessmentDraftBar
        v-if="isEditable && (isDirty || saving)"
        :dirty="isDirty"
        :saving="saving"
        :disabled="submitting"
        :last-saved-at="lastSavedAt"
        class="mt-6"
        @save="saveDraft()"
      />
      </Transition>

      <UModal
        v-model:open="submitModalOpen"
        :dismissible="!submitting"
        title="Kirim Self Assessment?"
        description="CMSP-01 dan CMSP-02 akan dikirim bersamaan untuk diverifikasi."
      >
        <template #body>
          <div class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <UIcon name="i-lucide-info" class="mt-0.5 size-5 shrink-0 text-blue-600" />
            <p class="text-sm leading-6 text-slate-600">
              Setelah dikirim, formulir tidak dapat diubah lagi kecuali Verifikator
              meminta perbaikan. Pastikan seluruh data dan dokumen sudah benar.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="submitting"
              @click="submitModalOpen = false"
            >
              Batal
            </UButton>
            <UButton
              icon="i-lucide-send"
              :loading="submitting"
              @click="confirmSubmit"
            >
              Ya, Kirim
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UContainer>
</template>
