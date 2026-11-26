import { findUserById } from '../../../repositories/user.repository'
import { getAccountHistory } from '../../../services/account-audit.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

  const userId = requireRouterParam(event, 'id', 'ID akun')
  const user = await findUserById(userId)

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun tidak ditemukan.',
    })
  }

  return {
    success: true,
    account: toPublicAccount(user),
    // Riwayat tindakan akun (audit log); kosong bila belum ada catatan.
    history: await getAccountHistory(user.user_id),
  }
})
