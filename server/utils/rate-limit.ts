/**
 * Pembatas percobaan sederhana berbasis memori (fixed window).
 *
 * Cukup untuk satu instance server. Jika aplikasi dijalankan
 * di beberapa instance, ganti dengan penyimpanan bersama (mis. Redis).
 */

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

let lastCleanupAt = 0

function cleanup(now: number) {
  if (now - lastCleanupAt < 60_000) return

  lastCleanupAt = now

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

/**
 * Mencatat satu percobaan untuk `key`. Melempar 429 jika batas
 * `limit` dalam jendela `windowMs` sudah terlampaui.
 */
export function assertRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message = 'Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.',
) {
  const now = Date.now()
  cleanup(now)

  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count++

  if (bucket.count > limit) {
    throw createError({
      statusCode: 429,
      statusMessage: message,
    })
  }
}

/** Menghapus catatan percobaan, mis. setelah login berhasil. */
export function resetRateLimit(key: string) {
  buckets.delete(key)
}
