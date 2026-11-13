
import { getAuthenticatedUser } from '../../../../services/auth.service'
import { updateUserPassword } from '../../../../repositories/user.repository'
import { revokeAllUserSessions } from '../../../../repositories/session.repository'
import { hashPassword } from '../../../../utils/password'

const SESSION_COOKIE_NAME = 'cmsp_session'

type ResetPasswordBody = {
  new_password?: unknown
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

  // Pastikan pengguna sudah login.
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
      statusMessage: 'Anda tidak memiliki akses untuk mengatur ulang kata sandi.',
    })
  }

  const userId = getRouterParam(event, 'id')?.trim()

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID akun wajib diisi.',
    })
  }

  const body = await readBody<ResetPasswordBody>(event)
  const newPassword =
    typeof body?.new_password === 'string' ? body.new_password : ''

  if (newPassword.length < 12) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kata sandi baru minimal 12 karakter.',
    })
  }

  if (newPassword.length > 128) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kata sandi baru maksimal 128 karakter.',
    })
  }

  if (userId.toUpperCase() === currentUser.user_id.toUpperCase()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Gunakan fitur Ganti Kata Sandi untuk akun sendiri.',
    })
  }

  const passwordHash = await hashPassword(newPassword)

  await updateUserPassword(userId, passwordHash)

  // Cabut sesi akun target setelah kata sandi berhasil diperbarui.
  await revokeAllUserSessions(userId)

  return {
    success: true,
    message: 'Kata sandi akun berhasil diatur ulang.',
  }
})
