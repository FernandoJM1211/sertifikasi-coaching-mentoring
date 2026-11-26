
import {
  findActivationTokenByHash,
  markActivationTokenAsUsed,
  revokeActiveTokensForUser,
  type AccountActivationToken,
} from '../repositories/account-activation-token.repository'
import {
  findUserById,
  activateUserAccount,
  type User,
} from '../repositories/user.repository'
import {
  hashAuthToken,
} from '../utils/auth-token'
import {
  hashPassword,
  validateNewPassword,
} from '../utils/password'

/**
 * Status tautan aktivasi (docs/08 K-28):
 * - VALID        : dapat dipakai membuat kata sandi;
 * - ACTIVE       : akun sudah aktif (tautan apa pun milik akun ini) → arahkan ke halaman masuk;
 * - EXPIRED      : kedaluwarsa/sudah dicabut, akun belum aktif → minta tautan baru lewat Lupa Kata Sandi;
 * - UNAVAILABLE  : akun nonaktif/bukan peserta → hubungi admin;
 * - INVALID      : token tidak dikenal.
 * Email akun hanya disertakan untuk VALID/ACTIVE/EXPIRED: pemegang token adalah penerima email itu.
 */
export type ActivationLinkStatus = 'VALID' | 'ACTIVE' | 'EXPIRED' | 'UNAVAILABLE' | 'INVALID'

type ResolvedActivation = {
  status: ActivationLinkStatus
  token?: AccountActivationToken
  user?: User
}

async function resolveActivationToken(rawToken: string): Promise<ResolvedActivation> {
  const token = rawToken.trim()
  if (!token) return { status: 'INVALID' }

  const activationToken = await findActivationTokenByHash(hashAuthToken(token))
  if (!activationToken) return { status: 'INVALID' }

  const user = await findUserById(activationToken.user_id)

  if (!user || user.role !== 'PESERTA') return { status: 'INVALID' }
  if (user.account_status === 'ACTIVE') return { status: 'ACTIVE', token: activationToken, user }
  if (user.account_status !== 'PENDING_ACTIVATION') return { status: 'UNAVAILABLE', token: activationToken, user }

  const expiresAt = Date.parse(activationToken.expires_at)

  if (activationToken.used_at || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return { status: 'EXPIRED', token: activationToken, user }
  }

  return { status: 'VALID', token: activationToken, user }
}

/** Dipakai halaman aktivasi saat dibuka, sebelum peserta mengisi kata sandi. */
export async function getActivationLinkStatus(rawToken: string): Promise<{
  status: ActivationLinkStatus
  email: string
}> {
  const { status, user } = await resolveActivationToken(rawToken)
  const showEmail = status === 'VALID' || status === 'ACTIVE' || status === 'EXPIRED'

  return { status, email: showEmail ? user?.username_email ?? '' : '' }
}

const STATUS_ERRORS: Record<Exclude<ActivationLinkStatus, 'VALID'>, { statusCode: number, statusMessage: string }> = {
  INVALID: { statusCode: 400, statusMessage: 'Tautan aktivasi tidak valid. Gunakan tautan dari email aktivasi terbaru.' },
  ACTIVE: { statusCode: 409, statusMessage: 'Akun Anda sudah aktif. Silakan masuk.' },
  EXPIRED: {
    statusCode: 410,
    statusMessage: 'Tautan aktivasi sudah tidak berlaku. Minta tautan baru melalui Lupa Kata Sandi.',
  },
  UNAVAILABLE: { statusCode: 409, statusMessage: 'Akun ini tidak dapat diaktifkan. Hubungi admin.' },
}

export async function activatePesertaAccount(input: {
  token: string
  password: string
}): Promise<{ success: true, email: string }> {
  const password = input.password

  if (!input.token.trim() || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token dan kata sandi wajib diisi.',
    })
  }

  validateNewPassword(password)

  const { status, token, user } = await resolveActivationToken(input.token)

  if (status !== 'VALID' || !token || !user) {
    throw createError(STATUS_ERRORS[status === 'VALID' ? 'INVALID' : status])
  }

  const passwordHash = await hashPassword(password)

  await activateUserAccount(user.user_id, passwordHash)
  await markActivationTokenAsUsed(token.activation_token_id)

  // Tautan aktivasi lain milik akun ini (email sebelumnya) tidak diperlukan lagi.
  await revokeActiveTokensForUser(user.user_id)

  return { success: true, email: user.username_email }
}
