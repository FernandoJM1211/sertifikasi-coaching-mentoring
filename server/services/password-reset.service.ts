import {
  createPasswordResetToken,
  findPasswordResetTokenByHash,
  revokeActiveResetTokensForUser,
} from '../repositories/password-reset-token.repository'
import { findUserByEmail, findUserById, updateUserPassword } from '../repositories/user.repository'
import { revokeAllUserSessions } from '../repositories/session.repository'
import { resendPesertaActivation } from './peserta-account-provisioning.service'
import { generateAuthToken, hashAuthToken } from '../utils/auth-token'
import { hashPassword, validateNewPassword } from '../utils/password'
import { sendPasswordResetEmail } from '../utils/email'

/**
 * Lupa Kata Sandi — KHUSUS PESERTA (docs/08 K-19).
 * Akun petugas (Super Admin, Verifikator, Asesor) tidak memakai alur ini karena username-nya
 * belum tentu email aktif; kata sandinya diatur ulang oleh Super Admin.
 */

/** Masa berlaku tautan atur ulang kata sandi. */
const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000

/** Pesan yang SAMA untuk semua kasus agar tidak dapat dipakai menebak email terdaftar. */
export const PASSWORD_RESET_REQUEST_MESSAGE =
  'Jika email tersebut terdaftar sebagai akun peserta, tautan untuk mengatur ulang kata sandi telah dikirim. Periksa juga folder spam.'

function appBaseUrl(): string {
  const value = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '')
  if (!value) throw new Error('APP_BASE_URL belum dikonfigurasi.')
  return value
}

/**
 * Meminta tautan atur ulang. Tidak pernah memberi tahu apakah email terdaftar:
 * - peserta AKTIF → email tautan atur ulang (berlaku 1 jam, tautan lama dicabut);
 * - peserta MENUNGGU AKTIVASI → dikirim ulang tautan aktivasi;
 * - selain itu (tidak terdaftar, akun petugas, akun nonaktif) → tidak ada email.
 */
export async function requestPesertaPasswordReset(email: string, requestIp: string): Promise<void> {
  const user = await findUserByEmail(email)

  if (!user || user.role !== 'PESERTA') return

  try {
    if (user.account_status === 'PENDING_ACTIVATION') {
      await resendPesertaActivation(user.user_id)
      return
    }

    if (user.account_status !== 'ACTIVE') return

    await revokeActiveResetTokensForUser(user.user_id)

    const rawToken = generateAuthToken()

    await createPasswordResetToken({
      user_id: user.user_id,
      token_hash: hashAuthToken(rawToken),
      expires_at: new Date(Date.now() + RESET_TOKEN_DURATION_MS).toISOString(),
      request_ip: requestIp,
    })

    const resetUrl = new URL('/atur-ulang-kata-sandi', appBaseUrl())
    resetUrl.searchParams.set('token', rawToken)

    await sendPasswordResetEmail(user.username_email.trim().toLowerCase(), resetUrl.toString())
  } catch (error) {
    // Kegagalan internal tidak dibocorkan ke peminta (respons tetap sama); cukup dicatat.
    console.error('Gagal memproses permintaan lupa kata sandi:', error)
  }
}

/** Menyimpan kata sandi baru dari tautan email, lalu mencabut semua sesi & token atur ulang akun. */
export async function resetPesertaPassword(input: { token: string, password: string }): Promise<void> {
  validateNewPassword(input.password)

  const resetToken = await findPasswordResetTokenByHash(hashAuthToken(input.token))
  const invalid = () => createError({
    statusCode: 400,
    statusMessage: 'Tautan atur ulang kata sandi tidak valid atau sudah tidak berlaku. Silakan minta tautan baru.',
  })

  if (!resetToken || resetToken.used_at) throw invalid()

  const expiresAt = Date.parse(resetToken.expires_at)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw invalid()

  const user = await findUserById(resetToken.user_id)
  if (!user || user.role !== 'PESERTA' || user.account_status !== 'ACTIVE') throw invalid()

  await updateUserPassword(user.user_id, await hashPassword(input.password))

  // Token ini (dan token lain yang masih aktif) tidak dapat dipakai lagi; semua perangkat keluar.
  await revokeActiveResetTokensForUser(user.user_id)
  await revokeAllUserSessions(user.user_id)
}
