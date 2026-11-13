
import {
  loginWithPassword,
} from '../../services/auth.service'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: string
    password?: string
  }>(event)

  if (
    typeof body?.email !== 'string' ||
    typeof body?.password !== 'string'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email dan kata sandi wajib diisi.',
    })
  }

  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const ipAddress =
    forwardedFor?.split(',')[0]?.trim() ||
    getRequestIP(event) ||
    ''

  const result = await loginWithPassword({
    email: body.email,
    password: body.password,
    ipAddress,
  })

  setCookie(event, SESSION_COOKIE_NAME, result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(result.expiresAt),
  })

  return {
    success: true,
    message: 'Login berhasil.',
    user: result.user,
    expiresAt: result.expiresAt,
  }
})
