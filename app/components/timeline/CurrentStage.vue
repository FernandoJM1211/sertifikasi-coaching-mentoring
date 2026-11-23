<script setup lang="ts">
/**
 * Kartu "Tahapan Saat Ini": nama tahap, tanggal mulai & selesai, lalu panel tombol dinamis
 * sesuai role (dari prop `tasks`). Bila tidak ada tahap berlangsung, menampilkan tahap berikutnya.
 *
 * Contoh: <TimelineCurrentStage :stages="stages" :tasks="tasks" />
 */
import { getActiveStage, getNextStage, type TimelineStage, type TimelineTask } from '~/utils/timeline'

const props = defineProps<{
  stages: TimelineStage[]
  /** Panel tombol/informasi; ditampilkan berurutan. */
  tasks?: TimelineTask[]
}>()

const activeStage = computed(() => getActiveStage(props.stages))
const nextStage = computed(() => getNextStage(props.stages))

const BOX: Record<TimelineTask['tone'], string> = {
  pending: 'border-amber-300 bg-amber-50',
  action: 'border-blue-200 bg-blue-50',
  done: 'border-emerald-200 bg-emerald-50',
  info: 'border-sky-200 bg-sky-50',
}

const ICON: Record<TimelineTask['tone'], { name: string, color: string }> = {
  pending: { name: 'i-lucide-triangle-alert', color: 'text-amber-600' },
  action: { name: 'i-lucide-arrow-right-circle', color: 'text-primary' },
  done: { name: 'i-lucide-circle-check', color: 'text-emerald-600' },
  info: { name: 'i-lucide-info', color: 'text-sky-600' },
}
</script>

<template>
  <UCard>
    <!-- Judul: tahap yang sedang berlangsung, atau keterangan bila tidak ada. -->
    <div v-if="activeStage">
      <p class="text-sm font-semibold text-primary">Tahapan Saat Ini</p>
      <h2 class="mt-1 text-xl font-semibold text-slate-900">{{ activeStage.name }}</h2>
      <div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
        <p>
          Tanggal Mulai:
          <span class="font-semibold text-slate-900">{{ formatDateTimeId(activeStage.startAt) }}</span>
        </p>
        <span class="hidden h-4 border-l border-slate-300 sm:block" />
        <p>
          Tanggal Selesai:
          <span class="font-semibold text-slate-900">{{ formatDateTimeId(activeStage.endAt) }}</span>
        </p>
      </div>
    </div>

    <div v-else class="py-4 text-center">
      <p class="text-sm font-semibold text-primary">Tahapan Saat Ini</p>
      <p class="mt-2 font-medium text-slate-700">Tidak ada tahapan yang sedang berlangsung.</p>
      <p v-if="nextStage" class="mt-1 text-sm text-slate-600">
        Tahap berikutnya: <span class="font-medium text-slate-700">{{ nextStage.name }}</span>,
        mulai {{ formatDateTimeId(nextStage.startAt) }}.
      </p>
    </div>

    <!--
      Tombol dinamis sesuai role & tahap. Tetap ditampilkan walau tidak ada tahap berlangsung
      menurut jadwal, mis. pekerjaan yang dibuka lewat override Super Admin.
    -->
    <div
      v-for="(task, index) in tasks ?? []"
      :key="index"
      class="mt-5 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      :class="BOX[task.tone]"
    >
      <div class="flex min-w-0 items-start gap-3">
        <UIcon :name="ICON[task.tone].name" class="mt-0.5 size-5 shrink-0" :class="ICON[task.tone].color" />
        <div class="min-w-0">
          <p v-if="task.title" class="text-sm font-semibold text-slate-900">{{ task.title }}</p>
          <p class="text-sm leading-6 text-slate-700">{{ task.description }}</p>
        </div>
      </div>
      <UButton
        v-if="task.to && task.label"
        :to="task.to"
        size="lg"
        class="shrink-0 justify-center"
        :color="task.tone === 'pending' ? 'warning' : 'primary'"
        :variant="task.tone === 'done' || task.tone === 'info' ? 'outline' : 'solid'"
        :icon="task.icon"
        trailing-icon="i-lucide-arrow-right"
      >
        {{ task.label }}
      </UButton>
    </div>
  </UCard>
</template>
