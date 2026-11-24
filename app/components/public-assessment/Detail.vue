<script setup lang="ts">
/**
 * Penilaian CMSP-03 satu peserta oleh Asesor Kepublikan (pola sama dengan `<TechnicalAssessmentDetail>`).
 * - Peserta tidak mengisi apa pun: setiap unit menampilkan elemen kompetensi & indikator penilaian,
 *   lalu asesor memilih K/BK per unit, mengisi catatan umum, dan memilih rekomendasi.
 * - Dapat diisi setelah Asesor Teknis mengirim penilaian dengan rekomendasi "dapat dilanjutkan",
 *   selama tahap Penilaian Asesor dibuka.
 * - Super Admin: melihat/mengisi dan dapat membuka kunci penilaian terkirim.
 */
import type { Cmsp03Unit } from '~~/shared/utils/cmsp03-units'
import {
  PUBLIC_ASSESSMENT_STATUS_LABELS,
  type PublicAssessmentStatus,
  type TechnicalGate,
} from '~~/shared/utils/public-assessment'
import {
  TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH,
  TECHNICAL_RECOMMENDATIONS,
  TECHNICAL_RECOMMENDATION_LABELS,
  UNIT_RESULTS,
  UNIT_RESULT_LABELS,
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
  technical: { gate: TechnicalGate, submitted_at: string, message: string }
  stage: { open: boolean, message: string, startAt: string, endAt: string }
  units: Cmsp03Unit[]
  assessment: {
    status: PublicAssessmentStatus
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
const apiPath = computed(() => `/api/public-assessments/${encodeURIComponent(props.applicationId)}`)

const loading = ref(true)
const errorMessage = ref('')
const data = ref<DetailResponse | null>(null)

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

const GATE_TITLES: Record<string, string> = {
  PENDING: 'Menunggu penilaian Asesor Teknis',
  NOT_CONTINUE: 'Asesmen tidak dilanjutkan',
  WITHDRAWN: 'Peserta tidak melanjutkan',
}

const STATUS_COLORS: Record<PublicAssessmentStatus, 'neutral' | 'warning' | 'success' | 'info' | 'error'> = {
  WAITING: 'warning',
  STOPPED: 'error',
  WITHDRAWN: 'neutral',
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
  <UContainer class="space-y-5 pb-8">
    <!-- Header: judul kiri; Kembali + status kanan -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-blue-500 sm:text-2xl">
          {{ data?.period.period_name || 'Penilaian CMSP-03' }}
        </h1>
        <p class="mt-1 text-sm text-slate-600">Penilaian CMSP-03 oleh Asesor Kepublikan</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton :to="backPath" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <UBadge v-if="data" :color="STATUS_COLORS[data.assessment.status]" variant="subtle">
          {{ PUBLIC_ASSESSMENT_STATUS_LABELS[data.assessment.status] }}
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
        v-else-if="data.technical.gate !== 'CONTINUE'"
        :color="data.technical.gate === 'NOT_CONTINUE' ? 'error' : data.technical.gate === 'WITHDRAWN' ? 'neutral' : 'warning'"
        variant="subtle"
        :icon="data.technical.gate === 'WITHDRAWN' ? 'i-lucide-user-x' : 'i-lucide-hourglass'"
        :title="GATE_TITLES[data.technical.gate]"
        :description="data.technical.message"
      />
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

      <!-- Unit kompetensi CMSP-03 + K/BK per unit -->
      <section class="space-y-4">
        <UCard v-for="unit in data.units" :key="unit.code" class="bg-white/90 shadow-sm">
          <div class="space-y-6">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-primary">Unit {{ unit.number }}</p>
                <h2 class="mt-1 text-lg font-semibold leading-6 text-slate-900">{{ unit.title }}</h2>
              </div>
              <UIcon
                v-if="form.unitResults[unit.code]"
                name="i-lucide-circle-check"
                class="size-5 shrink-0 text-emerald-600"
                aria-label="Sudah dinilai"
              />
            </div>

            <div role="radiogroup" :aria-label="`Penilaian Unit ${unit.number}`" class="grid gap-3 sm:grid-cols-2">
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

            <div>
              <p class="text-sm font-semibold text-slate-900">Elemen kompetensi</p>
              <ol class="mt-3 list-decimal space-y-4 pl-5 text-sm leading-6 text-slate-700">
                <li v-for="element in unit.elements" :key="element.title">
                  <p class="font-medium text-slate-800">{{ element.title }}</p>
                  <div class="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wide text-primary">Indikator penilaian</p>
                    <ul class="mt-2 space-y-1.5 text-slate-600">
                      <li v-for="indicator in element.indicators" :key="indicator" class="flex gap-2">
                        <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{{ indicator }}</span>
                      </li>
                    </ul>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </UCard>
      </section>

      <!-- Keputusan akhir -->
      <UCard class="border border-blue-200">
        <template #header>
          <div>
            <h2 class="font-semibold text-slate-900">Kesimpulan Asesor Kepublikan</h2>
            <p class="mt-1 text-sm text-slate-600">
              {{ assessedCount }}/{{ totalUnits }} unit dinilai ·
              <span class="font-medium text-emerald-700">{{ kCount }} K</span> ·
              <span class="font-medium text-rose-700">{{ bkCount }} BK</span>
            </p>
          </div>
        </template>

        <div class="space-y-5">
          <UFormField
            label="Catatan"
            :hint="`${form.note.length}/${TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH}`"
            description="Catatan umum hasil penilaian CMSP-03. Wajib diisi bila asesmen tidak dapat dilanjutkan."
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
                <UIcon :name="value === 'CONTINUE' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" class="size-5 shrink-0" />
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
    <UModal v-model:open="submitModalOpen" :dismissible="!saving" title="Kirim Penilaian CMSP-03?" :description="data?.participant.full_name">
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
          Penilaian akan kembali berstatus Draf sehingga Asesor Kepublikan dapat memperbaikinya lalu mengirim ulang
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
