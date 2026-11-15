<script setup lang="ts">
type StageStatus = 'completed' | 'active' | 'upcoming'

type CertificationPeriod = {
  period_id: string
  period_name: string
  period_status: string
}

type Application = {
  application_id: string
  period_id: string
  application_status: string
}

type TimelineRecord = {
  timeline_id?: string
  period_id?: string
  stage_order?: string | number
  stage_code?: string
  stage_name?: string
  stage_start_date?: string
  stage_end_date?: string
  start_date?: string
  end_date?: string
  start_at?: string
  end_at?: string
  status?: string
  [key: string]: unknown
}

type DashboardApplication = {
  application: Application
  period: CertificationPeriod | null
  timelines: TimelineRecord[]
}

type DashboardResponse = {
  success: boolean
  applications: DashboardApplication[]
}

type CertificationStage = {
  order: number
  code: string
  name: string
  startAt: string
  endAt: string
  status: StageStatus
}

definePageMeta({ layout: 'peserta' })
useHead({ title: 'Timeline Sertifikasi' })

const loading = ref(true)
const errorMessage = ref('')
const periodName = ref('')
const applicationId = ref('')
const periodId = ref('')
const stages = ref<CertificationStage[]>([])

const activeStage = computed(() =>
  stages.value.find((stage) => stage.status === 'active'),
)

const stageNameByOrder: Record<number, { code: string; name: string }> = {
  1: { code: 'REGISTRATION', name: 'Pendaftaran' },
  2: { code: 'DOCUMENT_VERIFICATION', name: 'Verifikasi Peserta' },
  3: { code: 'SELF_ASSESSMENT', name: 'Self Assessment' },
  4: { code: 'SELF_ASSESSMENT_VERIFICATION', name: 'Verifikasi Self Assessment' },
  5: { code: 'EVALUATION', name: 'Evaluasi' },
  6: { code: 'ASSESSOR_ASSESSMENT', name: 'Assessment oleh Asesor' },
  7: { code: 'ASSESSMENT_VERIFICATION', name: 'Verifikasi Penilaian' },
  8: { code: 'ANNOUNCEMENT', name: 'Pengumuman' },
}

function firstString(record: TimelineRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function parseDate(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getDerivedStatus(startAt: string, endAt: string): StageStatus {
  const now = new Date()
  const start = parseDate(startAt)
  const end = parseDate(endAt)

  if (end && now > end) return 'completed'
  if (start && now >= start && (!end || now <= end)) return 'active'
  return 'upcoming'
}

function normalizeStage(record: TimelineRecord): CertificationStage {
  const order = Number(record.stage_order || 0)
  const fallback = stageNameByOrder[order]
  const startAt = firstString(record, [
    'stage_start_date',
    'start_date',
    'start_at',
    'startAt',
  ])
  const endAt = firstString(record, [
    'stage_end_date',
    'end_date',
    'end_at',
    'endAt',
  ])

  const rawStatus = String(record.status || '').toLowerCase()
  const status: StageStatus =
    ['completed', 'active', 'upcoming'].includes(rawStatus)
      ? (rawStatus as StageStatus)
      : getDerivedStatus(startAt, endAt)

  return {
    order,
    code: String(record.stage_code || fallback?.code || `STAGE_${order}`),
    name: String(record.stage_name || fallback?.name || `Tahap ${order}`),
    startAt,
    endAt,
    status,
  }
}

function formatStageDate(value: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

function getStageColor(status: StageStatus) {
  if (status === 'completed') return 'bg-emerald-500'
  if (status === 'active') return 'bg-blue-500'
  return 'bg-gray-200 dark:bg-gray-700'
}

function getStageTextColor(status: StageStatus) {
  if (status === 'completed') return 'text-emerald-600 dark:text-emerald-400'
  if (status === 'active') return 'text-blue-600 dark:text-blue-400'
  return 'text-gray-400 dark:text-gray-500'
}

async function loadActiveCertification() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<DashboardResponse>('/api/peserta/dashboard', {
      credentials: 'include',
    })

    if (!response.success || !Array.isArray(response.applications)) {
      throw new Error('Format data sertifikasi tidak sesuai.')
    }

    const activeApplication = response.applications.find((item) =>
      item.period?.period_status?.toUpperCase() === 'ACTIVE'
      && Boolean(item.application?.application_id),
    )

    if (!activeApplication?.period) {
      periodName.value = ''
      applicationId.value = ''
      periodId.value = ''
      stages.value = []
      return
    }

    periodName.value = activeApplication.period.period_name
    periodId.value = activeApplication.period.period_id
    applicationId.value = activeApplication.application.application_id
    stages.value = (activeApplication.timelines || [])
      .map(normalizeStage)
      .sort((a, b) => a.order - b.order)
  } catch (error: unknown) {
    console.error('Gagal memuat timeline sertifikasi:', error)

    const apiError = error as {
      data?: { statusMessage?: string; message?: string }
      message?: string
    }

    errorMessage.value =
      apiError.data?.statusMessage ||
      apiError.data?.message ||
      apiError.message ||
      'Timeline sertifikasi gagal dimuat. Silakan coba kembali.'
  } finally {
    loading.value = false
  }
}

function handleStageAction(stage: CertificationStage) {
  if (stage.code !== 'SELF_ASSESSMENT') return

  if (!applicationId.value) {
    errorMessage.value = 'Identitas pendaftaran tidak ditemukan.'
    return
  }

  navigateTo(`/peserta/self-assessment/${encodeURIComponent(applicationId.value)}`)
}

onMounted(loadActiveCertification)
</script>

<template>
  <UContainer>
    <div class="mb-8">
      <h1 class="text-3xl font-semibold tracking-tight text-blue-500">
        Timeline Sertifikasi
      </h1>
      <p class="mt-2 text-base text-gray-500 dark:text-gray-400">
        Periode
        <span class="font-semibold text-gray-900 dark:text-white">
          {{ periodName || (loading ? 'Memuat periode...' : 'Belum ada periode aktif') }}
        </span>
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
      class="mb-6"
    />

    <UCard v-else-if="!applicationId" class="mx-auto max-w-2xl">
      <div class="flex flex-col items-center px-4 py-10 text-center">
        <div class="mb-5 flex size-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
          <UIcon name="i-lucide-calendar-clock" class="size-8 text-blue-500" />
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Belum Ada Sertifikasi Aktif
        </h2>
        <p class="mt-3 max-w-lg text-sm leading-6 text-gray-500 dark:text-gray-400">
          Saat ini Anda belum memiliki pendaftaran pada periode sertifikasi
          Coaching dan Mentoring yang aktif. Silakan periksa kembali secara
          berkala atau hubungi administrator jika membutuhkan informasi lebih lanjut.
        </p>
      </div>
    </UCard>

    <template v-else>
      <UCard v-if="stages.length" class="mb-6">
        <div class="overflow-x-auto pb-4">
          <div class="flex min-w-[900px]">
            <div
              v-for="(stage, index) in stages"
              :key="stage.code"
              class="relative flex min-w-0 flex-1 flex-col items-center"
            >
              <div
                class="relative z-10 flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold transition-colors"
                :class="[
                  getStageColor(stage.status),
                  stage.status === 'upcoming'
                    ? 'text-gray-500 dark:text-gray-300'
                    : 'text-white',
                ]"
              >
                {{ formatStageDate(stage.startAt) }}
              </div>
              <div
                v-if="index < stages.length - 1"
                class="absolute left-1/2 top-[50px] h-1 w-full rounded-full"
                :class="
                  stage.status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                "
              />
              <div class="mt-4 w-full px-1 text-center">
                <p class="text-xs font-semibold" :class="getStageTextColor(stage.status)">
                  Tahap {{ stage.order }}
                </p>
                <p class="mt-1 text-xs font-medium leading-relaxed text-gray-700 dark:text-gray-200">
                  {{ stage.name }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Selesai
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span class="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Sedang Berlangsung
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span class="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            Belum Dimulai
          </div>
        </div>
      </UCard>

      <UCard v-else class="mb-6">
        <p class="py-6 text-center text-sm text-gray-500">
          Timeline untuk periode ini belum tersedia.
        </p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            <p class="text-base font-semibold text-blue-500">Tahapan Saat Ini</p>
            <div class="hidden h-6 border-l border-gray-200 sm:block dark:border-gray-700" />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Tanggal Mulai:
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ formatStageDate(activeStage?.startAt || '') }}
              </span>
            </p>
            <div class="hidden h-6 border-l border-gray-200 sm:block dark:border-gray-700" />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Tanggal Selesai:
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ formatStageDate(activeStage?.endAt || '') }}
              </span>
            </p>
          </div>
        </template>

        <div v-if="activeStage">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ activeStage.name }}
          </h2>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Tahapan ini sedang berlangsung. {{ activeStage.code === 'SELF_ASSESSMENT'
              ? 'Silakan lengkapi formulir permohonan dan penilaian mandiri.'
              : 'Silakan pantau perkembangan proses sertifikasi melalui timeline ini.' }}
          </p>
          <div v-if="activeStage.code === 'SELF_ASSESSMENT'" class="mt-6 flex justify-center">
            <UButton
              size="lg"
              class="justify-center"
              trailing-icon="i-lucide-arrow-right"
              @click="handleStageAction(activeStage)"
            >
              Isi Self Assessment
            </UButton>
          </div>
          <div v-else class="mt-6">
            <UAlert
              color="info"
              variant="subtle"
              icon="i-lucide-info"
              title="Menunggu proses tahapan"
              description="Belum ada formulir atau tindakan yang perlu dilakukan peserta pada tahapan ini."
            />
          </div>
        </div>

        <div v-else class="py-4 text-center">
          <p class="font-medium text-gray-700 dark:text-gray-200">
            Tidak ada tahapan yang sedang berlangsung.
          </p>
        </div>
      </UCard>
    </template>
  </UContainer>
</template>
