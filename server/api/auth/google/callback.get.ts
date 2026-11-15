import {
  exchangeGoogleAuthorizationCode,
  GOOGLE_OAUTH_STATE_COOKIE,
  saveGoogleOAuthTokens,
} from '../../../services/google-oauth.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const savedState = getCookie(event, GOOGLE_OAUTH_STATE_COOKIE)

  deleteCookie(event, GOOGLE_OAUTH_STATE_COOKIE, { path: '/' })

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization code dari Google tidak ditemukan.',
    })
  }

  if (!state || !savedState || state !== savedState) {
    throw createError({
      statusCode: 400,
      statusMessage: 'OAuth state tidak valid.',
    })
  }

  const tokens = await exchangeGoogleAuthorizationCode(code)

  if (!tokens.refresh_token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Refresh token Google tidak diperoleh.',
    })
  }

  await saveGoogleOAuthTokens(tokens)

  return {
    success: true,
    message: 'Google Drive berhasil terhubung dan refresh token tersimpan.',
    data: {
      scope: tokens.scope ?? null,
    },
  }
})
