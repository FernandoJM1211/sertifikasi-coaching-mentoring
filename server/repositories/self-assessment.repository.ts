import {
  appendSheetValues,
  getSheetValues,
  replaceChildRows,
  updateSheetRow,
} from '../utils/google-sheets'

/**
 * Akses sheet self assessment (CMSP-01 & CMSP-02).
 * Urutan kolom di setiap daftar HARUS sama dengan header di Google Sheets
 * (lihat docs/04-database.md).
 */

const CMSP01_SUBMISSION_COLUMNS = [
  'cmsp01_id', 'application_id', 'period_id', 'status',
  'full_name', 'nip', 'rank_name', 'rank_group', 'gender', 'birth_place',
  'birth_date', 'phone_number', 'email', 'institution_name', 'work_unit',
  'position_name', 'latest_education', 'education_qualification',
  'domicile_address', 'declaration_accepted', 'declaration_accepted_at',
  'submitted_at', 'revision_count', 'created_at', 'updated_at',
] as const

const CMSP01_TRAINING_COLUMNS = [
  'cmsp01_training_id', 'cmsp01_id', 'sort_order', 'training_name',
  'organizer', 'year', 'jp', 'created_at', 'updated_at',
] as const

const CMSP01_PRACTICE_COLUMNS = [
  'cmsp01_practice_id', 'cmsp01_id', 'sort_order', 'year', 'coachee_mentee',
  'topic', 'duration_minutes', 'created_at', 'updated_at',
] as const

const CMSP01_DOCUMENT_COLUMNS = [
  'cmsp01_document_id', 'cmsp01_id', 'document_type', 'file_id', 'source',
  'created_at', 'updated_at',
] as const

const CMSP02_SUBMISSION_COLUMNS = [
  'cmsp02_id', 'application_id', 'period_id', 'status', 'submitted_at',
  'revision_count', 'created_at', 'updated_at',
] as const

const CMSP02_EVIDENCE_COLUMNS = [
  'cmsp02_evidence_id', 'cmsp02_id', 'unit_code', 'sort_order',
  'evidence_name', 'evidence_type', 'file_id', 'url', 'description',
  'created_at', 'updated_at',
] as const

const REVIEW_COLUMNS = [
  'review_id', 'application_id', 'decision', 'cmsp01_note', 'cmsp02_note',
  'reviewed_by', 'reviewed_at', 'created_at',
] as const

type Record_<C extends readonly string[]> = { [K in C[number]]: string }

export type Cmsp01Submission = Record_<typeof CMSP01_SUBMISSION_COLUMNS>
export type Cmsp01Training = Record_<typeof CMSP01_TRAINING_COLUMNS>
export type Cmsp01Practice = Record_<typeof CMSP01_PRACTICE_COLUMNS>
export type Cmsp01Document = Record_<typeof CMSP01_DOCUMENT_COLUMNS>
export type Cmsp02Submission = Record_<typeof CMSP02_SUBMISSION_COLUMNS>
export type Cmsp02Evidence = Record_<typeof CMSP02_EVIDENCE_COLUMNS>
export type SelfAssessmentReview = Record_<typeof REVIEW_COLUMNS>

function rowToRecord<C extends readonly string[]>(
  columns: C,
  row: string[],
): Record_<C> {
  return Object.fromEntries(
    columns.map((column, index) => [column, row[index] ?? '']),
  ) as Record_<C>
}

function recordToRow<C extends readonly string[]>(
  columns: C,
  record: Partial<Record_<C>>,
): string[] {
  return columns.map(
    (column) => (record as Record<string, string | undefined>)[column] ?? '',
  )
}

async function findRecords<C extends readonly string[]>(
  sheetName: string,
  columns: C,
  matchColumn: C[number],
  matchValue: string,
): Promise<Record_<C>[]> {
  const rows = await getSheetValues(sheetName)
  const columnIndex = columns.indexOf(matchColumn)

  return rows
    .slice(1)
    .filter((row) => row[0] && row[columnIndex] === matchValue)
    .map((row) => rowToRecord(columns, row))
}

/**
 * Menyimpan satu baris per pengajuan: perbarui jika sudah ada
 * (berdasarkan application_id), atau tambahkan baris baru.
 */
async function upsertByApplicationId<C extends readonly string[]>(
  sheetName: string,
  columns: C,
  idPrefix: string,
  record: Partial<Record_<C>> & { application_id: string },
): Promise<Record_<C>> {
  const rows = await getSheetValues(sheetName)
  const applicationColumn = columns.indexOf('application_id')
  const rowIndex = rows.findIndex(
    (row, index) => index > 0 && row[0] && row[applicationColumn] === record.application_id,
  )

  if (rowIndex !== -1) {
    const idColumn = columns[0] as string
    const existing = rowToRecord(columns, rows[rowIndex] ?? []) as Record<string, string>
    const merged = { ...existing, ...record, [idColumn]: existing[idColumn] ?? '' }

    await updateSheetRow(sheetName, rowIndex + 1, recordToRow(columns, merged))
    return merged as Record_<C>
  }

  let maxNumber = 0
  const idPattern = new RegExp(`^${idPrefix}-(\\d+)$`)

  for (const row of rows.slice(1)) {
    const match = (row[0] ?? '').match(idPattern)
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]))
  }

  const created = {
    ...record,
    [columns[0] as string]: `${idPrefix}-${String(maxNumber + 1).padStart(6, '0')}`,
  }

  await appendSheetValues(sheetName, recordToRow(columns, created))
  return rowToRecord(columns, recordToRow(columns, created))
}

async function replaceChildren<C extends readonly string[]>(
  sheetName: string,
  columns: C,
  idPrefix: string,
  parentColumn: C[number],
  parentId: string,
  items: Partial<Record_<C>>[],
) {
  await replaceChildRows({
    sheetName,
    parentColumnIndex: columns.indexOf(parentColumn),
    parentId,
    count: items.length,
    columnCount: columns.length,
    idPrefix,
    buildRow: (index, id) =>
      recordToRow(columns, {
        ...items[index],
        [columns[0] as string]: id,
        [parentColumn as string]: parentId,
      } as Partial<Record_<C>>),
  })
}

const bySortOrder = (a: { sort_order: string }, b: { sort_order: string }) =>
  Number(a.sort_order) - Number(b.sort_order)

/* ---------------------------- CMSP-01 ---------------------------- */

export async function findCmsp01ByApplicationId(applicationId: string) {
  const [record] = await findRecords(
    'cmsp01_submissions', CMSP01_SUBMISSION_COLUMNS, 'application_id', applicationId,
  )
  return record ?? null
}

export function upsertCmsp01(record: Partial<Cmsp01Submission> & { application_id: string }) {
  return upsertByApplicationId('cmsp01_submissions', CMSP01_SUBMISSION_COLUMNS, 'C01', record)
}

export async function findCmsp01Trainings(cmsp01Id: string) {
  return (await findRecords('cmsp01_trainings', CMSP01_TRAINING_COLUMNS, 'cmsp01_id', cmsp01Id))
    .sort(bySortOrder)
}

export function replaceCmsp01Trainings(cmsp01Id: string, items: Partial<Cmsp01Training>[]) {
  return replaceChildren('cmsp01_trainings', CMSP01_TRAINING_COLUMNS, 'C01T', 'cmsp01_id', cmsp01Id, items)
}

export async function findCmsp01Practices(cmsp01Id: string) {
  return (await findRecords('cmsp01_practices', CMSP01_PRACTICE_COLUMNS, 'cmsp01_id', cmsp01Id))
    .sort(bySortOrder)
}

export function replaceCmsp01Practices(cmsp01Id: string, items: Partial<Cmsp01Practice>[]) {
  return replaceChildren('cmsp01_practices', CMSP01_PRACTICE_COLUMNS, 'C01P', 'cmsp01_id', cmsp01Id, items)
}

export function findCmsp01Documents(cmsp01Id: string) {
  return findRecords('cmsp01_documents', CMSP01_DOCUMENT_COLUMNS, 'cmsp01_id', cmsp01Id)
}

export function replaceCmsp01Documents(cmsp01Id: string, items: Partial<Cmsp01Document>[]) {
  return replaceChildren('cmsp01_documents', CMSP01_DOCUMENT_COLUMNS, 'C01D', 'cmsp01_id', cmsp01Id, items)
}

/* ---------------------------- CMSP-02 ---------------------------- */

export async function findCmsp02ByApplicationId(applicationId: string) {
  const [record] = await findRecords(
    'cmsp02_submissions', CMSP02_SUBMISSION_COLUMNS, 'application_id', applicationId,
  )
  return record ?? null
}

export function upsertCmsp02(record: Partial<Cmsp02Submission> & { application_id: string }) {
  return upsertByApplicationId('cmsp02_submissions', CMSP02_SUBMISSION_COLUMNS, 'C02', record)
}

export async function findCmsp02Evidences(cmsp02Id: string) {
  return (await findRecords('cmsp02_evidences', CMSP02_EVIDENCE_COLUMNS, 'cmsp02_id', cmsp02Id))
    .sort(bySortOrder)
}

export function replaceCmsp02Evidences(cmsp02Id: string, items: Partial<Cmsp02Evidence>[]) {
  return replaceChildren('cmsp02_evidences', CMSP02_EVIDENCE_COLUMNS, 'C02E', 'cmsp02_id', cmsp02Id, items)
}

/* ---------------------------- Review ---------------------------- */

/** Keputusan Verifikator terakhir untuk pengajuan ini (jika ada). */
export async function findLatestSelfAssessmentReview(applicationId: string) {
  const reviews = await findRecords(
    'self_assessment_reviews', REVIEW_COLUMNS, 'application_id', applicationId,
  )

  return reviews.sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))[0] ?? null
}

/** Semua review untuk pengajuan ini, terbaru lebih dulu. */
export async function findSelfAssessmentReviews(applicationId: string) {
  const reviews = await findRecords(
    'self_assessment_reviews', REVIEW_COLUMNS, 'application_id', applicationId,
  )

  return reviews.sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))
}

export async function createSelfAssessmentReview(
  record: Omit<SelfAssessmentReview, 'review_id'>,
): Promise<SelfAssessmentReview> {
  const rows = await getSheetValues('self_assessment_reviews')
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const match = (row[0] ?? '').match(/^SAR-(\d+)$/)
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]))
  }

  const created: SelfAssessmentReview = {
    ...record,
    review_id: `SAR-${String(maxNumber + 1).padStart(6, '0')}`,
  }

  await appendSheetValues('self_assessment_reviews', recordToRow(REVIEW_COLUMNS, created))
  return created
}

/* ---------------------------- Daftar per periode ---------------------------- */

export function findCmsp01SubmissionsByPeriod(periodId: string) {
  return findRecords('cmsp01_submissions', CMSP01_SUBMISSION_COLUMNS, 'period_id', periodId)
}
