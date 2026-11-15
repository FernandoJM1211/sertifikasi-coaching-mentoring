
import {
  createSession,
  findSessionByTokenHash,
  revokeAllUserSessions,
  updateSessionLastSeen,
} from '../repositories/session.repository'
import {
  findUserByEmail,
  findUserById,
  updateUserLastLogin,
  updateUserPassword,
  type User,
} from '../repositories/user.repository'
import {
  generateAuthToken,
  hashAuthToken,
} from '../utils/auth-token'
import {
  hashPassword,
  verifyPassword,
  validateNewPassword,
} from '../utils/password'

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000

// Kolom last_seen_at cukup diperbarui berkala agar tidak ada
// penulisan ke Google Sheets pada setiap request.
const SESSION_LAST_SEEN_UPDATE_INTERVAL_MS = 5 * 60 * 1000


export type AuthenticatedUser = {
  user_id: string
  full_name: string
  username_email: string
  role: User['role']
  account_status: User['account_status']
  person_id: string
}

function toAuthenticatedUser(
  user: User,
): AuthenticatedUser {
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    username_email: user.username_email,
    role: user.role,
    account_status: user.account_status,
    person_id: user.person_id,
  }
}

export async function loginWithPassword(input: {
  email: string
  password: string
  ipAddress?: string
}): Promise<{
  user: AuthenticatedUser
  sessionToken: string
  expiresAt: string
}> {
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email dan kata sandi wajib diisi.',
    })
  }

  const user = await findUserByEmail(email)

  const passwordMatches = await verifyPassword(
    password,
    user?.password_hash,
  )

  if (!user || !passwordMatches) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Email atau kata sandi tidak sesuai.',
    })
  }

  if (user.account_status !== 'ACTIVE') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun belum aktif atau tidak dapat digunakan.',
    })
  }

  const sessionToken = generateAuthToken()
  const sessionTokenHash = hashAuthToken(sessionToken)
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_MS,
  ).toISOString()

  await createSession({
    user_id: user.user_id,
    session_token_hash: sessionTokenHash,
    expires_at: expiresAt,
    ip_address: input.ipAddress,
  })

  try {
    await updateUserLastLogin(user.user_id)
  } catch (error) {
    // Kegagalan mencatat waktu login tidak boleh menggagalkan login.
    console.error('Gagal memperbarui last_login_at:', error)
  }

  return {
    user: toAuthenticatedUser(user),
    sessionToken,
    expiresAt,
  }
}

export async function getAuthenticatedUser(
  sessionToken: string,
): Promise<AuthenticatedUser> {
  const token = sessionToken.trim()

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi login tidak ditemukan.',
    })
  }

  const tokenHash = hashAuthToken(token)
  const session = await findSessionByTokenHash(tokenHash)

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi login tidak valid.',
    })
  }

  if (session.revoked_at) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi login sudah dicabut.',
    })
  }

  const expiresAt = Date.parse(session.expires_at)

  if (
    Number.isNaN(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi login sudah kedaluwarsa.',
    })
  }

  const user = await findUserById(session.user_id)

  if (!user || user.account_status !== 'ACTIVE') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun tidak aktif atau tidak tersedia.',
    })
  }

  const lastSeenAt = Date.parse(session.last_seen_at)

  if (
    Number.isNaN(lastSeenAt) ||
    Date.now() - lastSeenAt > SESSION_LAST_SEEN_UPDATE_INTERVAL_MS
  ) {
    await updateSessionLastSeen(session.session_id)
  }

  return toAuthenticatedUser(user)
}


export async function changeUserPassword(input: {
  sessionToken: string
  currentPassword: string
  newPassword: string
}): Promise<{ success: true }> {
  const sessionToken = input.sessionToken.trim()
  const currentPassword = input.currentPassword
  const newPassword = input.newPassword

  if (!sessionToken || !currentPassword || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Semua kolom kata sandi wajib diisi.',
    })
  }

  validateNewPassword(newPassword)

  if (newPassword === currentPassword) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Kata sandi baru harus berbeda dari kata sandi lama.',
    })
  }

  // Pastikan sesi pengguna masih valid.
  const authenticatedUser =
    await getAuthenticatedUser(sessionToken)

  // Ambil hash kata sandi akun dari repository.
  const user = await findUserById(
    authenticatedUser.user_id,
  )

  if (!user || user.account_status !== 'ACTIVE') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun tidak aktif atau tidak tersedia.',
    })
  }

  // Verifikasi kata sandi lama.
  const passwordMatches = await verifyPassword(
    currentPassword,
    user.password_hash,
  )

  if (!passwordMatches) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kata sandi saat ini tidak sesuai.',
    })
  }

  // Hash kata sandi baru sebelum menyimpannya.
  const newPasswordHash = await hashPassword(newPassword)

  await updateUserPassword(
    user.user_id,
    newPasswordHash,
  )
  await revokeAllUserSessions(user.user_id)
  return { success: true }
}
