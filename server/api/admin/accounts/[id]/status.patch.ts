
import { getAuthenticatedUser } from '../../../../services/auth.service'
import { updateUserStatus } from '../../../../repositories/user.repository'
import { revokeAllUserSessions } from '../../../../repositories/session.repository'

const SESSION_COOKIE_NAME = 'cmsp_session'

type StatusBody = {
  account_status?: unknown
}

export default defineEventHandler(async (event) => {
  // Validasi origin untuk permintaan berbasis cookie.
  const origin = getRequestHeader(event, 'origin')
  const host = getRequestHeader(event, 'host')

  if (!origin || !host) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak dapat diverifikasi.',
    })
  }

  let originHost = ''

  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak valid.',
    })
  }

  if (originHost !== host) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak diizinkan.',
    })
  }

  const sessionToken = getCookie(event, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const currentUser = await getAuthenticatedUser(sessionToken)

  if (currentUser.role !== 'SUPER_ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak memiliki akses untuk mengubah status akun.',
    })
  }

  const userId = getRouterParam(event, 'id')?.trim()

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID akun wajib diisi.',
    })
  }

  if (userId.toUpperCase() === currentUser.user_id.toUpperCase()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Anda tidak dapat mengubah status akun sendiri.',
    })
  }

  const body = await readBody<StatusBody>(event)
  const accountStatus = body?.account_status

  if (accountStatus !== 'ACTIVE' && accountStatus !== 'DISABLED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status hanya boleh ACTIVE atau DISABLED.',
    })
  }

  const updatedUser = await updateUserStatus(
    userId,
    accountStatus,
  )

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
