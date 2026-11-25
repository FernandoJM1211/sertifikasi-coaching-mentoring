import { createTable, type SheetRecord } from './sheet-table'

/**
 * Sheet `remedial_submissions` — tugas remedial peserta (link Google Drive), satu baris per pengajuan
 * (lihat docs/04). Peserta dapat mengubah link selama belum diputuskan; keputusan panitia final.
 */
const COLUMNS = [
  'remedial_id', 'application_id', 'period_id', 'result_id',
  'drive_link', 'note', 'status', 'submitted_at', 'updated_at',
  'decided_by', 'decided_at',
] as const

export type RemedialSubmission = SheetRecord<typeof COLUMNS>

export const remedialSubmissions = createTable('remedial_submissions', COLUMNS, 'RMD')

export async function findRemedialsByPeriod(periodId: string): Promise<RemedialSubmission[]> {
  return remedialSubmissions.findWhere((item) => item.period_id === periodId)
}

export async function findRemedialByApplication(applicationId: string): Promise<RemedialSubmission | null> {
  const [found] = await remedialSubmissions.findWhere((item) => item.application_id === applicationId)
  return found ?? null
}
