<script setup lang="ts">
import Cmsp01Form from '~/components/certification/Cmsp01Form.vue'
import Cmsp02Form from '~/components/certification/Cmsp02Form.vue'

definePageMeta({ layout: 'user' })
useHead({ title: 'Formulir Self Assessment' })

type AssessmentTab = 'CMSP01' | 'CMSP02'

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

type DashboardApplication = {
  application: Application
  period: CertificationPeriod | null
  timelines: unknown[]
}

type DashboardResponse = {
  success: boolean
  applications: DashboardApplication[]
}

const route = useRoute()
const applicationId = computed(() => String(route.params.applicationId || ''))

const activeTab = ref<AssessmentTab>('CMSP01')
const loading = ref(true)
const errorMessage = ref('')
const selectedApplication = ref<DashboardApplication | null>(null)

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

async function loadApplication() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<DashboardResponse>('/api/user/dashboard', {
      credentials: 'include',
    })

    selectedApplication.value =
      (response.applications || []).find(
        (item) => item.application?.application_id === applicationId.value,
      ) || null

    if (!selectedApplication.value) {
      errorMessage.value = 'Pengajuan sertifikasi tidak ditemukan atau tidak dapat diakses.'
    }
  } catch (error) {
    console.error('Gagal memuat data pengajuan:', error)
    errorMessage.value = 'Data pengajuan belum dapat dimuat. Silakan coba kembali.'
  } finally {
    loading.value = false
  }
}

onMounted(loadApplication)
</script>

<template>
  <UContainer class="py-6">
    <div class="mb-5">
      <UButton
        to="/user/self-assessment"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        class="-ml-2"
      >
        Kembali ke Daftar Self Assessment
      </UButton>
    </div>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-16 w-full" />
      <USkeleton class="h-12 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UAlert
      v-else-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Pengajuan Tidak Dapat Dibuka"
      :description="errorMessage"
    />

    <template v-else-if="selectedApplication">
      <div class="mb-6">
        <p class="text-sm font-medium text-primary">Pengajuan Sertifikasi</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">
          {{ selectedApplication.period?.period_name || 'Formulir Self Assessment' }}
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          Lengkapi kedua formulir berikut untuk pengajuan sertifikasi ini.
        </p>
      </div>

      <div class="mb-6 grid gap-3 sm:grid-cols-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-xl border p-4 text-left transition"
          :class="activeTab === tab.id
            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
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
              <span class="mt-1 block text-sm text-slate-500">{{ tab.description }}</span>
            </span>
          </div>
        </button>
      </div>

      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Perhatian"
        description="Pastikan data dan dokumen yang diisi sesuai dengan pengajuan sertifikasi yang sedang dipilih."
        class="mb-6"
      />

      <div v-show="activeTab === 'CMSP01'">
        <CertificationCmsp01Form :application-id="applicationId" />
      </div>
      <div v-show="activeTab === 'CMSP02'">
        <CertificationCmsp02Form :application-id="applicationId" />
      </div>
    </template>
  </UContainer>
</template>
