
import {
  getAuthenticatedUser,
} from '../../../services/auth.service'
import {
  findAllUsers,
} from '../../../repositories/user.repository'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(async (event) => {
  // 1. Pastikan pengguna memiliki sesi login.
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

  // 2. Validasi sesi dan status akun melalui service autentikasi.
  const currentUser = await getAuthenticatedUser(sessionToken)

  // 3. Hanya Super Admin yang boleh melihat daftar akun.
  if (currentUser.role !== 'SUPER_ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak memiliki akses ke fitur ini.',
    })
  }

  // 4. Ambil seluruh akun dari sheet users.
  const users = await findAllUsers()

  // 5. Kirim hanya field yang dibutuhkan frontend.
  const accounts = users.map((user) => ({
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
  }))

  return {
    success: true,
    accounts,
  }
})
