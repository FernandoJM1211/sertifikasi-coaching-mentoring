import type { User } from '../repositories/user.repository'

/**
 * Data akun yang aman dikirim ke frontend.
 * password_hash TIDAK PERNAH ikut dikirim.
 */
export function toPublicAccount(user: User) {
  return {
    user_id: user.user_id,
    person_id: user.person_id,
    full_name: user.full_name,
    username_email: user.username_email,
    role: user.role,
    account_status: user.account_status,
    email_verified_at: user.email_verified_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login_at: user.last_login_at,
  }
}
