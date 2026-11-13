
import {
  changeUserPassword,
} from '../../services/auth.service'

const SESSION_COOKIE_NAME = 'cmsp_session'

type ChangePasswordBody = {
  currentPassword?: string
  newPassword?: string
}

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(
    event,
    SESSION_COOKIE_NAME,
  )

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const body = await readBody<ChangePasswordBody>(event)

  if (
    !body ||
    typeof body.currentPassword !== 'string' ||
    typeof body.newPassword !== 'string'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data kata sandi tidak valid.',
    })
  }

  await changeUserPassword({
    sessionToken,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  })

  return {
    success: true,
    message: 'Kata sandi berhasil diubah.',
  }
})
