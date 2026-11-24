<script setup lang="ts">
/**
 * Pilihan periode (kartu) sebelum membuka halaman per periode, mis. Verifikasi
 * Self Assessment atau Penugasan Asesor. Tampilan mengikuti halaman Periode Sertifikasi.
 *
 * Contoh:
 *   <PeriodPicker
 *     title="Verifikasi Self Assessment"
 *     description="Pilih periode sertifikasi untuk ..."
 *     note="Keputusan hanya dapat diberikan ..."
 *     action-label="Verifikasi Self Assessment"
 *     action-icon="i-lucide-clipboard-check"
 *     base-path="/verifikator/self-assessments"
 *   />
 */
const props = defineProps<{
  title: string
  description: string
  /** Keterangan di bawah judul "Daftar Periode". */
  note?: string
  actionLabel: string
  actionIcon: string
  /** Tombol kartu menuju `${basePath}/${period_id}`. */
  basePath: string
  /** Sumber daftar periode; default semua periode (Verifikator/Super Admin). */
  endpoint?: string
  /**
   * Kode tahap timeline fitur ini (mis. `EVALUATION`). Bila diisi, kartu menampilkan
   * "Jadwal: mulai – selesai" tahap tersebut menggantikan ID Periode.
   */
  stageCode?: string
}>()

type CertificationPeriod = {
  period_id: string
  period_name: string
  period_status: string
  stage_start_at?: string
  stage_end_at?: string
}

const periods = ref<CertificationPeriod[]>([])
const loading = ref(false)
const errorMessage = ref('')

const PERIOD_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  CLOSED: 'Ditutup',
  COMPLETED: 'Selesai',
}

function formatStatus(status: string) {
  return PERIOD_STATUS_LABELS[status.toUpperCase()] || status
}

function getStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'success' as const
    case 'CLOSED': return 'error' as const
    case 'COMPLETED': return 'primary' as const
    case 'DRAFT': return 'warning' as const
    default: return 'neutral' as const
  }
}

async function fetchPeriods() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: CertificationPeriod[] }>(props.endpoint || '/api/certification-periods', {
      credentials: 'include',
      query: props.stageCode ? { stage: props.stageCode } : undefined,
    })

    // Periode terbaru lebih dulu (sama seperti halaman Periode Sertifikasi).
    periods.value = [...response.data].reverse()
  } catch (error: unknown) {
    const errorData = (error as { data?: { statusMessage?: string } }).data
    errorMessage.value = errorData?.statusMessage || 'Daftar periode belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchPeriods)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-8 pb-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-blue-500">
        {{ title }}
      </h1>
      <p class="text-sm leading-6 text-slate-600">
        {{ description }}
      </p>
    </div>

    <!-- Judul daftar kiri; jumlah & Muat Ulang selalu di kanan (tidak turun baris di layar lebar) -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-slate-900">
          Daftar Periode
        </h2>
        <p v-if="note" class="mt-1 text-sm text-slate-600">
          {{ note }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <UBadge color="primary" variant="subtle" size="lg" class="px-3 py-1.5">
          {{ periods.length }} periode
        </UBadge>

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          :disabled="loading"
          @click="fetchPeriods"
        >
          Muat Ulang
        </UButton>
      </div>
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center rounded-xl border border-slate-300 bg-white/90 py-16 shadow-sm"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat daftar periode...</span>
    </div>

    <UAlert
      v-else-if="errorMessage"
      icon="i-lucide-circle-alert"
      color="error"
      variant="soft"
      :title="errorMessage"
    />

    <div
      v-else-if="periods.length > 0"
      class="grid grid-cols-1 items-start gap-5 md:grid-cols-2"
    >
      <UCard
        v-for="period in periods"
        :key="period.period_id"
        class="h-full bg-white/90 shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="flex h-full flex-col gap-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-2">
              <p class="text-xs font-medium text-primary">
                Periode Sertifikasi
              </p>

              <h3
                class="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-slate-900"
                :title="period.period_name"
              >
                {{ period.period_name }}
              </h3>

              <p v-if="stageCode" class="text-sm text-slate-600">
                Jadwal:
                <span class="font-medium text-slate-700">
                  {{ formatDateTimeId(period.stage_start_at) }} – {{ formatDateTimeId(period.stage_end_at) }}
                </span>
              </p>
              <p v-else class="text-sm text-slate-600">
                ID Periode:
                <span class="font-medium text-slate-700">{{ period.period_id }}</span>
              </p>
            </div>

            <UBadge
              :color="getStatusColor(period.period_status)"
              variant="subtle"
              class="shrink-0"
            >
              {{ formatStatus(period.period_status) }}
            </UBadge>
          </div>

          <div class="mt-auto border-t border-slate-300 pt-4">
            <UButton
              block
              color="primary"
              :icon="actionIcon"
              :to="`${basePath}/${period.period_id}`"
            >
              {{ actionLabel }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-else class="bg-white/90 shadow-sm">
      <div class="flex flex-col items-center py-12 text-center">
        <div class="flex size-14 items-center justify-center rounded-full border border-blue-300 bg-blue-100">
          <UIcon name="i-lucide-calendar-x" class="size-7 text-primary" />
        </div>
        <h3 class="mt-4 text-base font-semibold text-slate-900">
          Belum ada periode sertifikasi
        </h3>
        <p class="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Periode sertifikasi yang tersedia akan ditampilkan di halaman ini.
        </p>
      </div>
    </UCard>
  </div>
</template>
