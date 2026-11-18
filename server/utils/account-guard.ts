import { findUserById, type User } from '../repositories/user.repository'

/**
 * Pastikan akun target boleh dikelola lewat Manajemen Akun.
 * Akun Super Admin dilindungi: tidak dapat di-reset kata sandinya atau diubah statusnya
 * oleh akun lain. Super Admin mengganti kata sandinya sendiri lewat menu Ganti Kata Sandi.
 */
export async function requireManageableAccount(userId: string): Promise<User> {
  const target = await findUserById(userId)

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Akun tidak ditemukan.' })
  }

  if (target.role === 'SUPER_ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun Super Admin dilindungi dan tidak dapat diubah melalui Manajemen Akun.',
    })
  }

  return target
}
