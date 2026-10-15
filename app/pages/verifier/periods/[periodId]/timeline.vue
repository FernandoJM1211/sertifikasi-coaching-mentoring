
<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">
          Periode Sertifikasi
        </p>

        <h1 class="mt-1 text-2xl font-semibold text-slate-900">
          Pengaturan Timeline Sertifikasi
        </h1>

        <p class="mt-1 text-sm text-slate-500">
          Atur jadwal pelaksanaan setiap tahapan sertifikasi.
        </p>
      </div>

      <UButton
        to="/verifier/periods"
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
      <span class="ml-3 text-sm text-slate-500">
        Memuat informasi timeline...
      </span>
    </div>

    <!-- Informasi periode -->
    <template v-else-if="period">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="rounded-lg border border-blue-200 bg-blue-50/70 p-5">
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
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-primary">
              Jadwal Pelaksanaan
            </p>

            <h2 class="mt-1 text-lg font-semibold text-slate-900">
              Tahapan Sertifikasi
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              Atur waktu mulai dan selesai untuk seluruh 8 tahapan.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-primary"
            >
              {{ stages.length }}/8 tahap
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
                class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-primary"
              >
                {{ stage.stageOrder }}
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="font-semibold text-slate-900">
                  {{ stage.stageName }}
                </h3>

                <p class="mt-1 text-xs text-primary">
                  {{ stage.stageCode }}
                </p>

                <div
                  v-if="getTimelineForStage(stage.stageCode)"
                  class="mt-2"
                >
                  <UBadge
                    :color="
                      getTimelineForStage(stage.stageCode)?.is_override_open?.toUpperCase() === 'TRUE'
                        ? 'warning'
                        : 'neutral'
                    "
                    variant="subtle"
                  >
                    {{
                      getTimelineForStage(stage.stageCode)?.is_override_open?.toUpperCase() === 'TRUE'
                        ? 'Akses dibuka manual'
                        : 'Jadwal normal'
                    }}
                  </UBadge>
                </div>
              </div>
            </div>

            <div class="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
              <UFormField
                :label="`Waktu Mulai — ${stage.stageName}`"
                :name="`startAt-${stage.stageCode}`"
                required
              >
                <UInput
                  v-model="stage.startAt"
                  type="datetime-local"
                  class="w-full"
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
                  class="w-full"
                  :disabled="saving || loading"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <!-- Tombol aksi -->
        <div class="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-undo-2"
            :disabled="saving || loading"
            @click="fetchTimeline"
          >
            Batalkan Perubahan
          </UButton>

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

              <p class="mt-1 text-sm leading-6 text-slate-500">
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
  layout: 'verifier',
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
  startAt: string
  endAt: string
}

type NotificationType = 'success' | 'error'

const REQUIRED_STAGES = [
  {
    stageOrder: 1,
    stageCode: 'REGISTRATION',
    stageName: 'Pendaftaran',
  },
  {
    stageOrder: 2,
    stageCode: 'DOCUMENT_VERIFICATION',
    stageName: 'Verifikasi Berkas',
  },
  {
    stageOrder: 3,
    stageCode: 'SELF_ASSESSMENT',
    stageName: 'Self Assessment',
  },
  {
    stageOrder: 4,
    stageCode: 'EVALUATION',
    stageName: 'Evaluasi',
  },
  {
    stageOrder: 5,
    stageCode: 'SELF_ASSESSMENT_VERIFICATION',
    stageName: 'Verifikasi Self Assessment',
  },
  {
    stageOrder: 6,
    stageCode: 'ASSESSOR_ASSESSMENT',
    stageName: 'Assessment oleh Assessor',
  },
  {
    stageOrder: 7,
    stageCode: 'ASSESSMENT_VERIFICATION',
    stageName: 'Verifikasi Penilaian',
  },
  {
    stageOrder: 8,
    stageCode: 'ANNOUNCEMENT',
    stageName: 'Pengumuman',
  },
]

const route = useRoute()
const periodId = String(route.params.periodId || '')

const period = ref<CertificationPeriod | null>(null)
const timelines = ref<CertificationTimeline[]>([])
const stages = ref<TimelineStageForm[]>([])

const loading = ref(false)
const saving = ref(false)

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
    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
    : 'border-red-200 bg-red-50/70 text-red-800'
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

onMounted(() => {
  fetchTimeline()
})
</script>
