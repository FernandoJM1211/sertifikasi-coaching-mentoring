<script setup lang="ts">
/**
 * Progres bar timeline sertifikasi (dipakai beranda semua role).
 * Contoh: <TimelineProgressBar :stages="buildTimelineStages(timelines)" />
 */
import type { TimelineStage, TimelineStageStatus } from '~/utils/timeline'

defineProps<{ stages: TimelineStage[] }>()

function formatShortDate(value: string) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' }).format(date)
}

const CIRCLE: Record<TimelineStageStatus, string> = {
  completed: 'bg-emerald-500 text-white',
  active: 'bg-blue-500 text-white',
  upcoming: 'bg-gray-200 text-slate-600',
}

const LABEL: Record<TimelineStageStatus, string> = {
  completed: 'text-emerald-600',
  active: 'text-blue-600',
  upcoming: 'text-slate-500',
}
</script>

<template>
  <UCard v-if="stages.length">
    <div class="overflow-x-auto pb-4">
      <div class="flex min-w-[900px]">
        <div
          v-for="(stage, index) in stages"
          :key="stage.code"
          class="relative flex min-w-0 flex-1 flex-col items-center"
        >
          <div
            class="relative z-10 flex size-12 items-center justify-center rounded-full text-xs font-semibold transition-colors"
            :class="CIRCLE[stage.status]"
          >
            {{ formatShortDate(stage.startAt) }}
          </div>
          <div
            v-if="index < stages.length - 1"
            class="absolute left-1/2 top-[50px] h-1 w-full rounded-full"
            :class="stage.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-200'"
          />
          <div class="mt-4 w-full px-1 text-center">
            <p class="text-xs font-semibold" :class="LABEL[stage.status]">Tahap {{ stage.order }}</p>
            <p class="mt-1 text-xs font-medium leading-relaxed text-slate-700">{{ stage.name }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-300 pt-4">
      <div class="flex items-center gap-2 text-xs text-slate-600">
        <span class="size-2.5 rounded-full bg-emerald-500" />
        Selesai
      </div>
      <div class="flex items-center gap-2 text-xs text-slate-600">
        <span class="size-2.5 rounded-full bg-blue-500" />
        Sedang Berlangsung
      </div>
      <div class="flex items-center gap-2 text-xs text-slate-600">
        <span class="size-2.5 rounded-full bg-gray-300" />
        Belum Dimulai
      </div>
    </div>
  </UCard>

  <UCard v-else>
    <p class="py-6 text-center text-sm text-slate-600">Timeline untuk periode ini belum tersedia.</p>
  </UCard>
</template>
