import { updateUserPassword } from '../../../../repositories/user.repository'
import { revokeAllUserSessions } from '../../../../repositories/session.repository'

export default defineEventHandler(async (event) => {
  const currentUser = await requireUser(event, ['SUPER_ADMIN'])
  const userId = requireRouterParam(event, 'id', 'ID akun')

  if (userId.toUpperCase() === currentUser.user_id.toUpperCase()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Gunakan fitur Ganti Kata Sandi untuk akun sendiri.',
    })
  }

  await requireManageableAccount(userId)

  const body = await readBody<{ new_password?: unknown }>(event)
  const newPassword =
    typeof body?.new_password === 'string' ? body.new_password : ''

  validateNewPassword(newPassword)

  const updatedUser = await updateUserPassword(
    userId,
    await hashPassword(newPassword),
  )

  // Paksa akun target login ulang dengan kata sandi baru.
  await revokeAllUserSessions(updatedUser.user_id)

  await recordAccountAudit(event, {
    actorUserId: currentUser.user_id,
    action: 'ACCOUNT_PASSWORD_RESET_BY_ADMIN',
    targetUserId: updatedUser.user_id,
    details: 'Semua sesi dicabut',
  })

  return {
    success: true,
    message: 'Kata sandi akun berhasil diatur ulang.',
  }
})
