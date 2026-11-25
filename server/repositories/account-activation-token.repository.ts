
import {
  appendAuthSheetRowsWithIds,
  getAuthSheetValues,
  updateAuthSheetRow,
} from '../utils/google-sheets'

export type AccountActivationToken = {
  activation_token_id: string
  user_id: string
  token_hash: string
  expires_at: string
  used_at: string
  revoked_at: string
  created_at: string
}

export type CreateAccountActivationTokenPayload = {
  user_id: string
  token_hash: string
  expires_at: string
}

const SHEET_NAME = 'activation_tokens'

function rowToToken(row: string[]): AccountActivationToken {
  return {
    activation_token_id: row[0] ?? '',
    user_id: row[1] ?? '',
    token_hash: row[2] ?? '',
    expires_at: row[3] ?? '',
    used_at: row[4] ?? '',
    revoked_at: '',
    created_at: row[5] ?? '',
  }
}

function normalizeTokenRow(
  token: AccountActivationToken,
): string[] {
  return [
    token.activation_token_id,
    token.user_id,
    token.token_hash,
    token.expires_at,
    token.used_at,
    token.created_at,
    'SYSTEM',
  ]
}

export async function findActivationTokenByHash(
  tokenHash: string,
): Promise<AccountActivationToken | null> {
  const normalizedHash = tokenHash.trim()

  if (!normalizedHash) return null

  const rows = await getAuthSheetValues(SHEET_NAME)

  const foundRow = rows.slice(1).find(
    (row) => (row[2] ?? '').trim() === normalizedHash,
  )

  return foundRow ? rowToToken(foundRow) : null
}

export async function createAccountActivationToken(
  payload: CreateAccountActivationTokenPayload,
): Promise<AccountActivationToken> {
  const userId = payload.user_id.trim().toUpperCase()
  const tokenHash = payload.token_hash.trim()
  const expiresAt = payload.expires_at.trim()

  if (!userId || !tokenHash || !expiresAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data token aktivasi belum lengkap.',
    })
  }

  const parsedExpiry = Date.parse(expiresAt)

  if (!Number.isFinite(parsedExpiry) || parsedExpiry <= Date.now()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Waktu kedaluwarsa token tidak valid.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const existingToken = rows.slice(1).find(
    (row) => (row[2] ?? '').trim() === tokenHash,
  )

  if (existingToken) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Token aktivasi sudah terdaftar.',
    })
  }

  const token: AccountActivationToken = {
    activation_token_id: '', // ditetapkan saat baris ditulis
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used_at: '',
    revoked_at: '',
    created_at: new Date().toISOString(),
  }

  const [created] = await appendAuthSheetRowsWithIds(
    SHEET_NAME,
    'ACT',
    1,
    (id) => ({ ...token, activation_token_id: id }),
    (token) => normalizeTokenRow(token),
  )

  return created!
}

export async function revokeActiveTokensForUser(
  userId: string,
): Promise<void> {
  const normalizedUserId = userId.trim().toUpperCase()

  if (!normalizedUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID akun wajib diisi.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)
  const now = new Date().toISOString()

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index]

    if (!row) continue

    const token = rowToToken(row)

    if (
      token.user_id.trim().toUpperCase() !== normalizedUserId ||
      token.used_at
    ) {
      continue
    }

    await updateAuthSheetRow(
      SHEET_NAME,
      index + 1,
      [
        token.activation_token_id,
        token.user_id,
        token.token_hash,
        token.expires_at,
        now,
        token.created_at,
        row[6] ?? 'SYSTEM',
      ],
    )
  }
}

export async function markActivationTokenAsUsed(
  activationTokenId: string,
): Promise<void> {
  const normalizedTokenId = activationTokenId.trim().toUpperCase()

  if (!normalizedTokenId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID token aktivasi wajib diisi.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index]

    if (!row) continue

    const token = rowToToken(row)

    if (
      token.activation_token_id.trim().toUpperCase() !==
      normalizedTokenId
    ) {
      continue
    }

    if (token.used_at) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Token aktivasi sudah digunakan atau dicabut.',
      })
    }

    const expiresAt = Date.parse(token.expires_at)

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw createError({
        statusCode: 410,
        statusMessage: 'Token aktivasi sudah kedaluwarsa.',
      })
    }

    await updateAuthSheetRow(
      SHEET_NAME,
      index + 1,
      [
        token.activation_token_id,
        token.user_id,
        token.token_hash,
        token.expires_at,
        new Date().toISOString(),
        token.created_at,
        row[6] ?? 'SYSTEM',
      ],
    )

    return
  }

  throw createError({
    statusCode: 404,
    statusMessage: 'Token aktivasi tidak ditemukan.',
  })
}
