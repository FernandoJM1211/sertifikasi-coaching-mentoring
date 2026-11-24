<script setup lang="ts">
/**
 * Beranda staf (Super Admin, Verifikator, Asesor): progres timeline setiap periode aktif
 * yang relevan, opsional dengan kartu "Tahapan Saat Ini" + tombol dinamis per role.
 *
 * Contoh:
 *   <TimelineStaffHome :tasks-for="(period, stage) => [...]" empty-description="..." />
 *
 * `tasksFor` dipanggil untuk setiap periode, juga bila tidak ada tahap berlangsung menurut jadwal
 * (`stage` undefined), karena tahap dapat dibuka manual oleh Super Admin — cek `period.insight`.
 */
import {
  buildTimelineStages,
  type StaffHomePeriod,
  type TimelineRecord,
  type TimelineStage,
  type TimelineTask,
} from '~/utils/timeline'
import type { HomeInsight } from '~~/shared/utils/home-insight'

const props = withDefaults(defineProps<{
  /** Panel tombol per periode; `stage` = tahap berlangsung menurut jadwal (bisa tidak ada). */
  tasksFor?: (period: StaffHomePeriod, stage: TimelineStage | undefined) => TimelineTask[]
  showCurrentStage?: boolean
  emptyDescription?: string
}>(), {
  tasksFor: undefined,
  showCurrentStage: true,
  emptyDescription: 'Timeline akan tampil di sini setelah ada periode sertifikasi yang aktif.',
})

type HomePeriod = { period_id: string, period_name: string, timelines: TimelineRecord[], insight?: HomeInsight | null }

const loading = ref(true)
const errorMessage = ref('')
const periods = ref<StaffHomePeriod[]>([])

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: HomePeriod[] }>('/api/home/periods', { credentials: 'include' })
    periods.value = response.data.map((period) => ({
      period_id: period.period_id,
      period_name: period.period_name,
      stages: buildTimelineStages(period.timelines),
      insight: period.insight ?? null,
    }))
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Timeline sertifikasi gagal dimuat. Silakan coba kembali.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function tasksOf(period: StaffHomePeriod) {
  const stage = period.stages.find((item) => item.status === 'active')
  return props.tasksFor ? props.tasksFor(period, stage) : []
}
</script>

<template>
  <UContainer class="space-y-6 pb-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-blue-500">
        {{ periods.length === 1 ? periods[0]?.period_name : 'Beranda' }}
      </h1>
      <p class="text-sm leading-6 text-slate-600">
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

    <UCard v-else-if="periods.length === 0" class="mx-auto max-w-2xl">
      <div class="flex flex-col items-center px-4 py-10 text-center">
        <div class="mb-5 flex size-16 items-center justify-center rounded-full border border-blue-300 bg-blue-50">
          <UIcon name="i-lucide-calendar-x" class="size-8 text-blue-500" />
        </div>
        <h2 class="text-xl font-semibold text-slate-900">Belum Ada Periode Aktif</h2>
        <p class="mt-3 max-w-lg text-sm leading-6 text-slate-600">{{ emptyDescription }}</p>
      </div>
    </UCard>

    <!-- Satu blok per periode aktif; nama periode ditampilkan bila lebih dari satu -->
    <section v-for="period in periods" v-else :key="period.period_id" class="space-y-4">
      <h2 v-if="periods.length > 1" class="text-lg font-semibold text-slate-900">{{ period.period_name }}</h2>
      <TimelineProgressBar :stages="period.stages" />
      <TimelineCurrentStage v-if="showCurrentStage" :stages="period.stages" :tasks="tasksOf(period)" />
    </section>
  </UContainer>
</template>
