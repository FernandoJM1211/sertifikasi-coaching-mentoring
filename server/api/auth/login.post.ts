import { loginWithPassword } from '../../services/auth.service'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_LIMIT_PER_EMAIL = 5
const LOGIN_LIMIT_PER_IP = 30

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: unknown
    password?: unknown
  }>(event)

  if (
    typeof body?.email !== 'string' ||
    typeof body?.password !== 'string' ||
    body.email.length > 254 ||
    body.password.length > 1024
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email dan kata sandi wajib diisi.',
    })
  }

  const email = body.email.trim().toLowerCase()
  const ipAddress = getClientIp(event)
  const emailKey = `login:email:${email}`

  // Batasi percobaan login per akun dan per IP untuk mencegah brute force.
  assertRateLimit(
    emailKey,
    LOGIN_LIMIT_PER_EMAIL,
    LOGIN_WINDOW_MS,
    'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
  )
  assertRateLimit(
    `login:ip:${ipAddress}`,
    LOGIN_LIMIT_PER_IP,
    LOGIN_WINDOW_MS,
    'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
  )

  const result = await loginWithPassword({
    email,
    password: body.password,
    ipAddress,
  })

  resetRateLimit(emailKey)
  setSessionCookie(event, result.sessionToken, result.expiresAt)

  return {
    success: true,
    message: 'Login berhasil.',
    user: result.user,
    expiresAt: result.expiresAt,
  }
})
