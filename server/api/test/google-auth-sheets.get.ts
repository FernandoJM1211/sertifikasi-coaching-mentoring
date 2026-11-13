
import { findUserByEmail } from '../../repositories/user.repository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const email = String(query.email ?? '')

  const user = await findUserByEmail(email)

  return {
    success: true,
    found: user !== null,
    user: user
      ? {
          user_id: user.user_id,
          username_email: user.username_email,
          role: user.role,
          account_status: user.account_status,
        }
      : null,
  }
})
