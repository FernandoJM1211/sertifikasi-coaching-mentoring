<script setup lang="ts">
/** Daftar pengajuan peserta untuk membuka halaman evaluasi. */
definePageMeta({ layout: 'peserta' })
useHead({ title: 'Evaluasi' })

type DashboardApplication = {
  application: { application_id: string, period_id: string, application_status?: string, institution_name?: string }
  period: { period_id: string, period_name: string } | null
  timelines?: { stage_code?: string, start_at?: string, end_at?: string }[]
}

const { data, pending, error, refresh } = await useFetch<{ applications: DashboardApplication[] }>('/api/peserta/dashboard')

/** Hanya pengajuan yang sudah diterima yang dapat mengikuti evaluasi. */
const applications = computed(() =>
  (data.value?.applications ?? []).filter((item) => item.application?.application_status === 'accepted'),
)

const evaluationStage = (item: DashboardApplication) =>
  item.timelines?.find((stage) => stage.stage_code === 'EVALUATION')
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <section>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Evaluasi</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Evaluasi pilihan ganda dikerjakan satu kali pada tahap Evaluasi, setelah self assessment Anda terverifikasi.
      </p>
    </section>

    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-28 w-full" />
    </div>

    <UAlert v-else-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" title="Data pengajuan belum dapat dimuat">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="refresh()">Muat Ulang</UButton>
      </template>
    </UAlert>

    <div v-else-if="applications.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <UIcon name="i-lucide-file-pen-line" class="mx-auto size-10 text-slate-400" />
      <h2 class="mt-4 text-base font-semibold text-slate-900">Belum Ada Evaluasi</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Evaluasi tersedia untuk pengajuan sertifikasi yang sudah diterima.
      </p>
    </div>

    <article
      v-for="item in applications"
      v-else
      :key="item.application.application_id"
      class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <h2 class="font-semibold text-slate-900">{{ item.period?.period_name || 'Periode Sertifikasi' }}</h2>
        <p class="mt-1 text-sm text-slate-500">
          Jadwal evaluasi:
          <span class="font-medium text-slate-700">
            {{ formatDateTimeId(evaluationStage(item)?.start_at) }} – {{ formatDateTimeId(evaluationStage(item)?.end_at) }}
          </span>
        </p>
      </div>
      <UButton
        :to="`/peserta/evaluation/${encodeURIComponent(item.application.application_id)}`"
        trailing-icon="i-lucide-arrow-right"
        class="shrink-0"
      >
        Buka Evaluasi
      </UButton>
    </article>
  </div>
</template>
