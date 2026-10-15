import {
  googleOAuthClient,
  saveGoogleOAuthTokens,
} from '../../../services/google-oauth.service'

export default defineEventHandler(
  async (event) => {
    const query = getQuery(event)

    const code =
      typeof query.code === 'string'
        ? query.code
        : ''

    const state =
      typeof query.state === 'string'
        ? query.state
        : ''

    const savedState = getCookie(
      event,
      'google_oauth_state',
    )

    if (!code) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Authorization code dari Google tidak ditemukan.',
      })
    }

    if (!state || !savedState) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'OAuth state tidak ditemukan.',
      })
    }

    if (state !== savedState) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'OAuth state tidak valid.',
      })
    }

    deleteCookie(
      event,
      'google_oauth_state',
      {
        path: '/',
      },
    )

    const { tokens } =
      await googleOAuthClient.getToken(code)

    if (!tokens.refresh_token) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Refresh token Google tidak diperoleh.',
      })
    }

    await saveGoogleOAuthTokens(tokens)

    googleOAuthClient.setCredentials(tokens)

    return {
      success: true,
      message:
        'Google OAuth berhasil dan refresh token berhasil disimpan.',
      data: {
        hasRefreshToken:
          Boolean(tokens.refresh_token),
        scope:
          tokens.scope ?? null,
      },
    }
  },
)