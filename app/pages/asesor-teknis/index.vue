<script setup lang="ts">
/** Beranda Asesor Teknis: timeline periode aktif yang memiliki peserta yang ditugaskan + tombol penilaian. */
import type { TimelineStage, TimelineTask } from '~/utils/timeline'

definePageMeta({ layout: 'asesor-teknis' })
useHead({ title: 'Beranda' })

function tasksFor(periodId: string, stage: TimelineStage): TimelineTask[] {
  if (stage.code === 'ASSESSOR_ASSESSMENT') {
    return [{
      tone: 'action',
      description: 'Nilai CMSP-02 peserta yang ditugaskan kepada Anda (K/BK per unit, catatan, dan rekomendasi) sebelum tahapan ini berakhir.',
      label: 'Nilai CMSP-02 Peserta',
      icon: 'i-lucide-clipboard-pen',
      to: `/asesor-teknis/assessments/${encodeURIComponent(periodId)}`,
    }]
  }

  return [{
    tone: 'info',
    title: 'Tidak ada tindakan Asesor Teknis pada tahap ini',
    description: stage.order < 6
      ? 'Penilaian CMSP-02 dapat dilakukan pada tahap Penilaian oleh Asesor.'
      : 'Tahap penilaian oleh asesor telah berakhir.',
  }]
}
</script>

<template>
  <TimelineStaffHome
    :tasks-for="tasksFor"
    empty-description="Timeline akan tampil di sini bila Anda ditugaskan menilai peserta pada periode sertifikasi yang aktif."
  />
</template>
