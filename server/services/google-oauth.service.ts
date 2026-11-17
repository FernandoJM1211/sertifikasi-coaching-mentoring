import fs from 'node:fs/promises'
import path from 'node:path'

import { google } from 'googleapis'
import type { Auth } from 'googleapis'

export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state'

type StoredGoogleTokens = {
  refresh_token: string
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} belum dikonfigurasi.`)
  }

  return value
}

let oauthClient: Auth.OAuth2Client | null = null

/** Klien OAuth Google untuk akun Drive milik aplikasi. */
function getGoogleOAuthClient(): Auth.OAuth2Client {
  oauthClient ??= new google.auth.OAuth2(
    requireEnv('GOOGLE_OAUTH_CLIENT_ID'),
    requireEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
    requireEnv('GOOGLE_OAUTH_REDIRECT_URI'),
  )

  return oauthClient
}

export function createGoogleAuthorizationUrl(state: string): string {
  return getGoogleOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    state,
  })
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  const { tokens } = await getGoogleOAuthClient().getToken(code)
  return tokens
}

export async function saveGoogleOAuthTokens(tokens: {
  refresh_token?: string | null
}): Promise<void> {
  if (!tokens.refresh_token) {
    throw new Error('Refresh token Google tidak tersedia.')
  }

  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH?.trim()

  // Hosting tanpa penyimpanan file (mis. Vercel): token tidak dapat disimpan otomatis.
  // Hubungkan Drive dari lingkungan lokal, lalu isi GOOGLE_OAUTH_REFRESH_TOKEN di hosting.
  if (!tokenPath) {
    throw new Error(
      'GOOGLE_OAUTH_TOKEN_PATH tidak dikonfigurasi. Hubungkan Google Drive dari lingkungan lokal, '
      + 'lalu salin refresh token ke environment variable GOOGLE_OAUTH_REFRESH_TOKEN.',
    )
  }

  await fs.mkdir(path.dirname(tokenPath), { recursive: true })

  // File berisi kredensial: hanya dapat dibaca pemilik proses.
  await fs.writeFile(
    tokenPath,
    JSON.stringify({ refresh_token: tokens.refresh_token }, null, 2),
    { encoding: 'utf8', mode: 0o600 },
  )

  // Paksa klien memakai refresh token terbaru.
  getGoogleOAuthClient().setCredentials({
    refresh_token: tokens.refresh_token,
  })
}

/**
 * Refresh token Drive: `GOOGLE_OAUTH_REFRESH_TOKEN` (hosting, mis. Vercel) diutamakan,
 * jika tidak ada dibaca dari file `GOOGLE_OAUTH_TOKEN_PATH` (development lokal).
 */
async function loadGoogleOAuthTokens(): Promise<StoredGoogleTokens | null> {
  const fromEnv = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim()
  if (fromEnv) return { refresh_token: fromEnv }

  try {
    const content = await fs.readFile(
      requireEnv('GOOGLE_OAUTH_TOKEN_PATH'),
      'utf8',
    )

    const parsed = JSON.parse(content) as Partial<StoredGoogleTokens>

    return parsed.refresh_token
      ? { refresh_token: parsed.refresh_token }
      : null
  } catch {
    return null
  }
}

/**
 * Mengembalikan klien OAuth yang sudah memiliki refresh token.
 * Melempar 500 jika Google Drive belum dihubungkan oleh Super Admin.
 */
export async function getAuthorizedGoogleClient(): Promise<Auth.OAuth2Client> {
  const tokens = await loadGoogleOAuthTokens()

  if (!tokens?.refresh_token) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Google Drive belum terhubung. Super Admin perlu menghubungkannya melalui /api/auth/google.',
    })
  }

  const client = getGoogleOAuthClient()
  client.setCredentials({ refresh_token: tokens.refresh_token })

  return client
}
