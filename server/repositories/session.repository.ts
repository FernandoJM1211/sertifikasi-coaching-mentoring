
import {
  appendAuthSheetValues,
  getAuthSheetValues,
  updateAuthSheetRow,
} from '../utils/google-auth-sheets'

export type AuthSession = {
  session_id: string
  user_id: string
  session_token_hash: string
  expires_at: string
  revoked_at: string
  created_at: string
  last_seen_at: string
  ip_address: string
}

const SHEET_NAME = 'sessions'

function rowToSession(row: string[]): AuthSession {
  return {
    session_id: row[0] ?? '',
    user_id: row[1] ?? '',
    session_token_hash: row[2] ?? '',
    expires_at: row[3] ?? '',
    revoked_at: row[4] ?? '',
    created_at: row[5] ?? '',
    last_seen_at: row[6] ?? '',
    ip_address: row[7] ?? '',
  }
}

function generateNextSessionId(
  rows: string[][],
): string {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const match = (row[0] ?? '').match(/^SES-(\d+)$/)

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `SES-${String(maxNumber + 1).padStart(6, '0')}`
}

export async function createSession(input: {
  user_id: string
  session_token_hash: string
  expires_at: string
  ip_address?: string
}): Promise<AuthSession> {
  const userId = input.user_id.trim()
  const tokenHash = input.session_token_hash.trim()
  const expiresAt = input.expires_at.trim()
  const ipAddress = input.ip_address?.trim() ?? ''

  if (!userId || !tokenHash || !expiresAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data sesi belum lengkap.',
    })
  }

  const parsedExpiry = Date.parse(expiresAt)

  if (
    Number.isNaN(parsedExpiry) ||
    parsedExpiry <= Date.now()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Waktu kedaluwarsa sesi harus di masa depan.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const duplicateHash = rows.slice(1).some(
    (row) => (row[2] ?? '') === tokenHash,
  )

  if (duplicateHash) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Token sesi sudah terdaftar.',
    })
  }

  const now = new Date().toISOString()

  const session: AuthSession = {
    session_id: generateNextSessionId(rows),
    user_id: userId,
    session_token_hash: tokenHash,
    expires_at: expiresAt,
    revoked_at: '',
    created_at: now,
    last_seen_at: now,
    ip_address: ipAddress,
  }

  await appendAuthSheetValues(SHEET_NAME, [
    session.session_id,
    session.user_id,
    session.session_token_hash,
    session.expires_at,
    session.revoked_at,
    session.created_at,
    session.last_seen_at,
    session.ip_address,
  ])

  return session
}

export async function findSessionByTokenHash(
  tokenHash: string,
): Promise<AuthSession | null> {
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

  return row ? rowToSession(row) : null
}

export async function revokeSession(
  sessionId: string,
): Promise<void> {
  const normalizedId = sessionId.trim()

  if (!normalizedId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID sesi tidak valid.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) => (row[0] ?? '') === normalizedId,
  )

  if (rowIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Sesi tidak ditemukan.',
    })
  }

  const rowNumber = rowIndex + 2
  const row = rows[rowIndex + 1]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data sesi tidak ditemukan.',
    })
  }

  const session = rowToSession(row)

  if (session.revoked_at) {
    return
  }

  await updateAuthSheetRow(SHEET_NAME, rowNumber, [
    session.session_id,
    session.user_id,
    session.session_token_hash,
    session.expires_at,
    new Date().toISOString(),
    session.created_at,
    session.last_seen_at,
    session.ip_address,
  ])
}

export async function updateSessionLastSeen(
  sessionId: string,
): Promise<void> {
  const normalizedId = sessionId.trim()

  if (!normalizedId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID sesi tidak valid.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) => (row[0] ?? '') === normalizedId,
  )

  if (rowIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Sesi tidak ditemukan.',
    })
  }

  const rowNumber = rowIndex + 2
  const row = rows[rowIndex + 1]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data sesi tidak ditemukan.',
    })
  }

  const session = rowToSession(row)

  if (
    session.revoked_at ||
    Date.parse(session.expires_at) <= Date.now()
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi sudah tidak berlaku.',
    })
  }

  await updateAuthSheetRow(SHEET_NAME, rowNumber, [
    session.session_id,
    session.user_id,
    session.session_token_hash,
    session.expires_at,
    session.revoked_at,
    session.created_at,
    new Date().toISOString(),
    session.ip_address,
  ])
}


export async function revokeAllUserSessions(
  userId: string,
): Promise<void> {
  const normalizedUserId = userId.trim()

  if (!normalizedUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID pengguna tidak valid.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const sessions = rows.slice(1)

  for (let index = 0; index < sessions.length; index++) {
    const row = sessions[index]

    if (!row || (row[1] ?? '') !== normalizedUserId) {
      continue
    }

    const session = rowToSession(row)

    if (session.revoked_at) {
      continue
    }

    const rowNumber = index + 2

    await updateAuthSheetRow(SHEET_NAME, rowNumber, [
      session.session_id,
      session.user_id,
      session.session_token_hash,
      session.expires_at,
      new Date().toISOString(),
      session.created_at,
      session.last_seen_at,
      session.ip_address,
    ])
  }
}
