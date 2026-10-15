import {
  createGoogleAuthorizationUrl,
} from '../../services/google-oauth.service'

function generateState() {
  return crypto.randomUUID()
}

export default defineEventHandler(
  async (event) => {
    const state = generateState()

    setCookie(
      event,
      'google_oauth_state',
      state,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 600,
        path: '/',
      },
    )

    const authorizationUrl =
      createGoogleAuthorizationUrl(state)

    return sendRedirect(
      event,
      authorizationUrl,
    )
  },
)