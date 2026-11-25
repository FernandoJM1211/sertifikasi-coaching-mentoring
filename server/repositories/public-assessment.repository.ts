import { createError } from 'h3'
import {
  appendSheetRowsWithIds,
  getSheetValues,
  updateSheetRows,
} from '../utils/google-sheets'

/**
 * Sheet `public_assessments` — penilaian CMSP-03 oleh Asesor Kepublikan
 * (satu baris per pengajuan). Urutan kolom HARUS sama dengan header di Google Sheets.
 * Format kolom sama dengan `technical_assessments`:
 *
 * - `unit_results`  : `KEP.1=K;KEP.2=BK;...` (unit yang belum dinilai tidak dicantumkan);
 *                     dibaca/ditulis dengan `parseUnitResults`/`serializeUnitResults`.
 * - `recommendation`: `CONTINUE` / `NOT_CONTINUE` (kosong = belum dipilih).
 * - `status`        : `DRAFT` / `SUBMITTED`.
 * - `reopened_*`    : Super Admin terakhir yang membuka kunci penilaian terkirim.
 */

const SHEET = 'public_assessments'
const ID_PREFIX = 'PAS'

const COLUMNS = [
  'public_assessment_id', 'application_id', 'period_id', 'assessor_id',
  'unit_results', 'note', 'recommendation', 'status',
  'submitted_at', 'created_at', 'updated_at', 'reopened_by', 'reopened_at',
] as const

export type PublicAssessment = { [K in (typeof COLUMNS)[number]]: string }

const toRecord = (row: string[]) =>
  Object.fromEntries(COLUMNS.map((column, index) => [column, row[index] ?? ''])) as PublicAssessment

const toRow = (record: PublicAssessment) => COLUMNS.map((column) => record[column] ?? '')

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
    .filter((item) => item.record.public_assessment_id)
}

export async function findPublicAssessmentsByPeriod(periodId: string) {
  return readRecords(await readRows())
    .map((item) => item.record)
    .filter((item) => item.period_id === periodId)
}

export async function findPublicAssessmentByApplicationId(applicationId: string) {
  return readRecords(await readRows()).find((item) => item.record.application_id === applicationId)?.record ?? null
}

/** Membuat atau memperbarui baris penilaian satu pengajuan. */
export async function upsertPublicAssessment(
  record: Omit<PublicAssessment, 'public_assessment_id'>,
): Promise<PublicAssessment> {
  const rows = await readRows()
  const existing = readRecords(rows).find((item) => item.record.application_id === record.application_id)

  if (existing) {
    const updated = { ...existing.record, ...record, public_assessment_id: existing.record.public_assessment_id }
    await updateSheetRows(SHEET, [{ rowNumber: existing.rowNumber, values: toRow(updated) }])
    return updated
  }

  const [created] = await appendSheetRowsWithIds(
    SHEET, ID_PREFIX, 1, (id) => ({ ...record, public_assessment_id: id }), toRow,
  )
  return created!
}
