import {
  appendAuthSheetRowsWithIds,
  getAuthSheetValues,
} from '../utils/google-sheets'

/**
 * Sheet `audit_logs` (spreadsheet Auth) — riwayat tindakan akun (docs/04, docs/08 K-30).
 * Urutan kolom HARUS sama dengan header di Google Sheets. Baris hanya ditambah, tidak pernah diubah.
 */
const SHEET_NAME = 'audit_logs'

const COLUMNS = [
  'audit_id', 'event_time', 'actor_user_id', 'action', 'target_type',
  'target_id', 'result', 'ip_address', 'request_id', 'details',
] as const

export type AuditLog = { [K in (typeof COLUMNS)[number]]: string }

const toRow = (log: AuditLog) => COLUMNS.map((column) => log[column] ?? '')
const toLog = (row: string[]) =>
  Object.fromEntries(COLUMNS.map((column, index) => [column, row[index] ?? ''])) as AuditLog

export async function appendAuditLog(log: Omit<AuditLog, 'audit_id'>): Promise<AuditLog> {
  const [created] = await appendAuthSheetRowsWithIds(
    SHEET_NAME,
    'AUD',
    1,
    (id): AuditLog => ({ ...log, audit_id: id }),
    toRow,
  )

  return created!
}

/** Riwayat untuk satu akun (sebagai target), terbaru di atas. Sheet belum ada → kosong. */
export async function findAuditLogsByTarget(targetId: string, limit = 50): Promise<AuditLog[]> {
  let rows: string[][]

  try {
    rows = await getAuthSheetValues(SHEET_NAME)
  } catch {
    return []
  }

  const normalized = targetId.trim().toUpperCase()

  return rows
    .slice(1)
    .filter((row) => row[0] && (row[5] ?? '').trim().toUpperCase() === normalized)
    .map(toLog)
    .sort((a, b) => b.event_time.localeCompare(a.event_time))
    .slice(0, limit)
}
