import { changePesertaLoginEmail } from '../../../../services/peserta-account-provisioning.service'

/** Super Admin mengganti email login akun peserta (docs/08 K-28). */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])
  const userId = requireRouterParam(event, 'id', 'ID akun')

  await requireManageableAccount(userId)

  const body = await readBody<{ email?: unknown }>(event)
  const email = typeof body?.email === 'string' ? body.email : ''

  if (!email.trim() || email.length > 254) {
    throw createError({ statusCode: 400, statusMessage: 'Email baru wajib diisi (maksimal 254 karakter).' })
  }

  const result = await changePesertaLoginEmail(userId, email)

  return {
    success: true,
    email: result.email,
    message: result.activationSent
      ? `Email akun diubah. Tautan aktivasi baru dikirim ke ${result.email}.`
      : `Email akun diubah. Peserta masuk dengan ${result.email}.`,
  }
})
