import { createError } from 'h3'
import {
  appendSheetRows,
  getSheetValues,
  updateSheetRows,
} from '../utils/google-sheets'

/**
 * Sheet penugasan asesor (lihat docs/04-database.md). Urutan kolom HARUS sama
 * dengan header di Google Sheets.
 *
 * - `period_assessors`     : asesor yang bertugas pada sebuah periode.
 * - `assessor_assignments` : asesor yang ditugaskan untuk setiap pengajuan (satu baris per pengajuan).
 */

type Record_<C extends readonly string[]> = { [K in C[number]]: string }

function rowToRecord<C extends readonly string[]>(columns: C, row: string[]): Record_<C> {
  return Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ''])) as Record_<C>
}

function recordToRow<C extends readonly string[]>(columns: C, record: Record_<C>): string[] {
  return columns.map((column) => (record as Record<string, string>)[column] ?? '')
}

function nextIdGenerator(rows: string[][], prefix: string) {
  let maxNumber = 0
  const pattern = new RegExp(`^${prefix}-(\\d+)$`)

  for (const row of rows.slice(1)) {
    const match = (row[0] ?? '').match(pattern)
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]))
  }

  return () => `${prefix}-${String(++maxNumber).padStart(6, '0')}`
}

/* ------------------------------------------------------------------ */
/* Asesor per periode                                                  */
/* ------------------------------------------------------------------ */

const PERIOD_ASSESSOR_SHEET = 'period_assessors'

const PERIOD_ASSESSOR_COLUMNS = [
  'period_assessor_id', 'period_id', 'user_id', 'assessor_role', 'status',
  'added_by', 'added_at', 'updated_by', 'updated_at',
] as const

export type PeriodAssessor = Record_<typeof PERIOD_ASSESSOR_COLUMNS>
export type AssessorRole = 'TECHNICAL_ASSESSOR' | 'PUBLIC_ASSESSOR'

/** Asesor berstatus ACTIVE pada periode ini. */
export async function findActivePeriodAssessors(periodId: string): Promise<PeriodAssessor[]> {
  const rows = await getSheetValues(PERIOD_ASSESSOR_SHEET)

  return rows
    .slice(1)
    .filter((row) => row[0] && row[1] === periodId)
    .map((row) => rowToRecord(PERIOD_ASSESSOR_COLUMNS, row))
    .filter((item) => item.status === 'ACTIVE')
}

/**
 * Menetapkan daftar asesor (satu role) untuk periode: yang dipilih menjadi
 * ACTIVE, yang tidak dipilih menjadi REMOVED. Baris tidak dihapus agar riwayat tetap ada.
 */
export async function setPeriodAssessors(input: {
  periodId: string
  role: AssessorRole
  userIds: string[]
  actorId: string
}) {
  const rows = await getSheetValues(PERIOD_ASSESSOR_SHEET)
  const now = new Date().toISOString()
  const selected = new Set(input.userIds)
  const nextId = nextIdGenerator(rows, 'PAS')

  const updates: { rowNumber: number, values: string[] }[] = []
  const existingUserIds = new Set<string>()

  rows.forEach((row, index) => {
    if (index === 0 || !row[0] || row[1] !== input.periodId || row[3] !== input.role) return

    const record = rowToRecord(PERIOD_ASSESSOR_COLUMNS, row)
    existingUserIds.add(record.user_id)

    const nextStatus = selected.has(record.user_id) ? 'ACTIVE' : 'REMOVED'
    if (record.status === nextStatus) return

    updates.push({
      rowNumber: index + 1,
      values: recordToRow(PERIOD_ASSESSOR_COLUMNS, {
        ...record,
        status: nextStatus,
        updated_by: input.actorId,
        updated_at: now,
      }),
    })
  })

  const appends = input.userIds
    .filter((userId) => !existingUserIds.has(userId))
    .map((userId) =>
      recordToRow(PERIOD_ASSESSOR_COLUMNS, {
        period_assessor_id: nextId(),
        period_id: input.periodId,
        user_id: userId,
        assessor_role: input.role,
        status: 'ACTIVE',
        added_by: input.actorId,
        added_at: now,
        updated_by: input.actorId,
        updated_at: now,
      }),
    )

  await updateSheetRows(PERIOD_ASSESSOR_SHEET, updates)
  await appendSheetRows(PERIOD_ASSESSOR_SHEET, appends)
}

/* ------------------------------------------------------------------ */
/* Penugasan per pengajuan                                             */
/* ------------------------------------------------------------------ */

const ASSIGNMENT_SHEET = 'assessor_assignments'

const ASSIGNMENT_COLUMNS = [
  'assignment_id', 'application_id', 'period_id',
  'technical_assessor_id', 'public_assessor_id',
  'assigned_by', 'assigned_at', 'updated_by', 'updated_at',
] as const

export type AssessorAssignment = Record_<typeof ASSIGNMENT_COLUMNS>

export async function findAssessorAssignmentsByPeriod(periodId: string) {
  const rows = await getSheetValues(ASSIGNMENT_SHEET)

  return rows
    .slice(1)
    .filter((row) => row[0] && row[2] === periodId)
    .map((row) => rowToRecord(ASSIGNMENT_COLUMNS, row))
}

/** Penugasan milik seorang Asesor Teknis (lintas periode). */
export async function findAssignmentsByTechnicalAssessor(userId: string) {
  const rows = await getSheetValues(ASSIGNMENT_SHEET)

  return rows
    .slice(1)
    .map((row) => rowToRecord(ASSIGNMENT_COLUMNS, row))
    .filter((item) => item.assignment_id && item.technical_assessor_id === userId)
}

export type AssignmentChange = {
  application_id: string
  assessor_role: AssessorRole
  old_assessor_id: string
  new_assessor_id: string
}

/**
 * Menyimpan penugasan untuk banyak pengajuan sekaligus (satu kali baca,
 * satu batch update, satu append). Nilai asesor `undefined` = tidak diubah.
 * Mengembalikan daftar perubahan asesor (untuk dicatat di riwayat).
 */
export async function upsertAssessorAssignments(input: {
  periodId: string
  applicationIds: string[]
  technicalAssessorId?: string
  publicAssessorId?: string
  actorId: string
}) {
  const rows = await getSheetValues(ASSIGNMENT_SHEET)
  const now = new Date().toISOString()
  const nextId = nextIdGenerator(rows, 'ASG')

  const rowIndexByApplication = new Map<string, number>()
  rows.forEach((row, index) => {
    if (index > 0 && row[0] && row[1]) rowIndexByApplication.set(row[1], index)
  })

  const updates: { rowNumber: number, values: string[] }[] = []
  const appends: string[][] = []
  const changes: AssignmentChange[] = []

  const collectChanges = (applicationId: string, oldTechnical: string, oldPublic: string) => {
    if (input.technicalAssessorId !== undefined && input.technicalAssessorId !== oldTechnical) {
      changes.push({ application_id: applicationId, assessor_role: 'TECHNICAL_ASSESSOR', old_assessor_id: oldTechnical, new_assessor_id: input.technicalAssessorId })
    }
    if (input.publicAssessorId !== undefined && input.publicAssessorId !== oldPublic) {
      changes.push({ application_id: applicationId, assessor_role: 'PUBLIC_ASSESSOR', old_assessor_id: oldPublic, new_assessor_id: input.publicAssessorId })
    }
  }

  for (const applicationId of input.applicationIds) {
    const rowIndex = rowIndexByApplication.get(applicationId)

    if (rowIndex !== undefined) {
      const record = rowToRecord(ASSIGNMENT_COLUMNS, rows[rowIndex] ?? [])
      collectChanges(applicationId, record.technical_assessor_id, record.public_assessor_id)

      updates.push({
        rowNumber: rowIndex + 1,
        values: recordToRow(ASSIGNMENT_COLUMNS, {
          ...record,
          technical_assessor_id: input.technicalAssessorId ?? record.technical_assessor_id,
          public_assessor_id: input.publicAssessorId ?? record.public_assessor_id,
          updated_by: input.actorId,
          updated_at: now,
        }),
      })
      continue
    }

    collectChanges(applicationId, '', '')
    appends.push(recordToRow(ASSIGNMENT_COLUMNS, {
      assignment_id: nextId(),
      application_id: applicationId,
      period_id: input.periodId,
      technical_assessor_id: input.technicalAssessorId ?? '',
      public_assessor_id: input.publicAssessorId ?? '',
      assigned_by: input.actorId,
      assigned_at: now,
      updated_by: input.actorId,
      updated_at: now,
    }))
  }

  await updateSheetRows(ASSIGNMENT_SHEET, updates)
  await appendSheetRows(ASSIGNMENT_SHEET, appends)

  return changes
}

/* ------------------------------------------------------------------ */
/* Riwayat perubahan penugasan                                          */
/* ------------------------------------------------------------------ */

const LOG_SHEET = 'assessor_assignment_logs'

const LOG_COLUMNS = [
  'log_id', 'application_id', 'period_id', 'assessor_role',
  'old_assessor_id', 'new_assessor_id', 'reason', 'changed_by', 'changed_at',
] as const

/**
 * Dipanggil sebelum menyimpan penugasan: memastikan sheet riwayat tersedia
 * agar penugasan tidak pernah tersimpan tanpa catatan riwayatnya.
 */
export async function assertAssignmentLogSheetReady() {
  try {
    await getSheetValues(LOG_SHEET)
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: `Sheet ${LOG_SHEET} belum tersedia. Hubungi Super Admin.`,
    })
  }
}

/** Mencatat setiap penugasan baru maupun pergantian asesor (audit trail). */
export async function appendAssignmentLogs(input: {
  periodId: string
  changes: AssignmentChange[]
  reason: string
  actorId: string
}) {
  if (input.changes.length === 0) return

  const rows = await getSheetValues(LOG_SHEET)
  const nextId = nextIdGenerator(rows, 'AAL')
  const now = new Date().toISOString()

  await appendSheetRows(LOG_SHEET, input.changes.map((change) =>
    recordToRow(LOG_COLUMNS, {
      log_id: nextId(),
      application_id: change.application_id,
      period_id: input.periodId,
      assessor_role: change.assessor_role,
      old_assessor_id: change.old_assessor_id,
      new_assessor_id: change.new_assessor_id,
      reason: change.old_assessor_id ? input.reason : '',
      changed_by: input.actorId,
      changed_at: now,
    }),
  ))
}
