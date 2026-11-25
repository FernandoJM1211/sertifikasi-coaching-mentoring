<script setup lang="ts">
/**
 * Beranda Verifikator: timeline periode aktif + tombol sesuai tugas Verifikator, berdasarkan tahap
 * berlangsung, status tahap yang sebenarnya (termasuk dibuka manual), dan jumlah pekerjaan (docs/05).
 */
import { manualNote, type StaffHomePeriod, type TimelineStage, type TimelineTask } from '~/utils/timeline'

definePageMeta({ layout: 'verifikator' })
useHead({ title: 'Beranda' })

const STAGE_INFO: Record<string, string> = {
  SELF_ASSESSMENT: 'Peserta sedang mengisi self assessment. Verifikasi dapat dilakukan pada tahap Verifikasi Self Assessment.',
  EVALUATION: 'Peserta sedang mengerjakan tes tertulis pilihan ganda.',
  ASSESSOR_ASSESSMENT: 'Asesor sedang menilai peserta.',
  ASSESSMENT_VERIFICATION: 'Hasil asesmen peserta sedang ditetapkan oleh Super Admin.',
  ANNOUNCEMENT: 'Hasil sertifikasi sedang diumumkan.',
}

/** Tahap sesudah verifikasi SA yang masih bergantung pada penugasan asesor. */
const NEEDS_ASSESSOR = ['EVALUATION', 'ASSESSOR_ASSESSMENT']

function tasksFor(period: StaffHomePeriod, stage: TimelineStage | undefined): TimelineTask[] {
  const id = encodeURIComponent(period.period_id)
  const applicantsTo = `/verifikator/participant-verifications/${id}`
  const selfAssessmentTo = `/verifikator/self-assessments/${id}`
  const assignmentTo = `/verifikator/assessor-assignments/${id}`
  const insight = period.insight?.kind === 'VERIFIKATOR' ? period.insight : null
  const tasks: TimelineTask[] = []

  /* 1. Verifikasi pendaftar: tugas tahap 1–2, tunggakan bila masih ada sesudahnya. */
  const pending = insight?.applicants.pending ?? 0
  if (stage && stage.order <= 2) {
    tasks.push(!insight || pending > 0
      ? {
          tone: 'action',
          title: insight ? `${pending} pendaftar menunggu verifikasi` : '',
          description: 'Periksa berkas, lalu terima atau tolak pengajuan.',
          label: 'Verifikasi',
          icon: 'i-lucide-pencil',
          to: applicantsTo,
        }
      : {
          tone: 'done',
          title: 'Semua pendaftar sudah diverifikasi',
          description: 'Tidak ada pendaftar yang menunggu.',
          label: 'Lihat',
          icon: 'i-lucide-eye',
          to: applicantsTo,
        })
  } else if (pending > 0) {
    tasks.push({
      tone: 'pending',
      title: `Masih ada ${pending} pendaftar yang belum diverifikasi`,
      description: 'Terima atau tolak agar pendaftar mengetahui hasilnya.',
      label: 'Verifikasi',
      icon: 'i-lucide-pencil',
      to: applicantsTo,
    })
  }

  /* 2. Verifikasi self assessment & penugasan asesor: selama tahap Verifikasi SA dibuka. */
  if (insight?.selfAssessment.stage.open) {
    const sa = insight.selfAssessment
    const note = manualNote(sa.stage.manual)

    tasks.push(sa.submitted > 0
      ? {
          tone: 'action',
          title: `${sa.submitted} self assessment menunggu verifikasi`,
          description: `Verifikasi atau minta perbaikan.${sa.revision > 0 ? ` ${sa.revision} sedang diperbaiki peserta.` : ''}${note}`,
          label: 'Verifikasi',
          icon: 'i-lucide-pencil',
          to: selfAssessmentTo,
        }
      : {
          tone: 'done',
          title: 'Tidak ada self assessment yang menunggu verifikasi',
          description: `${sa.verified} terverifikasi, ${sa.revision} diperbaiki, ${sa.notSubmitted} belum dikirim.${note}`,
          label: 'Lihat',
          icon: 'i-lucide-eye',
          to: selfAssessmentTo,
        })

    const assignment = insight.assignment
    if (assignment.canEdit) {
      if (assignment.unassigned > 0) {
        tasks.push({
          tone: 'action',
          title: `${assignment.unassigned} peserta belum lengkap asesornya`,
          description: 'Tugaskan Asesor Teknis dan Asesor Kepublikan.',
          label: 'Tugaskan',
          icon: 'i-lucide-pencil',
          to: assignmentTo,
        })
      } else if (assignment.assigned > 0) {
        tasks.push({
          tone: 'done',
          title: 'Semua peserta terverifikasi sudah ditugaskan ke asesor',
          description: `${assignment.assigned} peserta sudah memiliki asesor lengkap.`,
          label: 'Lihat',
          icon: 'i-lucide-eye',
          to: assignmentTo,
        })
      } else {
        tasks.push({
          tone: 'info',
          title: 'Penugasan asesor belum dapat dilakukan',
          description: 'Dapat dilakukan setelah ada self assessment terverifikasi.',
        })
      }
    }
  } else if (!insight && stage?.code === 'SELF_ASSESSMENT_VERIFICATION') {
    // Ringkasan gagal dimuat: tombol mengikuti jadwal saja.
    tasks.push(
      { tone: 'action', description: 'Verifikasi atau minta perbaikan.', label: 'Verifikasi', icon: 'i-lucide-pencil', to: selfAssessmentTo },
      { tone: 'action', description: 'Tugaskan Asesor Teknis dan Asesor Kepublikan.', label: 'Tugaskan', icon: 'i-lucide-pencil', to: assignmentTo },
    )
  } else if (insight && stage && NEEDS_ASSESSOR.includes(stage.code) && insight.assignment.unassigned > 0) {
    // Penugasan sudah terkunci, tetapi masih ada peserta tanpa asesor lengkap.
    tasks.push({
      tone: 'pending',
      title: `${insight.assignment.unassigned} peserta terverifikasi belum lengkap asesornya`,
      description: 'Peserta tersebut belum dapat dinilai. Penugasan sudah dikunci; hubungi Super Admin.',
      label: 'Lihat',
      icon: 'i-lucide-eye',
      to: assignmentTo,
    })
  }


  /* Hasil Akhir: setelah hasil diumumkan (tahap Pengumuman, K-26). */
  const finalResult = insight?.finalResult
  if (finalResult) {
    const finalTo = `/verifikator/final-results/${id}`
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

  /* 3. Tidak ada pekerjaan: informasi tahap berlangsung. */
  if (tasks.length === 0 && stage) {
    tasks.push({
      tone: 'info',
      title: 'Tidak ada tindakan Verifikator pada tahap ini',
      description: STAGE_INFO[stage.code] || 'Silakan pantau perkembangan proses sertifikasi melalui timeline ini.',
    })
  }

  return tasks
}
</script>

<template>
  <TimelineStaffHome :tasks-for="tasksFor" />
</template>
