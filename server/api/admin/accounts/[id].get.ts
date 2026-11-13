
import { getAuthenticatedUser } from '../../../services/auth.service'
import { findUserById } from '../../../repositories/user.repository'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(async (event) => {
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
      statusMessage: 'Anda tidak memiliki akses ke fitur ini.',
    })
  }

  const userId = getRouterParam(event, 'id')?.trim()

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID akun wajib diisi.',
    })
  }

  const user = await findUserById(userId)

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun tidak ditemukan.',
    })
  }

  // Jangan mengirim password_hash ke frontend.
  return {
    success: true,
    account: {
      user_id: user.user_id,
      person_id: user.person_id,
      full_name: user.full_name,
      username_email: user.username_email,
      role: user.role,
      account_status: user.account_status,
      email_verified_at: user.email_verified_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
    },
  }
})
