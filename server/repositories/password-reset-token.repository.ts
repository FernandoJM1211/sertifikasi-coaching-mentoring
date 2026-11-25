import {
  appendAuthSheetRowsWithIds,
  getAuthSheetValues,
  updateAuthSheetRow,
} from '../utils/google-sheets'

/**
 * Token atur ulang kata sandi (Lupa Kata Sandi) — khusus akun peserta.
 * Sheet `password_reset_tokens` di spreadsheet Auth (lihat docs/04-database.md).
 * Yang disimpan hanya hash SHA-256; token asli hanya ada di tautan email.
 */
export type PasswordResetToken = {
  reset_token_id: string
  user_id: string
  token_hash: string
  expires_at: string
  used_at: string
  created_at: string
  request_ip: string
}

const SHEET_NAME = 'password_reset_tokens'
const ID_PREFIX = 'RST'

const COLUMNS = [
  'reset_token_id', 'user_id', 'token_hash', 'expires_at', 'used_at', 'created_at', 'request_ip',
] as const

const toRecord = (row: string[]) =>
  Object.fromEntries(COLUMNS.map((column, index) => [column, (row[index] ?? '').trim()])) as PasswordResetToken

const toRow = (record: PasswordResetToken) => COLUMNS.map((column) => record[column] ?? '')

async function readRows(): Promise<string[][]> {
  try {
    return await getAuthSheetValues(SHEET_NAME)
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: `Sheet ${SHEET_NAME} belum tersedia. Hubungi admin.`,
    })
  }
}

export async function createPasswordResetToken(input: {
  user_id: string
  token_hash: string
  expires_at: string
  request_ip: string
}): Promise<PasswordResetToken> {
  await readRows() // pesan jelas bila sheet belum dibuat (dibaca dari cache)

  const token: PasswordResetToken = {
    reset_token_id: '', // ditetapkan saat baris ditulis
    user_id: input.user_id.trim().toUpperCase(),
    token_hash: input.token_hash.trim(),
    expires_at: input.expires_at,
    used_at: '',
    created_at: new Date().toISOString(),
    request_ip: input.request_ip.slice(0, 64),
  }

  const [created] = await appendAuthSheetRowsWithIds(
    SHEET_NAME,
    ID_PREFIX,
    1,
    (id) => ({ ...token, reset_token_id: id }),
    (token) => toRow(token),
  )

  return created!
}

export async function findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | null> {
  const hash = tokenHash.trim()
  if (!hash) return null

  const rows = await readRows()
  const row = rows.slice(1).find((item) => (item[2] ?? '').trim() === hash)

  return row ? toRecord(row) : null
}

/** Menandai semua token aktif milik akun sebagai terpakai/dicabut (`used_at` diisi). */
export async function revokeActiveResetTokensForUser(userId: string): Promise<void> {
  const normalizedUserId = userId.trim().toUpperCase()
  if (!normalizedUserId) return

  const rows = await readRows()
  const now = new Date().toISOString()

  for (let index = 1; index < rows.length; index++) {
    const token = toRecord(rows[index] ?? [])

    if (token.user_id.toUpperCase() !== normalizedUserId || token.used_at) continue

    await updateAuthSheetRow(SHEET_NAME, index + 1, toRow({ ...token, used_at: now }))
  }
}
