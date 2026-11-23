<script setup lang="ts">
/**
 * Penilaian CMSP-02 satu peserta.
 * - Asesor Teknis yang ditugaskan: memilih K/BK per unit, catatan umum, dan rekomendasi;
 *   simpan draf atau kirim (terkunci) selama tahap Penilaian Asesor dibuka.
 * - Super Admin: melihat (read-only) dan dapat membuka kunci penilaian terkirim.
 * Evidence CMSP-02 ditampilkan memakai komponen form peserta (read-only).
 */
import Cmsp02Form, { type Cmsp02Initial } from '~/components/certification/Cmsp02Form.vue'
import {
  TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH,
  TECHNICAL_ASSESSMENT_STATUS_LABELS,
  TECHNICAL_RECOMMENDATIONS,
  TECHNICAL_RECOMMENDATION_LABELS,
  UNIT_RESULTS,
  UNIT_RESULT_LABELS,
  type TechnicalAssessmentStatus,
  type TechnicalRecommendation,
  type UnitResult,
} from '~~/shared/utils/technical-assessment'

const props = defineProps<{
  applicationId: string
  backPath: string
}>()

type DetailResponse = {
  participant: { application_id: string, full_name: string, nip: string, institution_name: string }
  period: { period_id: string, period_name: string }
  assessor_name: string
  selfAssessmentStatus: string
  cmsp02: Cmsp02Initial
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  units: { code: string, number: number, title: string }[]
  assessment: {
    status: TechnicalAssessmentStatus
    unit_results: Record<string, string>
    note: string
    recommendation: TechnicalRecommendation | ''
    submitted_at: string
    updated_at: string
    reopened_by_name: string
    reopened_at: string
  }
  canEdit: boolean
  canReopen: boolean
}

const toast = useToast()
const apiPath = computed(() => `/api/technical-assessments/${encodeURIComponent(props.applicationId)}`)

const loading = ref(true)
const errorMessage = ref('')
const data = ref<DetailResponse | null>(null)
const formVersion = ref(0)

const form = reactive({
  unitResults: {} as Record<string, UnitResult | undefined>,
  note: '',
  recommendation: '' as TechnicalRecommendation | '',
})

/** Salinan terakhir yang tersimpan, untuk mendeteksi perubahan belum disimpan. */
const savedSnapshot = ref('')
const snapshot = () => JSON.stringify(form)

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: DetailResponse }>(apiPath.value, { credentials: 'include' })
    data.value = response.data
    formVersion.value++

    const results: Record<string, UnitResult | undefined> = {}
    for (const unit of response.data.units) {
      const value = response.data.assessment.unit_results[unit.code]
      results[unit.code] = value === 'K' || value === 'BK' ? value : undefined
    }
    form.unitResults = results
    form.note = response.data.assessment.note
    form.recommendation = response.data.assessment.recommendation
    savedSnapshot.value = snapshot()
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Data penilaian belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const editable = computed(() => Boolean(data.value?.canEdit))
const isDirty = computed(() => editable.value && snapshot() !== savedSnapshot.value)

/** Kode unit yang sudah dipilih K/BK, untuk penanda hijau di navigasi unit. */
const assessedUnitCodes = computed(() =>
  Object.entries(form.unitResults).filter(([, value]) => Boolean(value)).map(([code]) => code),
)

const assessedCount = computed(() => Object.values(form.unitResults).filter(Boolean).length)
const totalUnits = computed(() => data.value?.units.length ?? 0)
const kCount = computed(() => Object.values(form.unitResults).filter((value) => value === 'K').length)
const bkCount = computed(() => Object.values(form.unitResults).filter((value) => value === 'BK').length)

const submitError = computed(() => {
  if (assessedCount.value < totalUnits.value) return `Masih ada ${totalUnits.value - assessedCount.value} unit yang belum dinilai.`
  if (!form.recommendation) return 'Pilih rekomendasi asesmen.'
  if (form.recommendation === 'NOT_CONTINUE' && !form.note.trim()) return 'Catatan wajib diisi bila asesmen tidak dapat dilanjutkan.'
  return ''
})

const STATUS_COLORS: Record<TechnicalAssessmentStatus, 'neutral' | 'warning' | 'success'> = {
  NOT_STARTED: 'neutral',
  DRAFT: 'warning',
  SUBMITTED: 'success',
}

/* ---------------- Simpan / kirim ---------------- */
const saving = ref(false)
const submitModalOpen = ref(false)

async function save(submit: boolean) {
  if (!editable.value) return
  saving.value = true

  try {
    const response = await $fetch<{ message: string }>(apiPath.value, {
      method: 'PUT',
      credentials: 'include',
      body: {
        unitResults: form.unitResults,
        note: form.note,
        recommendation: form.recommendation,
        submit,
      },
    })
    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    submitModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({
      title: submit ? 'Gagal mengirim penilaian' : 'Gagal menyimpan draf',
      description: getApiErrorMessage(error, 'Terjadi kesalahan. Silakan coba lagi.'),
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  } finally {
    saving.value = false
  }
}

/* ---------------- Buka kunci (Super Admin) ---------------- */
const reopenModalOpen = ref(false)
const reopening = ref(false)

async function reopen() {
  reopening.value = true

  try {
    const response = await $fetch<{ message: string }>(`${apiPath.value}/reopen`, { method: 'POST', credentials: 'include' })
    toast.add({ title: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    reopenModalOpen.value = false
    await load()
  } catch (error) {
    toast.add({ title: 'Gagal membuka kunci', description: getApiErrorMessage(error, 'Terjadi kesalahan.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    reopening.value = false
  }
}

/* Peringatan saat meninggalkan halaman dengan perubahan yang belum disimpan. */
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<template>
  <!-- Lebar konten sama dengan halaman self assessment peserta & verifikasi (UContainer). -->
  <UContainer class="space-y-5 pb-8">
    <!-- Header: judul kiri; Kembali + status kanan -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-blue-500 sm:text-2xl">
          {{ data?.period.period_name || 'Penilaian CMSP-02' }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">Penilaian CMSP-02 oleh Asesor Teknis</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton :to="backPath" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <UBadge v-if="data" :color="STATUS_COLORS[data.assessment.status]" variant="subtle">
          {{ TECHNICAL_ASSESSMENT_STATUS_LABELS[data.assessment.status] }}
        </UBadge>
      </div>
    </div>

    <div v-if="loading && !data" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat data penilaian...</span>
    </div>

    <UAlert v-else-if="errorMessage || !data" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage || 'Data penilaian belum dapat dimuat.'">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <template v-else>
      <!-- Identitas peserta -->
      <UCard>
        <div class="grid gap-x-6 gap-y-5 text-center text-sm sm:grid-cols-3">
          <div>
            <p class="text-slate-600">Nama Peserta</p>
            <p class="font-medium text-slate-800">{{ data.participant.full_name || '-' }}</p>
          </div>
          <div>
            <p class="text-slate-600">NIP</p>
            <p class="font-medium text-slate-800">{{ data.participant.nip || '-' }}</p>
          </div>
          <div>
            <p class="text-slate-600">Instansi</p>
            <p class="font-medium text-slate-800">{{ data.participant.institution_name || '-' }}</p>
          </div>
        </div>
      </UCard>

      <UAlert
        v-if="data.assessment.status === 'SUBMITTED'"
        color="success"
        variant="subtle"
        icon="i-lucide-lock"
        title="Penilaian sudah dikirim dan terkunci"
        :description="`Dikirim ${formatDateTimeId(data.assessment.submitted_at)}.${data.canReopen ? ' Buka kunci bila asesor perlu memperbaiki penilaian.' : ''}`"
      >
        <template v-if="data.canReopen" #actions>
          <UButton color="warning" variant="outline" size="sm" icon="i-lucide-lock-open" @click="reopenModalOpen = true">Buka Kunci</UButton>
        </template>
      </UAlert>
      <UAlert
        v-else-if="!data.stage.open"
        color="warning"
        variant="subtle"
        icon="i-lucide-calendar-x"
        title="Penilaian tidak dapat diisi saat ini"
        :description="data.stage.message"
      />
      <UAlert
        v-if="data.assessment.reopened_at && data.assessment.status === 'DRAFT'"
        color="info"
        variant="subtle"
        icon="i-lucide-lock-open"
        title="Kunci penilaian dibuka kembali"
        :description="`Dibuka oleh ${data.assessment.reopened_by_name} pada ${formatDateTimeId(data.assessment.reopened_at)}. Perbaiki lalu kirim ulang penilaian.`"
      />

      <!-- Evidence CMSP-02 + K/BK per unit -->
      <Cmsp02Form
        :key="`cmsp02-${formVersion}`"
        :application-id="applicationId"
        :initial="data.cmsp02"
        :files-base-path="`${apiPath}/files`"
        :status="data.selfAssessmentStatus"
        :completed-unit-codes="assessedUnitCodes"
        readonly
        review-mode
      >
        <template #unit-header="{ unit }">
          <div role="radiogroup" :aria-label="`Penilaian ${unit.code}`" class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="value in UNIT_RESULTS"
              :key="value"
              type="button"
              role="radio"
              class="flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition disabled:cursor-not-allowed"
              :class="form.unitResults[unit.code] === value
                ? (value === 'K' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-rose-500 bg-rose-50 text-rose-800')
                : 'border-slate-300 bg-white text-slate-700 enabled:hover:border-slate-300'"
              :disabled="!editable"
              :aria-checked="form.unitResults[unit.code] === value"
              @click="form.unitResults[unit.code] = value"
            >
              <UIcon :name="value === 'K' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" class="size-5 shrink-0" />
              {{ UNIT_RESULT_LABELS[value] }} ({{ value }})
            </button>
          </div>
        </template>
      </Cmsp02Form>

      <!-- Keputusan akhir -->
      <UCard class="border border-blue-200">
        <template #header>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-semibold text-slate-900">Kesimpulan Asesor Teknis</h2>
              <p class="mt-1 text-sm text-slate-600">
                {{ assessedCount }}/{{ totalUnits }} unit dinilai ·
                <span class="font-medium text-emerald-700">{{ kCount }} K</span> ·
                <span class="font-medium text-rose-700">{{ bkCount }} BK</span>
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-5">
          <UFormField
            label="Catatan"
            :hint="`${form.note.length}/${TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH}`"
            description="Catatan umum hasil penilaian CMSP-02. Wajib diisi bila asesmen tidak dapat dilanjutkan."
          >
            <UTextarea
              v-model="form.note"
              :rows="4"
              autoresize
              :maxlength="TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH"
              :disabled="!editable"
              class="mt-1 w-full"
            />
          </UFormField>

          <div>
            <p class="text-sm font-medium text-slate-700">Rekomendasi <span v-if="editable" class="text-red-500">*</span></p>
            <div class="mt-2 grid gap-3 sm:grid-cols-2">
              <button
                v-for="value in TECHNICAL_RECOMMENDATIONS"
                :key="value"
                type="button"
                class="flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition disabled:cursor-not-allowed"
                :class="form.recommendation === value
                  ? (value === 'CONTINUE' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-rose-500 bg-rose-50 text-rose-800')
                  : 'border-slate-300 bg-white text-slate-700 enabled:hover:border-slate-300'"
                :disabled="!editable"
                :aria-pressed="form.recommendation === value"
                @click="form.recommendation = value"
              >
                <UIcon
                  :name="value === 'CONTINUE' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
                  class="size-5 shrink-0"
                />
                {{ TECHNICAL_RECOMMENDATION_LABELS[value] }}
              </button>
            </div>
          </div>

          <div v-if="editable" class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <p v-if="isDirty" class="mr-auto text-xs text-amber-600">Ada perubahan yang belum disimpan.</p>
            <UButton color="neutral" variant="outline" icon="i-lucide-save" :loading="saving" :disabled="saving" @click="save(false)">
              Simpan Draf
            </UButton>
            <UButton icon="i-lucide-send" :disabled="saving || Boolean(submitError)" :title="submitError || undefined" @click="submitModalOpen = true">
              Kirim Penilaian
            </UButton>
          </div>
          <p v-if="editable && submitError" class="text-right text-xs text-slate-600">{{ submitError }}</p>
        </div>
      </UCard>
    </template>

    <!-- Konfirmasi kirim -->
    <UModal v-model:open="submitModalOpen" :dismissible="!saving" title="Kirim Penilaian CMSP-02?" :description="data?.participant.full_name">
      <template #body>
        <div class="space-y-3 text-sm text-slate-600">
          <div
            class="rounded-lg border p-3 text-slate-700"
            :class="form.recommendation === 'CONTINUE'
              ? 'border-emerald-200 bg-emerald-50'
              : form.recommendation === 'NOT_CONTINUE'
                ? 'border-rose-200 bg-rose-50'
                : 'border-slate-300 bg-slate-50'"
          >
            <p>{{ kCount }} unit Kompeten · {{ bkCount }} unit Belum Kompeten</p>
            <p v-if="form.recommendation" class="mt-1 font-semibold" :class="form.recommendation === 'CONTINUE' ? 'text-emerald-700' : 'text-rose-700'">
              {{ TECHNICAL_RECOMMENDATION_LABELS[form.recommendation] }}
            </p>
          </div>
          <p>Setelah dikirim, penilaian terkunci dan tidak dapat diubah kecuali dibuka kembali oleh Super Admin.</p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="outline" :disabled="saving" @click="submitModalOpen = false">Batal</UButton>
          <UButton icon="i-lucide-send" :loading="saving" :disabled="saving" @click="save(true)">Kirim</UButton>
        </div>
      </template>
    </UModal>

    <!-- Konfirmasi buka kunci -->
    <UModal v-model:open="reopenModalOpen" :dismissible="!reopening" title="Buka Kunci Penilaian?" :description="data?.participant.full_name">
      <template #body>
        <p class="text-sm text-slate-600">
          Penilaian akan kembali berstatus Draf sehingga Asesor Teknis dapat memperbaikinya lalu mengirim ulang
          (selama tahap Penilaian Asesor dibuka).
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="outline" :disabled="reopening" @click="reopenModalOpen = false">Batal</UButton>
          <UButton color="warning" icon="i-lucide-lock-open" :loading="reopening" :disabled="reopening" @click="reopen">Buka Kunci</UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
