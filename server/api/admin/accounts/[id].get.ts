import { findUserById } from '../../../repositories/user.repository'

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
  }
})
