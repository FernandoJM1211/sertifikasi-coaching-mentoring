/**
 * Perlindungan CSRF untuk seluruh endpoint API yang mengubah data.
 *
 * Autentikasi memakai cookie, sehingga setiap request POST/PUT/PATCH/DELETE
 * ke /api wajib berasal dari origin aplikasi ini sendiri.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler((event) => {
  if (SAFE_METHODS.has(event.method)) return
  if (!event.path.startsWith('/api/')) return

  const origin =
    getRequestHeader(event, 'origin') ||
    getRequestHeader(event, 'referer')

  if (!origin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak dapat diverifikasi.',
    })
  }

  let originHost: string

  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak valid.',
    })
  }

  const allowedHosts = new Set<string>([
    getRequestHost(event, { xForwardedHost: true }),
  ])

  const appBaseUrl = process.env.APP_BASE_URL?.trim()

  if (appBaseUrl) {
    try {
      allowedHosts.add(new URL(appBaseUrl).host)
    } catch {
      // APP_BASE_URL tidak valid; abaikan.
    }
  }

  if (!allowedHosts.has(originHost)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak diizinkan.',
    })
  }
})
