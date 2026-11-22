/**
 * Penilaian CMSP-03 oleh Asesor Kepublikan (dipakai frontend & backend).
 *
 * Mekanisme sama dengan penilaian CMSP-02 Asesor Teknis: K/BK per unit, satu catatan umum,
 * rekomendasi, simpan draf / kirim (terkunci), buka kunci oleh Super Admin.
 * Hasil K/BK, rekomendasi, dan batas catatan memakai konstanta di `technical-assessment.ts`.
 *
 * Penilaian baru dapat diisi setelah Asesor Teknis MENGIRIM penilaian dengan rekomendasi
 * "Asesmen dapat dilanjutkan".
 */

import type { TechnicalAssessmentStatus } from './technical-assessment'

export { TECHNICAL_ASSESSMENT_STAGE as PUBLIC_ASSESSMENT_STAGE } from './technical-assessment'

/**
 * Status di daftar peserta Asesor Kepublikan:
 * - `WAITING`  : penilaian Asesor Teknis belum dikirim.
 * - `STOPPED`  : Asesor Teknis merekomendasikan asesmen tidak dapat dilanjutkan.
 * - selebihnya sama dengan status penilaian Asesor Teknis.
 */
export type PublicAssessmentStatus = TechnicalAssessmentStatus | 'WAITING' | 'STOPPED'

export const PUBLIC_ASSESSMENT_STATUS_LABELS: Record<PublicAssessmentStatus, string> = {
  WAITING: 'Menunggu Asesor Teknis',
  STOPPED: 'Tidak Dilanjutkan Asesor Teknis',
  NOT_STARTED: 'Belum Dinilai',
  DRAFT: 'Draf',
  SUBMITTED: 'Selesai',
}

/** Status hasil Asesor Teknis yang menjadi syarat penilaian CMSP-03. */
export type TechnicalGate = 'PENDING' | 'CONTINUE' | 'NOT_CONTINUE'

export const TECHNICAL_GATE_MESSAGES: Record<Exclude<TechnicalGate, 'CONTINUE'>, string> = {
  PENDING: 'Penilaian CMSP-03 dapat diisi setelah Asesor Teknis mengirim penilaian CMSP-02.',
  NOT_CONTINUE: 'Asesor Teknis merekomendasikan asesmen peserta ini tidak dapat dilanjutkan.',
}
