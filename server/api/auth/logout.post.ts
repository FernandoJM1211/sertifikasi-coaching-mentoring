import {
  findSessionByTokenHash,
  revokeSession,
} from '../../repositories/session.repository'
import { hashAuthToken } from '../../utils/auth-token'

export default defineEventHandler(async (event) => {
  const sessionToken = getSessionToken(event)

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
    clearSessionCookie(event)
  }

  return {
    success: true,
    message: 'Logout berhasil.',
  }
})
