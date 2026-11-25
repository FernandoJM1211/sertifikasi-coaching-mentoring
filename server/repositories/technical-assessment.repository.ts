import { createError } from 'h3'
import {
  appendSheetRowsWithIds,
  getSheetValues,
  updateSheetRows,
} from '../utils/google-sheets'

/**
 * Sheet `technical_assessments` — penilaian CMSP-02 oleh Asesor Teknis
 * (satu baris per pengajuan). Urutan kolom HARUS sama dengan header di Google Sheets.
 *
 * - `unit_results`  : hasil per unit, format `UK.CMSP.1=K;UK.CMSP.2=BK;...`
 *                     (unit yang belum dinilai tidak dicantumkan).
 * - `recommendation`: `CONTINUE` / `NOT_CONTINUE` (kosong = belum dipilih).
 * - `status`        : `DRAFT` / `SUBMITTED`.
 * - `reopened_*`    : Super Admin terakhir yang membuka kunci penilaian terkirim.
 */

const SHEET = 'technical_assessments'
const ID_PREFIX = 'TAS'

const COLUMNS = [
  'technical_assessment_id', 'application_id', 'period_id', 'assessor_id',
  'unit_results', 'note', 'recommendation', 'status',
  'submitted_at', 'created_at', 'updated_at', 'reopened_by', 'reopened_at',
] as const

export type TechnicalAssessment = { [K in (typeof COLUMNS)[number]]: string }

const toRecord = (row: string[]) =>
  Object.fromEntries(COLUMNS.map((column, index) => [column, row[index] ?? ''])) as TechnicalAssessment

const toRow = (record: TechnicalAssessment) => COLUMNS.map((column) => record[column] ?? '')

async function readRows() {
  try {
    return await getSheetValues(SHEET)
  } catch {
    throw createError({ statusCode: 500, statusMessage: `Sheet ${SHEET} belum tersedia. Hubungi Super Admin.` })
  }
}

function readRecords(rows: string[][]) {
  return rows
    .map((row, index) => ({ rowNumber: index + 1, record: toRecord(row) }))
    .slice(1)
    .filter((item) => item.record.technical_assessment_id)
}

export async function findTechnicalAssessmentsByPeriod(periodId: string) {
  return readRecords(await readRows())
    .map((item) => item.record)
    .filter((item) => item.period_id === periodId)
}

export async function findTechnicalAssessmentByApplicationId(applicationId: string) {
  return readRecords(await readRows()).find((item) => item.record.application_id === applicationId)?.record ?? null
}

/** Membuat atau memperbarui baris penilaian satu pengajuan. */
export async function upsertTechnicalAssessment(
  record: Omit<TechnicalAssessment, 'technical_assessment_id'>,
): Promise<TechnicalAssessment> {
  const rows = await readRows()
  const existing = readRecords(rows).find((item) => item.record.application_id === record.application_id)

  if (existing) {
    const updated = { ...existing.record, ...record, technical_assessment_id: existing.record.technical_assessment_id }
    await updateSheetRows(SHEET, [{ rowNumber: existing.rowNumber, values: toRow(updated) }])
    return updated
  }

  const [created] = await appendSheetRowsWithIds(
    SHEET, ID_PREFIX, 1, (id) => ({ ...record, technical_assessment_id: id }), toRow,
  )
  return created!
}

/** Format kolom `unit_results` ⇄ objek { kodeUnit: 'K' | 'BK' }. */
export function parseUnitResults(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split(';')
      .map((pair) => pair.split('='))
      .filter((parts): parts is [string, string] => parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1])),
  )
}

export function serializeUnitResults(results: Record<string, string>): string {
  return Object.entries(results).map(([code, result]) => `${code}=${result}`).join(';')
}
