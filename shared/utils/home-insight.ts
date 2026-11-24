/**
 * Data ringkas untuk tombol dinamis beranda staf (lihat docs/05 bagian "Tombol Beranda per Role").
 * Dihitung server per periode aktif sesuai role; `stage` = status buka/tutup NYATA (termasuk
 * pembukaan manual Super Admin), berbeda dari progres timeline yang mengikuti jadwal saja.
 */

export type HomeStageAccess = {
  open: boolean
  /** true bila dibuka manual oleh Super Admin (override OPEN). */
  manual: boolean
}

export type TechnicalHomeInsight = {
  kind: 'TECHNICAL_ASSESSOR'
  stage: HomeStageAccess
  counts: {
    total: number
    /** Dapat dinilai sekarang: belum dinilai (sudah tes tertulis) + draf. */
    todo: number
    draft: number
    /** Menunggu peserta menyelesaikan tes tertulis. */
    waiting: number
    submitted: number
    /** Tidak melanjutkan: tidak mengerjakan tes tertulis (K-25). */
    withdrawn: number
  }
}

export type PublicHomeInsight = {
  kind: 'PUBLIC_ASSESSOR'
  stage: HomeStageAccess
  counts: {
    total: number
    todo: number
    draft: number
    /** Menunggu penilaian Asesor Teknis. */
    waiting: number
    /** Tidak dilanjutkan Asesor Teknis (tidak perlu dinilai). */
    stopped: number
    submitted: number
    /** Tidak melanjutkan: tidak mengerjakan tes tertulis (K-25). */
    withdrawn: number
  }
}

export type VerifikatorHomeInsight = {
  kind: 'VERIFIKATOR'
  applicants: { pending: number }
  selfAssessment: {
    stage: HomeStageAccess
    submitted: number
    revision: number
    verified: number
    notSubmitted: number
  }
  assignment: {
    canEdit: boolean
    /** Peserta terverifikasi yang asesornya belum lengkap. */
    unassigned: number
    assigned: number
  }
}

export type SuperAdminHomeInsight = {
  kind: 'SUPER_ADMIN'
  evaluation: {
    stage: HomeStageAccess
    /** Pengaturan tes tertulis periode: belum diterapkan / paket berubah sejak diterapkan / berlaku. */
    applyState: 'NOT_APPLIED' | 'OUTDATED' | 'CURRENT'
    eligible: number
    submitted: number
  }
  /** Hanya diisi saat tahap Penetapan Hasil Asesmen dibuka. */
  result: {
    stage: HomeStageAccess
    decided: boolean
    canDecide: boolean
    total: number
    incomplete: number
    passed: number
    remedial: number
    withdrawn: number
  } | null
}

export type HomeInsight = TechnicalHomeInsight | PublicHomeInsight | VerifikatorHomeInsight | SuperAdminHomeInsight
