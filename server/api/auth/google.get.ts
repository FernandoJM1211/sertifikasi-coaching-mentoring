import { randomUUID } from 'node:crypto'
import {
  createGoogleAuthorizationUrl,
  GOOGLE_OAUTH_STATE_COOKIE,
} from '../../services/google-oauth.service'

/**
 * Menghubungkan Google Drive aplikasi (penyimpanan dokumen peserta).
 * Hanya Super Admin yang boleh menjalankan alur ini, karena refresh token
 * yang diperoleh akan dipakai untuk seluruh unggahan dokumen.
 */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

  const state = randomUUID()

  setCookie(event, GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })

  return sendRedirect(event, createGoogleAuthorizationUrl(state))
})
