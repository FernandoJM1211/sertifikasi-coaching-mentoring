<script setup lang="ts">
/** Beranda Verifikator: timeline periode aktif + tombol sesuai tugas Verifikator pada tahap berlangsung. */
import type { TimelineStage, TimelineTask } from '~/utils/timeline'

definePageMeta({ layout: 'verifikator' })
useHead({ title: 'Beranda' })

const STAGE_INFO: Record<string, string> = {
  SELF_ASSESSMENT: 'Peserta sedang mengisi self assessment. Verifikasi dapat dilakukan pada tahap Verifikasi Self Assessment.',
  EVALUATION: 'Peserta sedang mengerjakan evaluasi pilihan ganda.',
  ASSESSOR_ASSESSMENT: 'Asesor sedang menilai peserta.',
  ASSESSMENT_VERIFICATION: 'Hasil penilaian asesor sedang diverifikasi.',
  ANNOUNCEMENT: 'Hasil sertifikasi sedang diumumkan.',
}

function tasksFor(periodId: string, stage: TimelineStage): TimelineTask[] {
  const id = encodeURIComponent(periodId)

  switch (stage.code) {
    case 'REGISTRATION':
    case 'DOCUMENT_VERIFICATION':
      return [{
        tone: 'action',
        description: 'Periksa berkas pendaftar, lalu terima atau tolak pengajuan. Akun peserta dibuat untuk pengajuan yang diterima.',
        label: 'Verifikasi Pendaftar',
        icon: 'i-lucide-user-check',
        to: `/verifikator/periods/${id}`,
      }]

    case 'SELF_ASSESSMENT_VERIFICATION':
      return [
        {
          tone: 'action',
          description: 'Periksa CMSP-01 dan CMSP-02 peserta, lalu verifikasi atau minta perbaikan.',
          label: 'Verifikasi Self Assessment',
          icon: 'i-lucide-clipboard-check',
          to: `/verifikator/self-assessments/${id}`,
        },
        {
          tone: 'action',
          description: 'Tugaskan Asesor Teknis dan Asesor Kepublikan untuk peserta yang self assessment-nya terverifikasi.',
          label: 'Penugasan Asesor',
          icon: 'i-lucide-user-cog',
          to: `/verifikator/assessor-assignments/${id}`,
        },
      ]

    default:
      return [{
        tone: 'info',
        title: 'Tidak ada tindakan Verifikator pada tahap ini',
        description: STAGE_INFO[stage.code] || 'Silakan pantau perkembangan proses sertifikasi melalui timeline ini.',
      }]
  }
}
</script>

<template>
  <TimelineStaffHome :tasks-for="tasksFor" />
</template>
