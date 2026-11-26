<script setup lang="ts">
/**
 * Detail hasil tes tertulis satu peserta (Super Admin): ringkasan nilai & waktu, lalu
 * setiap soal dengan opsi (urutan seperti yang dilihat peserta), jawaban peserta,
 * kunci jawaban, dan status benar/salah.
 */
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Detail Hasil Tes Tertulis' })

type Result = 'CORRECT' | 'WRONG' | 'UNANSWERED'

type AttemptDetail = {
  attempt: {
    attempt_id: string
    period_id: string
    period_name: string
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'RESET'
    started_at: string
    deadline_at: string
    submitted_at: string
    submit_type: string
    duration_minutes: number
    work_seconds: number | null
    passing_grade: number
    config_version: number
    score: number | null
    passed: boolean | null
    reset_at: string
  }
  participant: { full_name: string, nip: string, institution_name: string }
  summary: { total: number, correct: number, wrong: number, unanswered: number }
  questions: {
    number: number
    topic: string
    text: string
    options: { key: string, text: string, is_correct: boolean, is_selected: boolean }[]
    answer: string
    correct_answer: string
    result: Result
  }[]
}

const route = useRoute()
const attemptId = computed(() => String(route.params.attemptId || ''))

const loading = ref(true)
const errorMessage = ref('')
const data = ref<AttemptDetail | null>(null)

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: AttemptDetail }>(
      `/api/evaluation/attempts/${encodeURIComponent(attemptId.value)}`,
      { credentials: 'include' },
    )
    data.value = response.data
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Detail hasil tes tertulis belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const backPath = computed(() =>
  data.value ? `/super-admin/evaluations/plans/${data.value.attempt.period_id}` : '/super-admin/evaluations/plans',
)

const STATUS_BADGES = {
  IN_PROGRESS: { label: 'Mengerjakan', color: 'warning' },
  SUBMITTED: { label: 'Selesai', color: 'success' },
  RESET: { label: 'Direset', color: 'neutral' },
} as const

const RESULT_BADGES: Record<Result, { label: string, color: 'success' | 'error' | 'neutral', icon: string }> = {
  CORRECT: { label: 'Benar', color: 'success', icon: 'i-lucide-circle-check' },
  WRONG: { label: 'Salah', color: 'error', icon: 'i-lucide-circle-x' },
  UNANSWERED: { label: 'Tidak Dijawab', color: 'neutral', icon: 'i-lucide-circle-minus' },
}

const FILTERS = [
  { value: 'ALL', label: 'Semua Soal' },
  { value: 'CORRECT', label: 'Benar' },
  { value: 'WRONG', label: 'Salah' },
  { value: 'UNANSWERED', label: 'Tidak Dijawab' },
]
const resultFilter = ref('ALL')

const filteredQuestions = computed(() =>
  (data.value?.questions ?? []).filter((item) => resultFilter.value === 'ALL' || item.result === resultFilter.value),
)

const formatScore = (value: number) => value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatWorkTime(seconds: number | null) {
  if (seconds === null) return '-'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes > 0 ? `${minutes} menit ${rest} detik` : `${rest} detik`
}

function optionClass(option: { is_correct: boolean, is_selected: boolean }) {
  if (option.is_correct) return 'border-emerald-300 bg-emerald-50'
  if (option.is_selected) return 'border-rose-300 bg-rose-50'
  return 'border-slate-300 bg-white'
}

function optionKeyClass(option: { is_correct: boolean, is_selected: boolean }) {
  if (option.is_correct) return 'border-emerald-500 bg-emerald-500 text-white'
  if (option.is_selected) return 'border-rose-500 bg-rose-500 text-white'
  return 'border-slate-300 bg-white text-slate-600'
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- Header: judul kiri; Kembali + status kanan -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold text-blue-500">Detail Hasil Tes Tertulis</h1>
        <p class="mt-1 text-sm text-slate-600">
          Jawaban peserta per soal beserta kunci, waktu, dan nilai tes tertulis.
        </p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <UButton :to="backPath" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
        <UBadge v-if="data" :color="STATUS_BADGES[data.attempt.status].color" variant="subtle">
          {{ STATUS_BADGES[data.attempt.status].label }}
        </UBadge>
      </div>
    </div>

    <div v-if="loading && !data" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat detail hasil...</span>
    </div>

    <UAlert v-else-if="errorMessage || !data" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage || 'Detail hasil tes tertulis belum dapat dimuat.'">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <template v-else>
      <UAlert
        v-if="data.attempt.status === 'RESET'"
        color="neutral"
        variant="subtle"
        icon="i-lucide-rotate-ccw"
        title="Pengerjaan ini sudah direset"
        :description="`Direset ${formatDateTimeId(data.attempt.reset_at)}. Data ditampilkan sebagai riwayat dan tidak dihitung.`"
      />
      <UAlert
        v-else-if="data.attempt.status === 'IN_PROGRESS'"
        color="warning"
        variant="subtle"
        icon="i-lucide-pencil-line"
        title="Peserta masih mengerjakan"
        description="Jawaban di bawah adalah jawaban yang sudah tersimpan otomatis; nilai dihitung setelah dikirim."
      />

      <!-- Identitas & waktu -->
      <UCard>
        <div class="grid gap-x-6 gap-y-5 text-center text-sm sm:grid-cols-2 lg:grid-cols-4">
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
          <div>
            <p class="text-slate-600">Periode</p>
            <p class="font-medium text-slate-800">{{ data.attempt.period_name || '-' }}</p>
          </div>
          <div>
            <p class="text-slate-600">Mulai</p>
            <p class="font-medium text-slate-800">{{ formatDateTimeId(data.attempt.started_at) }}</p>
          </div>
          <div>
            <p class="text-slate-600">Selesai</p>
            <p class="font-medium text-slate-800">
              {{ formatDateTimeId(data.attempt.submitted_at) }}
              <span v-if="data.attempt.submit_type === 'AUTO'" class="text-xs font-normal text-amber-600">(otomatis, waktu habis)</span>
            </p>
          </div>
          <div>
            <p class="text-slate-600">Waktu Mengerjakan</p>
            <p class="font-medium text-slate-800">
              {{ formatWorkTime(data.attempt.work_seconds) }}
              <span class="text-xs font-normal text-slate-600">dari {{ data.attempt.duration_minutes }} menit</span>
            </p>
          </div>
          <div>
            <p class="text-slate-600">Konfigurasi</p>
            <p class="font-medium text-slate-800">
              {{ data.attempt.config_version ? `Konfigurasi ke-${data.attempt.config_version}` : 'Konfigurasi awal' }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Ringkasan nilai -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div
          class="rounded-xl border p-3.5"
          :class="data.attempt.passed === null ? 'border-slate-300 bg-slate-50 text-slate-600' : data.attempt.passed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-rose-300 bg-rose-50 text-rose-700'"
        >
          <p class="text-sm font-medium">Nilai</p>
          <p class="mt-1 text-2xl font-semibold">{{ data.attempt.score === null ? '-' : formatScore(data.attempt.score) }}</p>
          <p class="text-xs opacity-80">Passing grade {{ data.attempt.passing_grade }} (saat mulai mengerjakan)</p>
        </div>
        <div class="rounded-xl border border-blue-300 bg-blue-50 p-3.5 text-blue-700">
          <p class="text-sm font-medium">Benar</p>
          <p class="mt-1 text-2xl font-semibold">{{ data.summary.correct }}<span class="text-sm font-normal">/{{ data.summary.total }}</span></p>
        </div>
        <div class="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-700">
          <p class="text-sm font-medium">Salah</p>
          <p class="mt-1 text-2xl font-semibold">{{ data.summary.wrong }}</p>
        </div>
        <div class="rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-slate-600">
          <p class="text-sm font-medium">Tidak Dijawab</p>
          <p class="mt-1 text-2xl font-semibold">{{ data.summary.unanswered }}</p>
        </div>
      </div>

      <!-- Jawaban per soal -->
      <UCard>
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-semibold text-slate-900">Jawaban per Soal</h2>
              <p class="mt-1 text-sm text-slate-600">Urutan soal & huruf opsi sesuai yang dilihat peserta.</p>
            </div>
            <USelect v-model="resultFilter" :items="FILTERS" value-key="value" label-key="label" class="w-full sm:w-48" />
          </div>
        </template>

        <div v-if="filteredQuestions.length === 0" class="py-8 text-center text-sm text-slate-600">
          Tidak ada soal pada filter ini.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="question in filteredQuestions"
            :key="question.number"
            class="rounded-xl border border-slate-300 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm font-semibold text-slate-600">
                Soal {{ question.number }}<template v-if="question.topic"> · {{ question.topic }}</template>
              </p>
              <UBadge :color="RESULT_BADGES[question.result].color" variant="subtle" :icon="RESULT_BADGES[question.result].icon">
                {{ RESULT_BADGES[question.result].label }}
              </UBadge>
            </div>
            <p class="mt-2 whitespace-pre-line text-slate-800">{{ question.text }}</p>

            <div class="mt-3 space-y-2">
              <div
                v-for="option in question.options"
                :key="option.key"
                class="flex items-center gap-3 rounded-lg border px-3 py-2"
                :class="optionClass(option)"
              >
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold" :class="optionKeyClass(option)">
                  {{ option.key }}
                </span>
                <span class="min-w-0 flex-1 text-sm text-slate-700">{{ option.text }}</span>
                <span v-if="option.is_selected" class="shrink-0 text-xs font-medium" :class="option.is_correct ? 'text-emerald-700' : 'text-rose-700'">
                  Jawaban peserta
                </span>
                <span v-if="option.is_correct" class="shrink-0 text-xs font-medium text-emerald-700">Kunci</span>
              </div>
            </div>

            <p class="mt-3 text-xs text-slate-600">
              Jawaban peserta: <span class="font-semibold text-slate-700">{{ question.answer || '-' }}</span>
              · Kunci: <span class="font-semibold text-slate-700">{{ question.correct_answer || '-' }}</span>
            </p>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
