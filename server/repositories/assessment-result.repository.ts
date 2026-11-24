import { createTable, type SheetRecord } from './sheet-table'

/**
 * Sheet `assessment_results` — hasil Penetapan Hasil Asesmen per peserta (lihat docs/04).
 * Nilai ketiga penilaian disalin saat ditetapkan (potret), sehingga hasil tidak berubah
 * walau data penilaian berubah kemudian. Pembatalan tidak menghapus baris (status CANCELLED).
 */
const COLUMNS = [
  'result_id', 'application_id', 'period_id', 'round', 'outcome',
  'written_score', 'written_passing_grade', 'technical_recommendation', 'public_recommendation',
  'reasons', 'status', 'decided_by', 'decided_at', 'cancelled_by', 'cancelled_at',
] as const

export type AssessmentResult = SheetRecord<typeof COLUMNS>

export const assessmentResults = createTable('assessment_results', COLUMNS, 'HAS')

/** Hasil yang masih berlaku (belum dibatalkan) pada satu periode. */
export async function findActiveResultsByPeriod(periodId: string): Promise<AssessmentResult[]> {
  return assessmentResults.findWhere((item) => item.period_id === periodId && item.status === 'ACTIVE')
}

export async function findActiveResultByApplication(applicationId: string): Promise<AssessmentResult | null> {
  const [found] = await assessmentResults.findWhere((item) => item.application_id === applicationId && item.status === 'ACTIVE')
  return found ?? null
}
