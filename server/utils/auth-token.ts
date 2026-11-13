
import {
  createHash,
  randomBytes,
} from 'node:crypto'

/**
 * Membuat token acak yang aman untuk aktivasi akun
 * atau reset kata sandi.
 */
export function generateAuthToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Mengubah token menjadi SHA-256 hash sebelum disimpan
 * ke spreadsheet.
 */
export function hashAuthToken(
  token: string,
): string {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}
