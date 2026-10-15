<template>
  <div class="mx-auto w-full max-w-5xl space-y-8 pb-8">
    <!-- Header -->
    <div class="space-y-2">
      <p class="text-sm font-medium text-primary">
        Manajemen Sertifikasi
      </p>

      <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
        Periode Sertifikasi
      </h1>

      <p class="text-sm leading-6 text-slate-500">
        Pilih periode sertifikasi yang ingin kamu pantau dan kelola.
      </p>
    </div>

    <!-- Pesan sukses -->
    <UAlert
      v-if="successMessage"
      icon="i-lucide-circle-check"
      color="success"
      variant="soft"
      :title="successMessage"
      :close-button="{ onClick: () => (successMessage = '') }"
    />

    <!-- Ringkasan -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-slate-900">
          Daftar Periode
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Kelola jadwal tahapan dan verifikasi peserta untuk setiap periode.
        </p>
      </div>

<div class="flex flex-wrap items-center gap-2">
  <UBadge color="primary" variant="subtle" size="lg">
    {{ periods.length }} periode
  </UBadge>

  <UButton
    to="/verifier/periods/create"
    color="primary"
    icon="i-lucide-plus"
  >
    Buat Periode
  </UButton>

  <UButton
    color="neutral"
    variant="outline"
    icon="i-lucide-refresh-cw"
    :loading="loading"
    :disabled="loading || activatingPeriodId !== null"
    @click="fetchPeriods"
  >
    Muat Ulang
  </UButton>
</div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center rounded-xl border border-slate-200 bg-white/90 py-16 shadow-sm"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-primary"
      />
      <span class="ml-3 text-sm text-slate-500">
        Memuat daftar periode...
      </span>
    </div>

    <!-- Error memuat data -->
    <UAlert
      v-else-if="errorMessage"
      icon="i-lucide-circle-alert"
      color="error"
      variant="soft"
      :title="errorMessage"
    />

    <!-- Daftar periode -->
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
          <!-- Informasi periode -->
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

              <p class="text-sm text-slate-500">
                ID Periode:
                <span class="font-medium text-slate-700">
                  {{ period.period_id }}
                </span>
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

          <!-- Navigasi -->
          <div
            class="mt-auto grid grid-cols-1 gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2"
          >
            <UButton
              block
              color="neutral"
              variant="outline"
              icon="i-lucide-calendar-clock"
              :to="`/verifier/periods/${period.period_id}/timeline`"
            >
              Atur Timeline
            </UButton>

            <UButton
              block
              color="primary"
              icon="i-lucide-users"
              :to="`/verifier/periods/${period.period_id}`"
            >
              Verifikasi Peserta
            </UButton>

            <!-- Draft menjadi Aktif -->
            <UButton
              v-if="period.period_status.toUpperCase() === 'DRAFT'"
              block
              color="success"
              icon="i-lucide-check-circle"
              class="sm:col-span-2"
              :loading="activatingPeriodId === period.period_id"
              :disabled="activatingPeriodId !== null"
              @click="openStatusModal(period, 'ACTIVE')"
            >
              Aktifkan Periode
            </UButton>

            <!-- Aktif menjadi Ditutup -->
            <UButton
              v-else-if="period.period_status.toUpperCase() === 'ACTIVE'"
              block
              color="warning"
              icon="i-lucide-lock"
              class="sm:col-span-2"
              :loading="activatingPeriodId === period.period_id"
              :disabled="activatingPeriodId !== null"
              @click="openStatusModal(period, 'CLOSED')"
            >
              Tutup Periode
            </UButton>

            <!-- Ditutup: buka kembali atau selesaikan -->
            <template
              v-else-if="period.period_status.toUpperCase() === 'CLOSED'"
            >
              <UButton
                block
                color="success"
                icon="i-lucide-lock-open"
                class="sm:col-span-2"
                :loading="activatingPeriodId === period.period_id"
                :disabled="activatingPeriodId !== null"
                @click="openStatusModal(period, 'ACTIVE')"
              >
                Buka Kembali Periode
              </UButton>

              <UButton
                block
                color="primary"
                icon="i-lucide-check-check"
                class="sm:col-span-2"
                :loading="activatingPeriodId === period.period_id"
                :disabled="activatingPeriodId !== null"
                @click="openStatusModal(period, 'COMPLETED')"
              >
                Selesaikan Periode
              </UButton>
            </template>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Data kosong -->
    <UCard v-else class="bg-white/90 shadow-sm">
      <div class="flex flex-col items-center py-12 text-center">
        <div
          class="flex size-14 items-center justify-center rounded-full bg-primary/10"
        >
          <UIcon
            name="i-lucide-calendar-x"
            class="size-7 text-primary"
          />
        </div>

        <h3 class="mt-4 text-base font-semibold text-slate-900">
          Belum ada periode sertifikasi
        </h3>

        <p class="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Periode sertifikasi yang tersedia akan ditampilkan di halaman ini.
        </p>
      </div>
    </UCard>

    <!-- Modal konfirmasi -->
    <UModal
      v-model:open="activationModalOpen"
      :dismissible="activatingPeriodId === null"
    >
      <template #content>
        <div class="space-y-5 p-6">
          <div class="flex items-start gap-4">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-xl ring-1"
              :class="statusModalHeaderClass"
            >
              <UIcon
                :name="statusModalIcon"
                class="size-6"
              />
            </div>

            <div class="min-w-0">
              <h2 class="text-lg font-semibold text-slate-900">
                {{ statusModalTitle }}
              </h2>

              <p class="mt-1 text-sm leading-6 text-slate-500">
                {{ statusModalSubtitle }}
              </p>
            </div>
          </div>

          <!-- Periode yang dipilih -->
          <div
            v-if="selectedPeriod"
            class="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <p class="text-xs font-medium text-slate-500">
              Periode yang akan diubah
            </p>

            <p class="mt-1 font-semibold text-slate-900">
              {{ selectedPeriod.period_name }}
            </p>

            <p class="mt-1 text-sm text-slate-500">
              ID Periode: {{ selectedPeriod.period_id }}
            </p>

            <div class="mt-3">
              <UBadge
                :color="getStatusColor(targetPeriodStatus)"
                variant="subtle"
              >
                {{ formatStatus(selectedPeriod.period_status) }}
                →
                {{ formatStatus(targetPeriodStatus) }}
              </UBadge>
            </div>
          </div>

          <!-- Peringatan -->
          <UAlert
            :icon="statusAlertIcon"
            :color="statusAlertColor"
            variant="soft"
            :title="statusAlertTitle"
            :description="statusAlertDescription"
          />

          <p class="text-sm leading-6 text-slate-600">
            {{ statusModalNote }}
          </p>

          <!-- Tombol modal -->
          <div
            class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
          >
            <UButton
              color="neutral"
              variant="outline"
              :disabled="activatingPeriodId !== null"
              @click="closeActivationModal"
            >
              Batal
            </UButton>

            <UButton
              :color="statusActionButtonColor"
              :icon="statusActionButtonIcon"
              :loading="activatingPeriodId !== null"
              :disabled="!selectedPeriod || activatingPeriodId !== null"
              @click="confirmActivation"
            >
              {{ statusActionButtonLabel }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal error -->
    <UModal v-model:open="errorModalOpen" :dismissible="true">
      <template #content>
        <div class="space-y-5 p-6">
          <div class="flex items-start gap-4">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200"
            >
              <UIcon
                name="i-lucide-circle-alert"
                class="size-6"
              />
            </div>

            <div class="min-w-0">
              <h2 class="text-lg font-semibold text-slate-900">
                Status Periode Tidak Dapat Diubah
              </h2>

              <p class="mt-1 text-sm leading-6 text-slate-500">
                Permintaan perubahan status belum dapat diproses.
              </p>
            </div>
          </div>

          <UAlert
            icon="i-lucide-alert-triangle"
            color="error"
            variant="soft"
            :title="actionErrorMessage"
          />

          <p class="text-sm leading-6 text-slate-600">
            Periksa kembali status periode dan ketentuan proses sertifikasi.
            Jika masalah masih terjadi, periksa data periode dan log server
            sebelum mencoba kembali.
          </p>

          <div class="flex justify-end">
            <UButton
              color="primary"
              @click="errorModalOpen = false"
            >
              Mengerti
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
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

type TargetPeriodStatus = 'ACTIVE' | 'CLOSED' | 'COMPLETED'

definePageMeta({
  layout: 'verifier',
})

const periods = ref<CertificationPeriod[]>([])
const loading = ref(false)
const activatingPeriodId = ref<string | null>(null)

const errorMessage = ref('')
const actionErrorMessage = ref('')
const successMessage = ref('')

const activationModalOpen = ref(false)
const errorModalOpen = ref(false)
const selectedPeriod = ref<CertificationPeriod | null>(null)
const targetPeriodStatus = ref<TargetPeriodStatus>('ACTIVE')

const isReopeningPeriod = computed(() => {
  return (
    targetPeriodStatus.value === 'ACTIVE' &&
    selectedPeriod.value?.period_status.toUpperCase() === 'CLOSED'
  )
})

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

function getStatusColor(
  status: string,
): 'neutral' | 'success' | 'warning' | 'error' | 'primary' {
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

function getErrorMessage(error: any) {
  return (
    error?.data?.statusMessage ||
    error?.data?.message ||
    error?.statusMessage ||
    'Terjadi kesalahan. Silakan coba lagi.'
  )
}

const statusModalTitle = computed(() => {
  if (isReopeningPeriod.value) {
    return 'Konfirmasi Buka Kembali Periode'
  }

  const titles: Record<TargetPeriodStatus, string> = {
    ACTIVE: 'Konfirmasi Aktivasi Periode',
    CLOSED: 'Konfirmasi Penutupan Periode',
    COMPLETED: 'Konfirmasi Penyelesaian Periode',
  }

  return titles[targetPeriodStatus.value]
})

const statusModalSubtitle = computed(() => {
  if (isReopeningPeriod.value) {
    return 'Periode yang ditutup akan diaktifkan kembali agar proses sertifikasi dapat dilanjutkan.'
  }

  const subtitles: Record<TargetPeriodStatus, string> = {
    ACTIVE:
      'Aktivasi menentukan periode sertifikasi yang digunakan dalam proses berikutnya.',
    CLOSED:
      'Penutupan mengakhiri status aktif periode sertifikasi ini.',
    COMPLETED:
      'Penyelesaian menandai bahwa periode sertifikasi telah rampung.',
  }

  return subtitles[targetPeriodStatus.value]
})

const statusModalIcon = computed(() => {
  if (isReopeningPeriod.value) {
    return 'i-lucide-lock-open'
  }

  const icons: Record<TargetPeriodStatus, string> = {
    ACTIVE: 'i-lucide-shield-alert',
    CLOSED: 'i-lucide-lock',
    COMPLETED: 'i-lucide-check-check',
  }

  return icons[targetPeriodStatus.value]
})

const statusModalHeaderClass = computed(() => {
  if (isReopeningPeriod.value) {
    return 'bg-emerald-50 text-emerald-600 ring-emerald-200'
  }

  const classes: Record<TargetPeriodStatus, string> = {
    ACTIVE: 'bg-amber-50 text-amber-600 ring-amber-200',
    CLOSED: 'bg-orange-50 text-orange-600 ring-orange-200',
    COMPLETED: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  }

  return classes[targetPeriodStatus.value]
})

const statusAlertIcon = computed(() => {
  return targetPeriodStatus.value === 'COMPLETED'
    ? 'i-lucide-check-circle'
    : 'i-lucide-alert-triangle'
})

const statusAlertColor = computed(() => {
  return targetPeriodStatus.value === 'COMPLETED'
    ? 'success'
    : 'warning'
})

const statusAlertTitle = computed(() => {
  if (isReopeningPeriod.value) {
    return 'Pastikan tidak ada periode lain yang belum selesai.'
  }

  const titles: Record<TargetPeriodStatus, string> = {
    ACTIVE: 'Pastikan tidak ada periode lain yang belum selesai.',
    CLOSED: 'Pastikan periode ini siap ditutup.',
    COMPLETED: 'Pastikan seluruh proses sertifikasi sudah selesai.',
  }

  return titles[targetPeriodStatus.value]
})

const statusAlertDescription = computed(() => {
  if (isReopeningPeriod.value) {
    return 'CMSP hanya mengizinkan satu kegiatan sertifikasi yang belum selesai pada satu waktu. Pembukaan kembali akan ditolak jika ada periode lain yang masih Aktif atau Ditutup.'
  }

  const descriptions: Record<TargetPeriodStatus, string> = {
    ACTIVE:
      'CMSP hanya mengizinkan satu kegiatan sertifikasi yang belum selesai pada satu waktu. Selesaikan periode yang masih Aktif atau Ditutup sebelum mengaktifkan periode baru.',
    CLOSED:
      'Pastikan proses yang perlu dilakukan selama periode ini sudah ditangani. Periode yang ditutup tidak lagi berstatus Aktif.',
    COMPLETED:
      'Pastikan seluruh tahapan, penilaian, verifikasi, dan pengumuman telah dituntaskan sebelum menetapkan periode sebagai Selesai.',
  }

  return descriptions[targetPeriodStatus.value]
})

const statusModalNote = computed(() => {
  if (isReopeningPeriod.value) {
    return 'Pembukaan kembali memerlukan delapan tahapan timeline yang lengkap dan valid. Jika ada periode lain yang belum selesai, permintaan ini akan ditolak.'
  }

  const notes: Record<TargetPeriodStatus, string> = {
    ACTIVE:
      'Pastikan seluruh delapan tahapan sudah memiliki jadwal yang benar. Jika masih ada periode lain yang belum selesai, permintaan ini akan ditolak.',
    CLOSED:
      'Periode yang ditutup dapat dibuka kembali selama tidak ada periode lain yang belum selesai dan timeline-nya masih valid.',
    COMPLETED:
      'Status Selesai merupakan penanda akhir periode. Pastikan keputusan ini sesuai dengan kondisi proses sertifikasi yang sebenarnya.',
  }

  return notes[targetPeriodStatus.value]
})

const statusActionButtonColor = computed(() => {
  const colors: Record<TargetPeriodStatus, 'success' | 'warning' | 'primary'> = {
    ACTIVE: 'success',
    CLOSED: 'warning',
    COMPLETED: 'primary',
  }

  return colors[targetPeriodStatus.value]
})

const statusActionButtonIcon = computed(() => {
  if (isReopeningPeriod.value) {
    return 'i-lucide-lock-open'
  }

  const icons: Record<TargetPeriodStatus, string> = {
    ACTIVE: 'i-lucide-check-circle',
    CLOSED: 'i-lucide-lock',
    COMPLETED: 'i-lucide-check-check',
  }

  return icons[targetPeriodStatus.value]
})

const statusActionButtonLabel = computed(() => {
  if (isReopeningPeriod.value) {
    return 'Ya, Buka Kembali Periode'
  }

  const labels: Record<TargetPeriodStatus, string> = {
    ACTIVE: 'Ya, Aktifkan Periode',
    CLOSED: 'Ya, Tutup Periode',
    COMPLETED: 'Ya, Selesaikan Periode',
  }

  return labels[targetPeriodStatus.value]
})

async function fetchPeriods() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{
      success: boolean
      data: CertificationPeriod[]
    }>('/api/certification-periods')

    periods.value = [...response.data].reverse()
  } catch (error: any) {
    console.error('Gagal memuat periode sertifikasi:', error)
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

function openStatusModal(
  period: CertificationPeriod,
  status: TargetPeriodStatus,
) {
  actionErrorMessage.value = ''
  errorModalOpen.value = false
  successMessage.value = ''

  selectedPeriod.value = period
  targetPeriodStatus.value = status
  activationModalOpen.value = true
}

function closeActivationModal() {
  if (activatingPeriodId.value !== null) {
    return
  }

  activationModalOpen.value = false
  selectedPeriod.value = null
}

async function confirmActivation() {
  const period = selectedPeriod.value

  if (!period || activatingPeriodId.value !== null) {
    return
  }

  const status = targetPeriodStatus.value

  activatingPeriodId.value = period.period_id
  actionErrorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await $fetch<{
      success: boolean
      message: string
      data: CertificationPeriod
    }>(`/api/certification-periods/${period.period_id}/status`, {
      method: 'PATCH',
      body: {
        periodStatus: status,
      },
    })

    successMessage.value =
      response.message ||
      `Status periode berhasil diubah menjadi ${formatStatus(status)}.`

    activationModalOpen.value = false
    selectedPeriod.value = null

    await fetchPeriods()
  } catch (error: any) {
    console.error('Gagal mengubah status periode:', error)

    actionErrorMessage.value = getErrorMessage(error)
    activationModalOpen.value = false

    await fetchPeriods()
    errorModalOpen.value = true
  } finally {
    activatingPeriodId.value = null
  }
}

onMounted(() => {
  fetchPeriods()
})
</script>