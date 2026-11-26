import { changeUserPassword } from '../../services/auth.service'

export default defineEventHandler(async (event) => {
  const sessionToken = getSessionToken(event)

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const body = await readBody<{
    currentPassword?: unknown
    newPassword?: unknown
  }>(event)

  if (
    typeof body?.currentPassword !== 'string' ||
    typeof body?.newPassword !== 'string' ||
    body.currentPassword.length > 1024
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data kata sandi tidak valid.',
    })
  }

  const { userId } = await changeUserPassword({
    sessionToken,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  })

  await recordAccountAudit(event, {
    actorUserId: userId,
    action: 'PASSWORD_CHANGE',
    targetUserId: userId,
    details: 'Semua sesi dicabut',
  })

  // Seluruh sesi sudah dicabut oleh service; hapus juga cookie-nya.
  clearSessionCookie(event)

  return {
    success: true,
    message: 'Kata sandi berhasil diubah.',
  }
})
