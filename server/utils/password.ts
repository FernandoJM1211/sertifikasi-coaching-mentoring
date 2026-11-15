import bcrypt from 'bcryptjs'
import { createError } from 'h3'

const SALT_ROUNDS = 12

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export async function hashPassword(
  password: string,
): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

let dummyHash: Promise<string> | null = null

/**
 * Membandingkan kata sandi dengan hash.
 * Jika hash kosong (mis. akun tidak ditemukan), perbandingan tetap
 * dijalankan terhadap hash dummy agar waktu respons sama.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  if (!passwordHash) {
    dummyHash ??= bcrypt.hash('dummy-password', SALT_ROUNDS)
    await bcrypt.compare(password, await dummyHash)
    return false
  }

  return bcrypt.compare(password, passwordHash)
}

/** Validasi aturan kata sandi baru. Melempar 400 jika tidak sesuai. */
export function validateNewPassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`,
    })
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter.`,
    })
  }
}
