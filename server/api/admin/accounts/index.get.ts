import { findAllUsers } from '../../../repositories/user.repository'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

  const users = await findAllUsers()

  return {
    success: true,
    accounts: users.map(toPublicAccount),
  }
})
