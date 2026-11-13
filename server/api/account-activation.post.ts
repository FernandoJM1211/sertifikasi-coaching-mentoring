
import { activateParticipantAccount } from '../services/account-activation.service'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    token?: string
    password?: string
    confirmPassword?: string
  }>(event)

  const token = body?.token?.trim() ?? ''
  const password = body?.password ?? ''
  const confirmPassword = body?.confirmPassword ?? ''

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

  return await activateParticipantAccount({
    token,
    password,
  })
})
