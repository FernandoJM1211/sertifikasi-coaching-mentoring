import { updateUserStatus } from '../../../../repositories/user.repository'
import { revokeAllUserSessions } from '../../../../repositories/session.repository'

export default defineEventHandler(async (event) => {
  const currentUser = await requireUser(event, ['SUPER_ADMIN'])
  const userId = requireRouterParam(event, 'id', 'ID akun')

  if (userId.toUpperCase() === currentUser.user_id.toUpperCase()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Anda tidak dapat mengubah status akun sendiri.',
    })
  }

  const body = await readBody<{ account_status?: unknown }>(event)
  const accountStatus = body?.account_status

  if (accountStatus !== 'ACTIVE' && accountStatus !== 'DISABLED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status hanya boleh ACTIVE atau DISABLED.',
    })
  }

  const updatedUser = await updateUserStatus(userId, accountStatus)

  if (accountStatus === 'DISABLED') {
    await revokeAllUserSessions(updatedUser.user_id)
  }

  return {
    success: true,
    message:
      accountStatus === 'DISABLED'
        ? 'Akun berhasil dinonaktifkan.'
        : 'Akun berhasil diaktifkan kembali.',
    account: {
      user_id: updatedUser.user_id,
      full_name: updatedUser.full_name,
      username_email: updatedUser.username_email,
      role: updatedUser.role,
      account_status: updatedUser.account_status,
      updated_at: updatedUser.updated_at,
    },
  }
})
