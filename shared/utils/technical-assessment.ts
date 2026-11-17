/**
 * Penilaian CMSP-02 oleh Asesor Teknis (dipakai frontend & backend).
 *
 * - Setiap unit kompetensi CMSP-02 dinilai K (Kompeten) / BK (Belum Kompeten).
 * - Di akhir, asesor mengisi satu catatan umum dan memilih rekomendasi
 *   "Asesmen dapat dilanjutkan" / "Asesmen tidak dapat dilanjutkan".
 *   Rekomendasi inilah yang menentukan peserta lanjut ke Asesor Kepublikan;
 *   K/BK per unit tidak dihitung otomatis.
 */

export const TECHNICAL_ASSESSMENT_STAGE = 'ASSESSOR_ASSESSMENT'

export const UNIT_RESULTS = ['K', 'BK'] as const
export type UnitResult = (typeof UNIT_RESULTS)[number]

export const UNIT_RESULT_LABELS: Record<UnitResult, string> = {
  K: 'Kompeten',
  BK: 'Belum Kompeten',
}

export const TECHNICAL_RECOMMENDATIONS = ['CONTINUE', 'NOT_CONTINUE'] as const
export type TechnicalRecommendation = (typeof TECHNICAL_RECOMMENDATIONS)[number]

export const TECHNICAL_RECOMMENDATION_LABELS: Record<TechnicalRecommendation, string> = {
  CONTINUE: 'Asesmen dapat dilanjutkan',
  NOT_CONTINUE: 'Asesmen tidak dapat dilanjutkan',
}

/** NOT_STARTED = belum ada data penilaian (tidak disimpan di sheet). */
export const TECHNICAL_ASSESSMENT_STATUSES = ['NOT_STARTED', 'DRAFT', 'SUBMITTED'] as const
export type TechnicalAssessmentStatus = (typeof TECHNICAL_ASSESSMENT_STATUSES)[number]

export const TECHNICAL_ASSESSMENT_STATUS_LABELS: Record<TechnicalAssessmentStatus, string> = {
  NOT_STARTED: 'Belum Dinilai',
  DRAFT: 'Draf',
  SUBMITTED: 'Selesai',
}

export const TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH = 3000

export function isUnitResult(value: unknown): value is UnitResult {
  return typeof value === 'string' && (UNIT_RESULTS as readonly string[]).includes(value)
}

export function isTechnicalRecommendation(value: unknown): value is TechnicalRecommendation {
  return typeof value === 'string' && (TECHNICAL_RECOMMENDATIONS as readonly string[]).includes(value)
}
