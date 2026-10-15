import fs from 'node:fs/promises'
import path from 'node:path'

import { google } from 'googleapis'

const clientId =
  process.env.GOOGLE_OAUTH_CLIENT_ID

const clientSecret =
  process.env.GOOGLE_OAUTH_CLIENT_SECRET

const redirectUri =
  process.env.GOOGLE_OAUTH_REDIRECT_URI

const tokenPath =
  process.env.GOOGLE_OAUTH_TOKEN_PATH

if (!clientId) {
  throw new Error(
    'GOOGLE_OAUTH_CLIENT_ID belum dikonfigurasi.',
  )
}

if (!clientSecret) {
  throw new Error(
    'GOOGLE_OAUTH_CLIENT_SECRET belum dikonfigurasi.',
  )
}

if (!redirectUri) {
  throw new Error(
    'GOOGLE_OAUTH_REDIRECT_URI belum dikonfigurasi.',
  )
}

if (!tokenPath) {
  throw new Error(
    'GOOGLE_OAUTH_TOKEN_PATH belum dikonfigurasi.',
  )
}

function getGoogleOAuthTokenPath(): string {
  if (!tokenPath) {
    throw new Error(
      'GOOGLE_OAUTH_TOKEN_PATH belum dikonfigurasi.',
    )
  }

  return tokenPath
}

export const googleOAuthClient =
  new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  )

export function createGoogleAuthorizationUrl(
  state: string,
) {
  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
    ],
    state,
  })
}

export async function saveGoogleOAuthTokens(
  tokens: {
    refresh_token?: string | null
  },
) {
  if (!tokens.refresh_token) {
    throw new Error(
      'Refresh token Google tidak tersedia.',
    )
  }

  const currentTokenPath =
    getGoogleOAuthTokenPath()

  const directory =
    path.dirname(currentTokenPath)

  await fs.mkdir(directory, {
    recursive: true,
  })

  await fs.writeFile(
    currentTokenPath,
    JSON.stringify(
      {
        refresh_token:
          tokens.refresh_token,
      },
      null,
      2,
    ),
    'utf8',
  )
}

export async function loadGoogleOAuthTokens() {
  try {
    const currentTokenPath =
      getGoogleOAuthTokenPath()

    const content =
      await fs.readFile(
        currentTokenPath,
        'utf8',
      )

    return JSON.parse(content) as {
      refresh_token: string
    }
  } catch {
    return null
  }
}