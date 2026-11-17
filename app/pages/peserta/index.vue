<script setup lang="ts">
/**
 * Beranda peserta: timeline periode AKTIF yang diikuti peserta (pengajuan diterima)
 * + tombol dinamis sesuai tahap & progres pekerjaan peserta.
 */
import { buildTimelineStages, getActiveStage, type TimelineRecord, type TimelineStage, type TimelineTask } from '~/utils/timeline'

definePageMeta({ layout: 'peserta' })
useHead({ title: 'Beranda' })

type Progress = {
  self_assessment: { status: string, editable: boolean } | null
  evaluation: { status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED', available: boolean } | null
}

type DashboardApplication = {
  application: { application_id: string, period_id: string, application_status: string }
  period: { period_id: string, period_name: string, period_status: string } | null
  timelines: TimelineRecord[]
  progress?: Progress
}

const loading = ref(true)
const errorMessage = ref('')
const periodName = ref('')
const applicationId = ref('')
const stages = ref<TimelineStage[]>([])
const progress = ref<Progress | null>(null)

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ applications: DashboardApplication[] }>('/api/peserta/dashboard', { credentials: 'include' })

    // Hanya periode yang sedang aktif DAN pengajuan peserta sudah diterima (terdaftar).
    const current = (response.applications ?? []).find((item) =>
      item.period?.period_status?.toUpperCase() === 'ACTIVE'
      && item.application?.application_status === 'accepted',
    )

    periodName.value = current?.period?.period_name ?? ''
    applicationId.value = current?.application.application_id ?? ''
    progress.value = current?.progress ?? null
    stages.value = current ? buildTimelineStages(current.timelines) : []
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Timeline sertifikasi gagal dimuat. Silakan coba kembali.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------------- Tombol dinamis ---------------- */
const pathFor = (base: string) => `${base}/${encodeURIComponent(applicationId.value)}`
const SA_PATH = '/peserta/self-assessment'
const EVALUATION_PATH = '/peserta/evaluation'
/** Urutan tahap yang memiliki pekerjaan peserta. */
const ORDER = { SELF_ASSESSMENT: 3, EVALUATION: 5 }

/** Informasi untuk tahapan yang tidak memerlukan tindakan peserta. */
const STAGE_INFO: Record<string, string> = {
  REGISTRATION: 'Pendaftaran peserta sedang dibuka.',
  DOCUMENT_VERIFICATION: 'Berkas pendaftaran sedang diverifikasi oleh penyelenggara.',
  SELF_ASSESSMENT_VERIFICATION: 'Self assessment Anda sedang diperiksa oleh Verifikator. Jika diminta perbaikan, Anda akan mendapat catatan pada halaman Self Assessment.',
  ASSESSOR_ASSESSMENT: 'Hasil self assessment dan evaluasi Anda sedang dinilai oleh asesor.',
  ASSESSMENT_VERIFICATION: 'Hasil penilaian asesor sedang diverifikasi oleh penyelenggara.',
  ANNOUNCEMENT: 'Hasil sertifikasi akan diumumkan pada tahapan ini.',
}

/** Pekerjaan self assessment yang masih harus & dapat dilakukan. */
function selfAssessmentTodo(): TimelineTask | null {
  const sa = progress.value?.self_assessment
  if (!sa?.editable) return null

  if (sa.status === 'REVISION_REQUESTED') {
    return {
      tone: 'pending',
      title: 'Self assessment Anda perlu diperbaiki',
      description: 'Verifikator meminta perbaikan. Baca catatan perbaikan, perbaiki CMSP-01/CMSP-02, lalu kirim ulang.',
      label: 'Perbaiki Self Assessment',
      icon: 'i-lucide-pencil-line',
      to: pathFor(SA_PATH),
    }
  }

  if (['NEW', 'DRAFT'].includes(sa.status)) {
    return {
      tone: 'pending',
      title: 'Self assessment Anda belum dikirim',
      description: 'Lengkapi Formulir Permohonan Sertifikasi (CMSP.01) dan Self Assessment Teknis (CMSP.02), lalu kirim.',
      label: 'Lengkapi Self Assessment',
      icon: 'i-lucide-clipboard-check',
      to: pathFor(SA_PATH),
    }
  }

  return null
}

/** Pekerjaan evaluasi yang masih dapat dikerjakan. */
function evaluationTodo(): TimelineTask | null {
  const evaluation = progress.value?.evaluation
  if (!evaluation?.available || evaluation.status === 'SUBMITTED') return null

  const inProgress = evaluation.status === 'IN_PROGRESS'
  return {
    tone: 'pending',
    title: inProgress ? 'Evaluasi Anda belum diselesaikan' : 'Evaluasi Anda belum dikerjakan',
    description: 'Selesaikan evaluasi pilihan ganda sebelum batas waktunya berakhir.',
    label: inProgress ? 'Lanjutkan Evaluasi' : 'Kerjakan Evaluasi',
    icon: 'i-lucide-file-pen-line',
    to: pathFor(EVALUATION_PATH),
  }
}

/**
 * 1. Tunggakan tahap sebelumnya (yang masih dapat dikerjakan) diprioritaskan.
 * 2. Jika tidak ada, tombol/informasi sesuai tahap yang sedang berlangsung.
 */
const tasks = computed<TimelineTask[]>(() => {
  const stage = getActiveStage(stages.value)
  if (!stage) return []

  if (stage.order > ORDER.SELF_ASSESSMENT) {
    const todo = selfAssessmentTodo()
    if (todo) return [todo]
  }
  if (stage.order > ORDER.EVALUATION) {
    const todo = evaluationTodo()
    if (todo) return [todo]
  }

  if (stage.code === 'SELF_ASSESSMENT') {
    const saStatus = progress.value?.self_assessment?.status ?? 'NEW'
    const todo = selfAssessmentTodo()

    if (todo) {
      return [saStatus === 'REVISION_REQUESTED'
        ? { ...todo, tone: 'action' }
        : {
            ...todo,
            tone: 'action',
            title: '',
            description: 'Lengkapi Formulir Permohonan Sertifikasi (CMSP.01) dan Self Assessment Teknis (CMSP.02), lalu kirim sebelum tahapan ini berakhir.',
            label: 'Isi Self Assessment',
          }]
    }
    if (!['SUBMITTED', 'VERIFIED'].includes(saStatus)) {
      return [{
        tone: 'info',
        title: 'Self assessment belum dapat diisi',
        description: 'Buka halaman Self Assessment untuk melihat keterangan lebih lanjut.',
        label: 'Buka Self Assessment',
        icon: 'i-lucide-clipboard-check',
        to: pathFor(SA_PATH),
      }]
    }
    return [{
      tone: 'done',
      title: saStatus === 'VERIFIED' ? 'Self assessment sudah diverifikasi' : 'Self assessment sudah dikirim',
      description: saStatus === 'VERIFIED'
        ? 'Self assessment Anda telah diverifikasi oleh Verifikator.'
        : 'Self assessment Anda sudah dikirim dan akan diperiksa oleh Verifikator.',
      label: 'Lihat Self Assessment',
      icon: 'i-lucide-eye',
      to: pathFor(SA_PATH),
    }]
  }

  if (stage.code === 'EVALUATION') {
    const evaluation = progress.value?.evaluation
    if (evaluation?.status === 'SUBMITTED') {
      return [{
        tone: 'done',
        title: 'Evaluasi sudah dikerjakan',
        description: 'Jawaban evaluasi Anda sudah terkirim.',
        label: 'Lihat Evaluasi',
        icon: 'i-lucide-eye',
        to: pathFor(EVALUATION_PATH),
      }]
    }
    const todo = evaluationTodo()
    if (todo) {
      return [{ ...todo, tone: 'action', title: '', description: 'Kerjakan evaluasi pilihan ganda sebelum tahapan ini berakhir. Evaluasi hanya dapat dikerjakan satu kali.' }]
    }
    return [{
      tone: 'info',
      title: 'Evaluasi belum dapat dikerjakan',
      description: progress.value?.self_assessment?.status === 'VERIFIED'
        ? 'Buka halaman Evaluasi untuk melihat keterangan lebih lanjut.'
        : 'Evaluasi hanya dapat dikerjakan oleh peserta yang self assessment-nya telah terverifikasi.',
      label: 'Buka Evaluasi',
      icon: 'i-lucide-file-pen-line',
      to: pathFor(EVALUATION_PATH),
    }]
  }

  return [{
    tone: 'info',
    title: 'Tidak ada tindakan yang perlu Anda lakukan saat ini',
    description: STAGE_INFO[stage.code] || 'Silakan pantau perkembangan proses sertifikasi melalui timeline ini.',
  }]
})
</script>

<template>
  <UContainer class="space-y-6 pb-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
        {{ periodName || 'Beranda' }}
      </h1>
      <p class="text-sm leading-6 text-slate-500">
        Timeline sertifikasi dan tahapan yang sedang berlangsung.
      </p>
    </div>

    <div v-if="loading" class="space-y-6">
      <USkeleton class="h-48 w-full rounded-xl" />
      <USkeleton class="h-40 w-full rounded-xl" />
    </div>

    <UAlert
      v-else-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Gagal memuat timeline"
      :description="errorMessage"
    >
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <UCard v-else-if="!applicationId" class="mx-auto max-w-2xl">
      <div class="flex flex-col items-center px-4 py-10 text-center">
        <div class="mb-5 flex size-16 items-center justify-center rounded-full bg-blue-50">
          <UIcon name="i-lucide-calendar-x" class="size-8 text-blue-500" />
        </div>
        <h2 class="text-xl font-semibold text-slate-900">Anda Belum Terdaftar pada Periode Aktif</h2>
        <p class="mt-3 max-w-lg text-sm leading-6 text-slate-500">
          Saat ini Anda tidak terdaftar pada periode sertifikasi Coaching dan Mentoring yang sedang berlangsung.
          Timeline dan tahapan sertifikasi akan tampil di sini setelah Anda terdaftar pada periode yang aktif.
        </p>
      </div>
    </UCard>

    <template v-else>
      <TimelineProgressBar :stages="stages" />
      <TimelineCurrentStage :stages="stages" :tasks="tasks" />
    </template>
  </UContainer>
</template>
