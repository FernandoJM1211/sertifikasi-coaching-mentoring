/**
 * Penetapan Hasil Asesmen (tahap 7, kode `ASSESSMENT_VERIFICATION`) — lihat docs/08 K-21.
 * Hasil ditentukan otomatis dari tiga penilaian; Super Admin hanya menetapkan (tanpa mengubah).
 */

export const ASSESSMENT_RESULT_STAGE = 'ASSESSMENT_VERIFICATION'

/**
 * PASSED = semua penilaian memenuhi; REMEDIAL = sudah menjalani semua tahap tetapi ada yang kurang;
 * WITHDRAWN = tidak mengerjakan tes tertulis sampai tahapnya berakhir — tidak lulus & tidak
 * berhak remedial (K-25).
 */
export const ASSESSMENT_OUTCOMES = ['PASSED', 'REMEDIAL', 'WITHDRAWN'] as const
export type AssessmentOutcome = (typeof ASSESSMENT_OUTCOMES)[number]

export const ASSESSMENT_OUTCOME_LABELS: Record<AssessmentOutcome, string> = {
  PASSED: 'Lulus',
  REMEDIAL: 'Remedial',
  WITHDRAWN: 'Tidak Melanjutkan',
}

/** Alasan peserta diarahkan ke remedial. */
export const REMEDIAL_REASONS = ['WRITTEN_BELOW_PASSING_GRADE', 'TECHNICAL_NOT_CONTINUE', 'PUBLIC_NOT_CONTINUE', 'WRITTEN_NOT_TAKEN'] as const
export type RemedialReason = (typeof REMEDIAL_REASONS)[number]

export const REMEDIAL_REASON_LABELS: Record<RemedialReason, string> = {
  WRITTEN_BELOW_PASSING_GRADE: 'Nilai tes tertulis di bawah passing grade',
  TECHNICAL_NOT_CONTINUE: 'Asesor Teknis: tidak dapat dilanjutkan',
  PUBLIC_NOT_CONTINUE: 'Asesor Kepublikan: tidak dapat dilanjutkan',
  WRITTEN_NOT_TAKEN: 'Tidak mengerjakan tes tertulis sampai tahapnya berakhir',
}
