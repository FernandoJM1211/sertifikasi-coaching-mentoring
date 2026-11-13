
import { activateAccount } from '../../services/activation.service'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    token?: string
    password?: string
    confirmPassword?: string
  }>(event)

  if (
    typeof body?.token !== 'string' ||
    typeof body?.password !== 'string' ||
    typeof body?.confirmPassword !== 'string'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token dan data kata sandi wajib diisi.',
    })
  }

  return await activateAccount({
    token: body.token,
    password: body.password,
    confirmPassword: body.confirmPassword,
  })
})
