<script setup lang="ts">
/**
 * Beranda Super Admin: progres timeline setiap periode aktif + tombol tugas Super Admin
 * (pengaturan tes tertulis & Penetapan Hasil Asesmen) serta pintasan pemantauan tahap lain (docs/05).
 */
import { manualNote, stageStatusOf, type StaffHomePeriod, type TimelineStage, type TimelineTask } from '~/utils/timeline'

definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Beranda' })

/** Pintasan pemantauan untuk tahap yang dikerjakan role lain. */
const MONITOR: Record<string, { description: string, label: string, path: string }> = {
  REGISTRATION: { description: 'Pendaftaran sedang dibuka.', label: 'Pantau', path: 'participant-verifications' },
  DOCUMENT_VERIFICATION: { description: 'Berkas pendaftar sedang diverifikasi oleh Verifikator.', label: 'Pantau', path: 'participant-verifications' },
  SELF_ASSESSMENT: { description: 'Peserta sedang mengisi self assessment.', label: 'Pantau', path: 'self-assessments' },
  SELF_ASSESSMENT_VERIFICATION: { description: 'Verifikator sedang memverifikasi dan menugaskan asesor.', label: 'Pantau', path: 'self-assessments' },
  ASSESSOR_ASSESSMENT: { description: 'Asesor sedang menilai peserta.', label: 'Pantau', path: 'technical-assessments' },
}

function tasksFor(period: StaffHomePeriod, stage: TimelineStage | undefined): TimelineTask[] {
  const id = encodeURIComponent(period.period_id)
  const evaluationTo = `/super-admin/evaluations/plans/${id}`
  const resultTo = `/super-admin/assessment-results/${id}`
  const insight = period.insight?.kind === 'SUPER_ADMIN' ? period.insight : null
  const tasks: TimelineTask[] = []

  if (insight) {
    /* 1. Pengaturan tes tertulis: sampai tahap Tes Tertulis berakhir. */
    const evaluation = insight.evaluation
    const evaluationRelevant = evaluation.stage.open || stageStatusOf(period.stages, 'EVALUATION') !== 'completed'

    if (evaluationRelevant && evaluation.applyState !== 'CURRENT') {
      const notApplied = evaluation.applyState === 'NOT_APPLIED'
      tasks.push({
        // Tahap sudah dibuka tetapi belum diatur → peserta tidak dapat mengerjakan (mendesak).
        tone: evaluation.stage.open ? 'pending' : 'action',
        title: notApplied ? 'Tes tertulis belum diatur untuk periode ini' : 'Paket soal berubah sejak pengaturan diterapkan',
        description: notApplied
          ? 'Pilih paket soal, durasi, dan passing grade, lalu terapkan.'
          : 'Terapkan ulang agar peserta yang belum mulai memakai soal terbaru.',
        label: 'Atur',
        icon: 'i-lucide-pencil',
        to: evaluationTo,
      })
    }

    if (evaluation.stage.open && evaluation.applyState !== 'NOT_APPLIED') {
      tasks.push({
        tone: 'info',
        title: `${evaluation.submitted} dari ${evaluation.eligible} peserta sudah mengerjakan tes tertulis`,
        description: `Pantau pengerjaan dan nilai peserta.${manualNote(evaluation.stage.manual)}`,
        label: 'Pantau',
        icon: 'i-lucide-eye',
        to: evaluationTo,
      })
    }

    /* 2. Penetapan Hasil Asesmen: selama tahapnya dibuka. */
    const result = insight.result
    if (result) {
      const note = manualNote(result.stage.manual)
      if (result.decided) {
        tasks.push({
          tone: 'done',
          title: 'Hasil asesmen sudah ditetapkan',
          description: `${result.passed} Lulus, ${result.remedial} Remedial${result.withdrawn ? `, ${result.withdrawn} Tidak Melanjutkan` : ''}.${note}`,
          label: 'Lihat',
          icon: 'i-lucide-eye',
          to: resultTo,
        })
      } else if (result.canDecide) {
        tasks.push({
          tone: 'action',
          title: `Hasil ${result.total} peserta siap ditetapkan`,
          description: `${result.passed} Lulus, ${result.remedial} Remedial${result.withdrawn ? `, ${result.withdrawn} Tidak Melanjutkan` : ''}.${note}`,
          label: 'Tetapkan',
          icon: 'i-lucide-gavel',
          to: resultTo,
        })
      } else if (result.incomplete > 0) {
        tasks.push({
          tone: 'waiting',
          title: `${result.incomplete} dari ${result.total} peserta belum lengkap penilaiannya`,
          description: `Menunggu tes tertulis dan penilaian kedua asesor lengkap.${note}`,
          label: 'Lihat',
          icon: 'i-lucide-eye',
          to: resultTo,
        })
      } else {
        tasks.push({ tone: 'info', title: 'Belum ada peserta', description: 'Belum ada peserta yang dapat ditetapkan.' })
      }
    }
  }


  /* Hasil Akhir: setelah hasil diumumkan (tahap Pengumuman, K-26). */
  const finalResult = insight?.finalResult
  if (finalResult) {
    const finalTo = `/super-admin/final-results/${id}`
    tasks.push(finalResult.remedialSubmitted > 0
      ? {
          tone: 'action',
          title: `${finalResult.remedialSubmitted} tugas remedial menunggu tinjauan`,
          description: 'Periksa tugas, lalu nyatakan lulus atau tidak lulus.',
          label: 'Tinjau',
          icon: 'i-lucide-pencil',
          to: finalTo,
        }
      : {
          tone: finalResult.stage.open ? 'info' : 'done',
          title: 'Hasil akhir sudah diumumkan',
          description: `${finalResult.passed} Lulus${finalResult.remedialPending ? `, ${finalResult.remedialPending} belum mengirim remedial` : ''}${finalResult.failed ? `, ${finalResult.failed} Tidak Lulus` : ''}.`,
          label: 'Lihat',
          icon: 'i-lucide-eye',
          to: finalTo,
        })
  }

  /* 3. Tidak ada tugas Super Admin: pintasan pemantauan tahap berlangsung. */
  if (tasks.length === 0 && stage) {
    const monitor = MONITOR[stage.code]
    tasks.push({
      tone: 'info',
      title: 'Tidak ada tindakan Super Admin pada tahap ini',
      description: monitor?.description || 'Silakan pantau perkembangan proses sertifikasi melalui timeline ini.',
      ...(monitor ? { label: monitor.label, icon: 'i-lucide-eye', to: `/super-admin/${monitor.path}/${id}` } : {}),
    })
  }

  return tasks
}
</script>

<template>
  <TimelineStaffHome :tasks-for="tasksFor" />
</template>
