
import {
  findSessionByTokenHash,
  revokeSession,
} from '../../repositories/session.repository'
import {
  hashAuthToken,
} from '../../utils/auth-token'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(
    event,
    SESSION_COOKIE_NAME,
  )

  try {
    if (sessionToken) {
      const session = await findSessionByTokenHash(
        hashAuthToken(sessionToken),
      )

      if (session) {
        await revokeSession(session.session_id)
      }
    }
  } finally {
    // Selalu hapus cookie browser, termasuk saat sesi
    // sudah kedaluwarsa atau proses pencabutan gagal.
    deleteCookie(event, SESSION_COOKIE_NAME, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    })
  }

  return {
    success: true,
    message: 'Logout berhasil.',
  }
})
