<script setup lang="ts">
/**
 * Beranda Asesor Teknis: timeline periode aktif yang memiliki peserta yang ditugaskan + tombol penilaian
 * berdasarkan status tahap yang sebenarnya (termasuk dibuka manual) dan progres penilaian (docs/05).
 */
import { manualNote, stageStatusOf, type StaffHomePeriod, type TimelineStage, type TimelineTask } from '~/utils/timeline'

definePageMeta({ layout: 'asesor-teknis' })
useHead({ title: 'Beranda' })

const STAGE = 'ASSESSOR_ASSESSMENT'

function tasksFor(period: StaffHomePeriod, stage: TimelineStage | undefined): TimelineTask[] {
  const to = `/asesor-teknis/assessments/${encodeURIComponent(period.period_id)}`
  const insight = period.insight?.kind === 'TECHNICAL_ASSESSOR' ? period.insight : null

  // Ringkasan gagal dimuat: tombol mengikuti jadwal saja.
  if (!insight) {
    if (stage?.code !== STAGE) return []
    return [{ tone: 'action', description: 'Nilai peserta yang ditugaskan kepada Anda.', label: 'Nilai', icon: 'i-lucide-pencil', to }]
  }

  const { counts } = insight

  if (!insight.stage.open) {
    const ended = stageStatusOf(period.stages, STAGE) === 'completed'
    return [{
      tone: 'info',
      title: 'Tidak ada tindakan Asesor Teknis pada tahap ini',
      description: ended
        ? `Tahap penilaian telah berakhir. ${counts.submitted} dari ${counts.total} peserta sudah Anda nilai.`
        : `${counts.total} peserta ditugaskan kepada Anda. Penilaian dibuka pada tahap Penilaian oleh Asesor.`,
      ...(ended && counts.submitted > 0 ? { label: 'Lihat', icon: 'i-lucide-eye', to } : {}),
    }]
  }

  const note = manualNote(insight.stage.manual)
  const tasks: TimelineTask[] = []

  if (counts.todo > 0) {
    tasks.push({
      tone: 'action',
      title: `${counts.todo} peserta belum selesai Anda nilai`,
      description: `${counts.draft > 0 ? `${counts.draft} di antaranya masih draf.` : 'Selesaikan sebelum tahapan berakhir.'}${note}`,
      label: 'Nilai',
      icon: 'i-lucide-pencil',
      to,
    })
  }

  if (counts.waiting > 0) {
    tasks.push({
      tone: 'waiting',
      title: `${counts.waiting} peserta menunggu tes tertulis`,
      description: 'Dapat dinilai setelah tes tertulisnya terkirim.',
      ...(counts.todo === 0 ? { label: 'Lihat', icon: 'i-lucide-eye', to } : {}),
    })
  }

  if (tasks.length === 0) {
    tasks.push(counts.total === 0
      ? { tone: 'info', title: 'Belum ada peserta', description: 'Belum ada peserta yang ditugaskan kepada Anda.' }
      : counts.submitted === 0
        ? { tone: 'info', title: 'Tidak ada peserta yang perlu dinilai', description: `${counts.withdrawn} peserta tidak melanjutkan (tidak mengerjakan tes tertulis).`, label: 'Lihat', icon: 'i-lucide-eye', to }
        : {
          tone: 'done',
          title: 'Semua peserta sudah dinilai',
          description: `${counts.submitted} penilaian sudah terkirim.${counts.withdrawn > 0 ? ` ${counts.withdrawn} peserta tidak melanjutkan.` : ''}`,
          label: 'Lihat',
          icon: 'i-lucide-eye',
          to,
        })
  }

  return tasks
}
</script>

<template>
  <TimelineStaffHome
    :tasks-for="tasksFor"
    empty-description="Timeline akan tampil di sini bila Anda ditugaskan menilai peserta pada periode sertifikasi yang aktif."
  />
</template>
