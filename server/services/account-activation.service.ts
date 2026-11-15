
import {
  findActivationTokenByHash,
  markActivationTokenAsUsed,
} from '../repositories/account-activation-token.repository'
import {
  findUserById,
  activateUserAccount,
} from '../repositories/user.repository'
import {
  hashAuthToken,
} from '../utils/auth-token'
import {
  hashPassword,
  validateNewPassword,
} from '../utils/password'

export async function activatePesertaAccount(input: {
  token: string
  password: string
}): Promise<{ success: true }> {
  const token = input.token.trim()
  const password = input.password

  if (!token || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token dan kata sandi wajib diisi.',
    })
  }

  validateNewPassword(password)

  const tokenHash = hashAuthToken(token)
  const activationToken =
    await findActivationTokenByHash(tokenHash)

  if (!activationToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token aktivasi tidak valid.',
    })
  }

  if (activationToken.used_at) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Token aktivasi sudah digunakan atau dicabut.',
    })
  }

  const expiresAt = Date.parse(activationToken.expires_at)

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw createError({
      statusCode: 410,
      statusMessage: 'Token aktivasi sudah kedaluwarsa.',
    })
  }

  const user = await findUserById(activationToken.user_id)

  if (!user || user.role !== 'PESERTA') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun peserta tidak ditemukan.',
    })
  }

  if (user.account_status !== 'PENDING_ACTIVATION') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Akun tidak sedang menunggu aktivasi.',
    })
  }

  const passwordHash = await hashPassword(password)

  await activateUserAccount(user.user_id, passwordHash)

  await markActivationTokenAsUsed(
    activationToken.activation_token_id,
  )

  return { success: true }
}
