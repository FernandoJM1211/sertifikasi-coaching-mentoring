import { activatePesertaAccount } from '../services/account-activation.service'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    token?: unknown
    password?: unknown
    confirmPassword?: unknown
  }>(event)

  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const confirmPassword =
    typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''

  if (!token || !password || !confirmPassword) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Token, kata sandi, dan konfirmasi kata sandi wajib diisi.',
    })
  }

  if (password !== confirmPassword) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Kata sandi dan konfirmasi kata sandi tidak sama.',
    })
  }

  assertRateLimit(
    `activation:ip:${getClientIp(event)}`,
    20,
    15 * 60 * 1000,
  )

  const result = await activatePesertaAccount({ token, password })

  await recordAccountAudit(event, {
    actorUserId: result.userId,
    action: 'ACCOUNT_ACTIVATE',
    targetUserId: result.userId,
  })

  // ID akun tidak perlu dikirim ke halaman publik.
  return { success: true, email: result.email }
})
