
import {
  appendAuthSheetValues,
  getAuthSheetValues,
  updateAuthSheetRow,
} from '../utils/google-auth-sheets'

export type ActivationToken = {
  token_id: string
  user_id: string
  token_hash: string
  expires_at: string
  used_at: string
  created_at: string
  created_by: string
}

const SHEET_NAME = 'activation_tokens'

function rowToActivationToken(
  row: string[],
): ActivationToken {
  return {
    token_id: row[0] ?? '',
    user_id: row[1] ?? '',
    token_hash: row[2] ?? '',
    expires_at: row[3] ?? '',
    used_at: row[4] ?? '',
    created_at: row[5] ?? '',
    created_by: row[6] ?? '',
  }
}

function generateNextTokenId(
  rows: string[][],
): string {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const match = (row[0] ?? '').match(
      /^ACT-(\d+)$/,
    )

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `ACT-${String(maxNumber + 1).padStart(6, '0')}`
}

export async function createActivationToken(
  input: {
    user_id: string
    token_hash: string
    expires_at: string
    created_by: string
  },
): Promise<ActivationToken> {
  const userId = input.user_id.trim()
  const tokenHash = input.token_hash.trim()
  const expiresAt = input.expires_at.trim()
  const createdBy = input.created_by.trim()

  if (!userId || !tokenHash || !expiresAt || !createdBy) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data token aktivasi belum lengkap.',
    })
  }

  if (Number.isNaN(Date.parse(expiresAt))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Waktu kedaluwarsa token tidak valid.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)
  const now = new Date().toISOString()

  const token: ActivationToken = {
    token_id: generateNextTokenId(rows),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used_at: '',
    created_at: now,
    created_by: createdBy,
  }

  await appendAuthSheetValues(SHEET_NAME, [
    token.token_id,
    token.user_id,
    token.token_hash,
    token.expires_at,
    token.used_at,
    token.created_at,
    token.created_by,
  ])

  return token
}

export async function findActivationTokenByHash(
  tokenHash: string,
): Promise<ActivationToken | null> {
  const normalizedHash = tokenHash.trim()

  if (!normalizedHash) {
    return null
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) => (row[2] ?? '') === normalizedHash,
  )

  if (rowIndex === -1) {
    return null
  }

  const row = rows[rowIndex + 1]

  if (!row) {
    return null
  }

  return rowToActivationToken(row)
}

export async function markActivationTokenAsUsed(
  tokenId: string,
): Promise<void> {
  const normalizedTokenId = tokenId.trim()

  if (!normalizedTokenId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID token aktivasi tidak valid.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) => (row[0] ?? '') === normalizedTokenId,
  )

  if (rowIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Token aktivasi tidak ditemukan.',
    })
  }

  const rowNumber = rowIndex + 2
  const row = rows[rowIndex + 1]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data token aktivasi tidak ditemukan.',
    })
  }

  const token = rowToActivationToken(row)

  if (token.used_at) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Token aktivasi sudah digunakan.',
    })
  }

  await updateAuthSheetRow(
    SHEET_NAME,
    rowNumber,
    [
      token.token_id,
      token.user_id,
      token.token_hash,
      token.expires_at,
      new Date().toISOString(),
      token.created_at,
      token.created_by,
    ],
  )
}
