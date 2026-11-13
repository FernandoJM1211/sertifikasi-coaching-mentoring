
import {
  findActivationTokenByHash,
  markActivationTokenAsUsed,
} from '../repositories/activation-token.repository'
import {
  activateUserAccount,
  findUserById,
} from '../repositories/user.repository'
import {
  hashAuthToken,
} from '../utils/auth-token'
import {
  hashPassword,
} from '../utils/password'

const MIN_PASSWORD_LENGTH = 12

/**
 * Mengaktifkan akun peserta menggunakan token aktivasi
 * dan kata sandi baru yang ditetapkan pengguna.
 */
export async function activateAccount(input: {
  token: string
  password: string
  confirmPassword: string
}) {
  const token = input.token.trim()
  const password = input.password
  const confirmPassword = input.confirmPassword

  if (!token || !password || !confirmPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token dan kata sandi wajib diisi.',
    })
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`,
    })
  }

  if (password !== confirmPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Konfirmasi kata sandi tidak cocok.',
    })
  }

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
      statusMessage: 'Token aktivasi sudah digunakan.',
    })
  }

  const expiresAt = Date.parse(activationToken.expires_at)

  if (
    Number.isNaN(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token aktivasi sudah kedaluwarsa.',
    })
  }

  const user = await findUserById(
    activationToken.user_id,
  )

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun yang terkait dengan token tidak ditemukan.',
    })
  }

  if (user.role !== 'PARTICIPANT') {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Aktivasi token hanya diperuntukkan bagi akun peserta.',
    })
  }

  if (user.account_status !== 'PENDING_ACTIVATION') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Akun tidak menunggu aktivasi.',
    })
  }

  const passwordHash = await hashPassword(password)

  // Tandai token terpakai sebelum mengaktifkan akun.
  // Jika pembaruan akun gagal, pengguna perlu alur pemulihan
  // internal karena token sudah tidak dapat digunakan kembali.
  await markActivationTokenAsUsed(
    activationToken.token_id,
  )

  await activateUserAccount(
    user.user_id,
    passwordHash,
  )

  return {
    success: true,
    message:
      'Akun berhasil diaktifkan. Silakan masuk menggunakan email dan kata sandi baru.',
    user: {
      user_id: user.user_id,
      username_email: user.username_email,
      role: user.role,
      account_status: 'ACTIVE' as const,
    },
  }
}
