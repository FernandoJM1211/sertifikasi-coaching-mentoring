import { resetPesertaPassword } from '../../services/password-reset.service'

/** Publik (tanpa login): simpan kata sandi baru memakai token dari tautan email. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: unknown, password?: unknown, confirmPassword?: unknown }>(event)

  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''

  if (!token || token.length > 200 || !password || !confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Token, kata sandi, dan konfirmasi kata sandi wajib diisi.' })
  }

  if (password !== confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Kata sandi dan konfirmasi kata sandi tidak sama.' })
  }

  assertRateLimit(`password-reset-confirm:ip:${getClientIp(event)}`, 20, 15 * 60 * 1000)

  const { userId } = await resetPesertaPassword({ token, password })

  await recordAccountAudit(event, {
    actorUserId: userId,
    action: 'PASSWORD_RESET_BY_EMAIL',
    targetUserId: userId,
    details: 'Semua sesi dicabut',
  })

  return { success: true, message: 'Kata sandi berhasil diatur ulang. Silakan masuk dengan kata sandi baru.' }
})
