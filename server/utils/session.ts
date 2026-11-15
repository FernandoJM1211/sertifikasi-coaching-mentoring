import type { H3Event } from 'h3'
import type { UserRole } from '../../shared/utils/roles'
import {
  getAuthenticatedUser,
  type AuthenticatedUser,
} from '../services/auth.service'

export const SESSION_COOKIE_NAME = 'cmsp_session'

const isProduction = process.env.NODE_ENV === 'production'

export function setSessionCookie(
  event: H3Event,
  token: string,
  expiresAt: string,
) {
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  })
}

export function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE_NAME)
}

/**
 * Memastikan request berasal dari pengguna yang sudah login dan
 * (opsional) memiliki salah satu role yang diizinkan.
 *
 * Sesi tidak ada/tidak valid -> 401, role tidak sesuai -> 403.
 */
export async function requireUser(
  event: H3Event,
  allowedRoles?: readonly UserRole[],
): Promise<AuthenticatedUser> {
  const sessionToken = getSessionToken(event)

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const user = await getAuthenticatedUser(sessionToken)

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak memiliki akses ke fitur ini.',
    })
  }

  event.context.user = user

  return user
}

/** Mengambil parameter route yang wajib ada (sudah di-trim). */
export function requireRouterParam(
  event: H3Event,
  name: string,
  label = name,
): string {
  const value = getRouterParam(event, name)?.trim()

  if (!value) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} wajib diisi.`,
    })
  }

  return value
}

/** Alamat IP klien untuk keperluan log dan pembatasan percobaan. */
export function getClientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) ?? ''
}
