import { PASSWORD_RESET_REQUEST_MESSAGE, requestPesertaPasswordReset } from '../../services/password-reset.service'

/** Publik (tanpa login): minta tautan atur ulang kata sandi peserta. Respons selalu sama. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown }>(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Masukkan alamat email yang valid.' })
  }

  const ip = getClientIp(event)
  assertRateLimit(`password-reset:ip:${ip}`, 10, 15 * 60 * 1000)
  // Batasi per email agar tidak dipakai membanjiri kotak masuk seseorang.
  assertRateLimit(`password-reset:email:${email}`, 3, 60 * 60 * 1000)

  await requestPesertaPasswordReset(email, ip)

  return { success: true, message: PASSWORD_RESET_REQUEST_MESSAGE }
})
