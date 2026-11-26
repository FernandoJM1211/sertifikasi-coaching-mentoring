
<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-blue-500">
          Pengaturan Timeline Sertifikasi
        </h1>

        <p class="mt-1 text-sm text-slate-600">
          Tentukan jadwal mulai dan selesai setiap tahapan agar proses sertifikasi berjalan teratur sesuai waktu yang ditetapkan.
        </p>
      </div>

      <UButton
  to="/super-admin/periods"
  color="neutral"
  variant="outline"
  icon="i-lucide-arrow-left"
>
  Kembali
</UButton>
    </div>

    <!-- Loading -->
    <div
      v-if="loading && !period"
      class="flex items-center justify-center py-16"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-primary"
      />
      <span class="ml-3 text-sm text-slate-600">
        Memuat informasi timeline...
      </span>
    </div>

    <!-- Informasi periode -->
    <template v-else-if="period">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="p-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <p class="text-sm font-medium text-primary">
                Nama Periode
              </p>

              <h2 class="mt-1 text-lg font-semibold text-slate-900">
                {{ period.period_name }}
              </h2>

              <p class="mt-2 text-sm text-slate-600">
                ID Periode:
                <span class="font-medium text-primary">
                  {{ period.period_id }}
                </span>
              </p>
            </div>

            <UBadge
              :color="getPeriodStatusColor(period.period_status)"
              variant="subtle"
            >
              {{ formatStatus(period.period_status) }}
            </UBadge>
          </div>
        </div>
      </UCard>

      <!-- Form pengaturan tahapan -->
      <div>
        <div class="mb-4 flex justify-end">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-primary"
            >
              {{ completeStagesCount }}/8 Timeline
            </span>

            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              :loading="loading || saving"
              :disabled="loading || saving"
              @click="fetchTimeline"
            >
              Muat Ulang
            </UButton>
          </div>
        </div>

        <div class="space-y-4">
          <UCard
            v-for="stage in stages"
            :key="stage.stageCode"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-300 bg-blue-50 text-sm font-semibold text-primary"
              >
                {{ stage.stageOrder }}
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="font-semibold text-slate-900">
                  {{ stage.stageName }}
                </h3>

                <p class="mt-1 text-sm leading-6 text-slate-600">
                  {{ stage.description }}
                </p>

                
<div
  v-if="getTimelineForStage(stage.stageCode)"
  class="mt-3 flex flex-wrap items-center justify-between gap-3"
>
  <UBadge
    :color="getOverrideColor(getTimelineForStage(stage.stageCode))"
    variant="subtle"
  >
    {{ getOverrideLabel(getTimelineForStage(stage.stageCode)) }}
  </UBadge>

  <div class="flex flex-wrap items-center gap-2">
    <UButton
      v-if="getOverrideMode(getTimelineForStage(stage.stageCode)) !== 'OPEN'"
      color="success"
      variant="outline"
      size="sm"
      icon="i-lucide-lock-open"
      :loading="overrideSavingId === getTimelineForStage(stage.stageCode)?.timeline_id"
      :disabled="loading || saving || !!overrideSavingId"
      @click="requestTimelineOverride(stage.stageCode, 'OPEN')"
    >
      Buka Manual
    </UButton>

    <UButton
      v-if="getOverrideMode(getTimelineForStage(stage.stageCode)) !== 'CLOSED'"
      color="error"
      variant="outline"
      size="sm"
      icon="i-lucide-lock"
      :loading="overrideSavingId === getTimelineForStage(stage.stageCode)?.timeline_id"
      :disabled="loading || saving || !!overrideSavingId"
      @click="requestTimelineOverride(stage.stageCode, 'CLOSED')"
    >
      Tutup Manual
    </UButton>

    <UButton
      v-if="getOverrideMode(getTimelineForStage(stage.stageCode)) !== 'NORMAL'"
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-lucide-rotate-ccw"
      :disabled="loading || saving || !!overrideSavingId"
      @click="requestTimelineOverride(stage.stageCode, 'NORMAL')"
    >
      Kembali Normal
    </UButton>
  </div>
</div>

              </div>
            </div>

            <div class="mt-5 grid grid-cols-1 gap-4 border-t border-slate-300 pt-4 sm:grid-cols-2">
              <UFormField
                :label="`Waktu Mulai — ${stage.stageName}`"
                :name="`startAt-${stage.stageCode}`"
                required
              >
                <UInput
                  v-model="stage.startAt"
                  type="datetime-local"
                  class="w-full datetime-local-input"
                  :disabled="saving || loading"
                />
              </UFormField>

              <UFormField
                :label="`Waktu Selesai — ${stage.stageName}`"
                :name="`endAt-${stage.stageCode}`"
                required
              >
                <UInput
                  v-model="stage.endAt"
                  type="datetime-local"
                  class="w-full datetime-local-input"
                  :disabled="saving || loading"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <!-- Tombol aksi -->
        <div class="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <UButton
            color="primary"
            icon="i-lucide-save"
            :loading="saving"
            :disabled="loading || stages.length !== 8"
            @click="saveTimeline"
          >
            Simpan Semua Jadwal
          </UButton>
        </div>
      </div>
    </template>

    <!-- Modal konfirmasi perubahan akses timeline -->
    <UModal
      v-model:open="overrideConfirmModalOpen"
      :dismissible="!overrideSavingId"
    >
      <template #content>
        <div class="space-y-5 p-6">
          <div class="flex items-start gap-4">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-xl ring-1"
              :class="overrideConfirmMode === 'CLOSED'
                ? 'bg-red-50 text-red-600 ring-red-200'
                : overrideConfirmMode === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                  : 'bg-blue-50 text-blue-600 ring-blue-200'"
            >
              <UIcon
                :name="overrideConfirmMode === 'CLOSED'
                  ? 'i-lucide-lock'
                  : overrideConfirmMode === 'OPEN'
                    ? 'i-lucide-lock-open'
                    : 'i-lucide-rotate-ccw'"
                class="size-6"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-900">
                {{ overrideConfirmTitle }}
              </h2>
              <p class="mt-1 text-sm leading-6 text-slate-600">
                Tinjau perubahan akses sebelum melanjutkan.
              </p>
            </div>
          </div>

          <div
            class="rounded-xl border p-4 text-sm leading-6"
            :class="overrideConfirmMode === 'CLOSED'
              ? 'border-red-300 bg-red-50 text-red-800'
              : overrideConfirmMode === 'OPEN'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-blue-300 bg-blue-50 text-blue-800'"
          >
            {{ overrideConfirmMessage }}
          </div>

          <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="!!overrideSavingId"
              @click="overrideConfirmModalOpen = false"
            >
              Batal
            </UButton>
            <UButton
              :color="overrideConfirmMode === 'CLOSED' ? 'error' : overrideConfirmMode === 'OPEN' ? 'success' : 'primary'"
              :icon="overrideConfirmMode === 'CLOSED' ? 'i-lucide-lock' : overrideConfirmMode === 'OPEN' ? 'i-lucide-lock-open' : 'i-lucide-rotate-ccw'"
              :loading="!!overrideSavingId"
              @click="confirmTimelineOverride"
            >
              Ya, Lanjutkan
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal notifikasi -->
    <UModal
      v-model:open="notificationModalOpen"
      :dismissible="!saving"
    >
      <template #content>
        <div class="space-y-5 p-6">
          <!-- Ikon dan judul -->
          <div class="flex items-start gap-4">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-xl ring-1"
              :class="notificationHeaderClass"
            >
              <UIcon
                :name="notificationIcon"
                class="size-6"
              />
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-900">
                {{ notificationTitle }}
              </h2>

              <p class="mt-1 text-sm leading-6 text-slate-600">
                {{ notificationSubtitle }}
              </p>
            </div>
          </div>

          <!-- Isi pesan -->
          <div
            class="rounded-xl border p-4"
            :class="notificationBodyClass"
          >
            <p class="whitespace-pre-line text-sm leading-6">
              {{ notificationMessage }}
            </p>
          </div>

          <!-- Tombol modal -->
          <div class="flex justify-end">
            <UButton
              :color="notificationType === 'success' ? 'success' : 'primary'"
              :icon="notificationType === 'success' ? 'i-lucide-check' : 'i-lucide-check-circle'"
              :disabled="saving"
              @click="closeNotification"
            >
              {{ notificationType === 'success' ? 'Selesai' : 'Mengerti' }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

definePageMeta({
  layout: 'super-admin',
})

type CertificationPeriod = {
  period_id: string
  certification_type_id: string
  category_id: string
  period_name: string
  period_status: string
  created_by: string
  created_at: string
  updated_at: string
}

type CertificationTimeline = {
  timeline_id: string
  period_id: string
  stage_order: string
  stage_code: string
  stage_name: string
  start_at: string
  end_at: string
  is_override_open: string
  override_by: string
  override_at: string
  created_at: string
  updated_at: string
}

type TimelineStageForm = {
  stageOrder: number
  stageCode: string
  stageName: string
  description: string
  startAt: string
  endAt: string
}

type NotificationType = 'success' | 'error'
type OverrideMode = 'NORMAL' | 'OPEN' | 'CLOSED'

const REQUIRED_STAGES = [
  {
    stageOrder: 1,
    stageCode: 'REGISTRATION',
    stageName: 'Pendaftaran',
    description: 'Tahap pengisian formulir dan pengajuan permohonan sertifikasi oleh peserta.',
  },
  {
    stageOrder: 2,
    stageCode: 'DOCUMENT_VERIFICATION',
    stageName: 'Verifikasi Berkas',
    description: 'Pemeriksaan kelengkapan dan kesesuaian dokumen persyaratan peserta.',
  },
  {
    stageOrder: 3,
    stageCode: 'SELF_ASSESSMENT',
    stageName: 'Self Assessment',
    description: 'Tahap peserta melakukan penilaian mandiri sesuai instrumen yang disediakan.',
  },
  {
    stageOrder: 4,
    stageCode: 'SELF_ASSESSMENT_VERIFICATION',
    stageName: 'Verifikasi Self Assessment',
    description: 'Pemeriksaan hasil self assessment untuk memastikan isian dan hasilnya sesuai ketentuan.',
  },
  {
    stageOrder: 5,
    stageCode: 'EVALUATION',
    stageName: 'Tes Tertulis',
    description: 'Pelaksanaan tes tertulis kompetensi peserta sesuai mekanisme sertifikasi.',
  },
  {
    stageOrder: 6,
    stageCode: 'ASSESSOR_ASSESSMENT',
    stageName: 'Assessment oleh Assessor',
    description: 'Penilaian peserta oleh assessor berdasarkan bukti dan kriteria kompetensi.',
  },
  {
    stageOrder: 7,
    stageCode: 'ASSESSMENT_VERIFICATION',
    stageName: 'Penetapan Hasil Asesmen',
    description: 'Rekap tes tertulis dan penilaian kedua asesor, lalu hasil peserta (lulus/remedial) ditetapkan.',
  },
  {
    stageOrder: 8,
    stageCode: 'ANNOUNCEMENT',
    stageName: 'Pengumuman',
    description: 'Penyampaian hasil sertifikasi kepada peserta setelah seluruh tahapan selesai.',
  },
]


const route = useRoute()
const periodId = String(route.params.periodId || '')

const period = ref<CertificationPeriod | null>(null)
const timelines = ref<CertificationTimeline[]>([])
const stages = ref<TimelineStageForm[]>([])

// Hitung tahapan yang memiliki waktu mulai dan selesai valid.
// Daftar tahap tetap berjumlah 8, jadi badge tidak menggunakan stages.length.
const completeStagesCount = computed(() =>
  stages.value.filter((stage) => {
    if (!stage.startAt || !stage.endAt) return false

    const start = new Date(stage.startAt).getTime()
    const end = new Date(stage.endAt).getTime()

    return Number.isFinite(start) && Number.isFinite(end) && end > start
  }).length,
)

const loading = ref(false)
const saving = ref(false)
const overrideSavingId = ref('')
const overrideConfirmModalOpen = ref(false)
const overrideConfirmStageCode = ref('')
const overrideConfirmMode = ref<OverrideMode>('NORMAL')
const overrideConfirmStageName = ref('')

const overrideConfirmTitle = computed(() => {
  if (overrideConfirmMode.value === 'OPEN') return 'Buka Akses Secara Manual?'
  if (overrideConfirmMode.value === 'CLOSED') return 'Tutup Akses Secara Manual?'
  return 'Kembalikan ke Jadwal Normal?'
})

const overrideConfirmMessage = computed(() => {
  if (overrideConfirmMode.value === 'OPEN') {
    return `Akses tahap "${overrideConfirmStageName.value}" akan dibuka secara manual, tanpa mengikuti batas waktu jadwal.`
  }
  if (overrideConfirmMode.value === 'CLOSED') {
    return `Akses tahap "${overrideConfirmStageName.value}" akan ditutup secara manual, meskipun jadwal normalnya masih berlangsung.`
  }
  return `Akses tahap "${overrideConfirmStageName.value}" akan kembali mengikuti jadwal mulai dan selesai yang telah ditetapkan.`
})

const notificationModalOpen = ref(false)
const notificationType = ref<NotificationType>('error')
const notificationTitle = ref('')
const notificationSubtitle = ref('')
const notificationMessage = ref('')

const notificationHeaderClass = computed(() => {
  return notificationType.value === 'success'
    ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
    : 'bg-red-50 text-red-600 ring-red-200'
})

const notificationBodyClass = computed(() => {
  return notificationType.value === 'success'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
    : 'border-red-300 bg-red-50 text-red-800'
})

const notificationIcon = computed(() => {
  return notificationType.value === 'success'
    ? 'i-lucide-circle-check'
    : 'i-lucide-circle-alert'
})

function showNotification(
  type: NotificationType,
  title: string,
  message: string,
) {
  notificationType.value = type
  notificationTitle.value = title
  notificationSubtitle.value =
    type === 'success'
      ? 'Proses berhasil diselesaikan.'
      : 'Periksa informasi berikut sebelum mencoba kembali.'
  notificationMessage.value = message
  notificationModalOpen.value = true
}

function closeNotification() {
  if (saving.value) return
  notificationModalOpen.value = false
}

function getErrorMessage(error: any) {
  return (
    error?.data?.statusMessage ||
    error?.data?.message ||
    error?.statusMessage ||
    error?.message ||
    'Terjadi kesalahan. Silakan coba lagi.'
  )
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    ACTIVE: 'Aktif',
    OPEN: 'Dibuka',
    CLOSED: 'Ditutup',
    COMPLETED: 'Selesai',
  }

  return labels[status.toUpperCase()] || status
}

function getPeriodStatusColor(
  status: string,
): 'neutral' | 'success' | 'warning' | 'error' {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'OPEN':
      return 'success'
    case 'CLOSED':
    case 'COMPLETED':
      return 'neutral'
    case 'DRAFT':
      return 'warning'
    default:
      return 'neutral'
  }
}

function getTimelineForStage(stageCode: string) {
  return timelines.value.find(
    (timeline) => timeline.stage_code === stageCode,
  )
}

function toDateTimeLocal(value: string) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

function populateStages(
  existingTimelines: CertificationTimeline[],
) {
  stages.value = REQUIRED_STAGES.map((requiredStage) => {
    const existing = existingTimelines.find(
      (timeline) => timeline.stage_code === requiredStage.stageCode,
    )

    return {
      ...requiredStage,
      startAt: existing ? toDateTimeLocal(existing.start_at) : '',
      endAt: existing ? toDateTimeLocal(existing.end_at) : '',
    }
  })
}

async function fetchTimeline() {
  if (loading.value || saving.value) return

  loading.value = true

  try {
    const response = await $fetch<{
      success: boolean
      data: {
        period: CertificationPeriod
        timelines: CertificationTimeline[]
      }
    }>(`/api/certification-timelines/${periodId}`)

    period.value = response.data.period
    timelines.value = response.data.timelines
    populateStages(response.data.timelines)
  } catch (error: any) {
    console.error('Gagal memuat timeline:', error)

    showNotification(
      'error',
      'Gagal Memuat Timeline',
      getErrorMessage(error),
    )
  } finally {
    loading.value = false
  }
}

function validateStages(): string | null {
  if (stages.value.length !== 8) {
    return 'Seluruh 8 tahapan sertifikasi harus tersedia.'
  }

  for (let index = 0; index < stages.value.length; index++) {
    const stage = stages.value[index]

    if (!stage || !stage.startAt || !stage.endAt) {
      return `Waktu mulai dan selesai tahap ${index + 1} wajib diisi.`
    }

    const start = new Date(stage.startAt)
    const end = new Date(stage.endAt)

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return `Format tanggal atau waktu tahap ${index + 1} tidak valid.`
    }

    if (end <= start) {
      return `Waktu selesai tahap ${index + 1} harus setelah waktu mulai.`
    }

    if (index > 0) {
      const previousStage = stages.value[index - 1]

      if (previousStage?.endAt) {
        const previousEnd = new Date(previousStage.endAt)

        if (start < previousEnd) {
          return `Tahap ${index + 1} tidak boleh dimulai sebelum tahap ${index} selesai.`
        }
      }
    }
  }

  return null
}

async function saveTimeline() {
  if (saving.value || loading.value) return

  const validationError = validateStages()

  if (validationError) {
    showNotification(
      'error',
      'Jadwal Timeline Tidak Valid',
      validationError,
    )
    return
  }

  saving.value = true

  try {
    const response = await $fetch<{
      success: boolean
      message: string
      data: {
        period: CertificationPeriod
        timelines: CertificationTimeline[]
      }
    }>('/api/certification-timelines', {
      method: 'POST',
      body: {
        periodId,
        stages: stages.value.map((stage) => ({
          stageOrder: stage.stageOrder,
          stageCode: stage.stageCode,
          stageName: stage.stageName,
          startAt: new Date(stage.startAt).toISOString(),
          endAt: new Date(stage.endAt).toISOString(),
        })),
      },
    })

    // Perbarui data dari respons penyimpanan.
    if (response.data?.period) {
      period.value = response.data.period
    }

    if (response.data?.timelines) {
      timelines.value = response.data.timelines
      populateStages(response.data.timelines)
    } else {
      await fetchTimelineAfterSave()
    }

    showNotification(
      'success',
      'Timeline Berhasil Disimpan',
      response.message || 'Seluruh jadwal tahapan sertifikasi berhasil diperbarui.',
    )
  } catch (error: any) {
    console.error('Gagal menyimpan timeline:', error)

    showNotification(
      'error',
      'Gagal Menyimpan Timeline',
      getErrorMessage(error),
    )
  } finally {
    saving.value = false
  }
}

async function fetchTimelineAfterSave() {
  const response = await $fetch<{
    success: boolean
    data: {
      period: CertificationPeriod
      timelines: CertificationTimeline[]
    }
  }>(`/api/certification-timelines/${periodId}`)

  period.value = response.data.period
  timelines.value = response.data.timelines
  populateStages(response.data.timelines)
}


function getOverrideMode(timeline?: CertificationTimeline): OverrideMode {
  const value = timeline?.is_override_open?.trim().toUpperCase()

  if (value === 'OPEN' || value === 'TRUE') return 'OPEN'
  if (value === 'CLOSED') return 'CLOSED'

  return 'NORMAL'
}

function getOverrideLabel(timeline?: CertificationTimeline) {
  const mode = getOverrideMode(timeline)

  if (mode === 'OPEN') return 'Akses Dibuka Manual'
  if (mode === 'CLOSED') return 'Akses Ditutup Manual'

  return 'Akses Sesuai Jadwal'
}

function getOverrideColor(
  timeline?: CertificationTimeline,
): 'success' | 'error' | 'neutral' {
  const mode = getOverrideMode(timeline)

  if (mode === 'OPEN') return 'success'
  if (mode === 'CLOSED') return 'error'

  return 'neutral'
}

function requestTimelineOverride(stageCode: string, mode: OverrideMode) {
  const timeline = getTimelineForStage(stageCode)

  if (!timeline) {
    showNotification(
      'error',
      'Timeline Belum Tersedia',
      'Simpan jadwal delapan tahapan terlebih dahulu.',
    )
    return
  }

  if (overrideSavingId.value || saving.value || loading.value) return

  overrideConfirmStageCode.value = stageCode
  overrideConfirmMode.value = mode
  overrideConfirmStageName.value = timeline.stage_name
  overrideConfirmModalOpen.value = true
}

async function confirmTimelineOverride() {
  if (!overrideConfirmStageCode.value || overrideSavingId.value) return

  const stageCode = overrideConfirmStageCode.value
  const mode = overrideConfirmMode.value
  overrideConfirmModalOpen.value = false
  await setTimelineOverride(stageCode, mode)
}

async function setTimelineOverride(
  stageCode: string,
  mode: OverrideMode,
) {
  const timeline = getTimelineForStage(stageCode)

  if (!timeline) {
    showNotification(
      'error',
      'Timeline Belum Tersedia',
      'Simpan jadwal delapan tahapan terlebih dahulu.',
    )
    return
  }

  if (overrideSavingId.value || saving.value || loading.value) return

  overrideSavingId.value = timeline.timeline_id

  try {
    const response = await $fetch<{
      success: boolean
      message: string
      data: CertificationTimeline
    }>(
      `/api/certification-timelines/${encodeURIComponent(timeline.timeline_id)}/override`,
      {
        method: 'PATCH',
        body: { mode },
      },
    )

    const index = timelines.value.findIndex(
      item => item.timeline_id === response.data.timeline_id,
    )

    if (index !== -1) {
      timelines.value[index] = response.data
    }

    showNotification(
      'success',
      'Akses Timeline Diperbarui',
      response.message,
    )
  } catch (error: any) {
    console.error('Gagal mengubah akses timeline:', error)

    showNotification(
      'error',
      'Gagal Mengubah Akses',
      getErrorMessage(error),
    )
  } finally {
    overrideSavingId.value = ''
  }
}

onMounted(() => {
  fetchTimeline()
})
</script>


<style scoped>
:deep(input[type="datetime-local"]::-webkit-calendar-picker-indicator) {
  cursor: pointer;
  background-color: #eff6ff;
  border: 2px solid #bfdbfe;
  border-radius: 8px;
  padding: 8px;
  opacity: 1;
  filter: none;
}
</style>
