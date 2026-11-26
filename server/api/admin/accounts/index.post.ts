import {
  createUser,
  findUserByEmail,
} from '../../../repositories/user.repository'
import { STAFF_ROLES, type StaffRole } from '../../../../shared/utils/roles'

type CreateAccountBody = {
  full_name?: unknown
  username_email?: unknown
  role?: unknown
  password?: unknown
}

export default defineEventHandler(async (event) => {
  const currentUser = await requireUser(event, ['SUPER_ADMIN'])

  const body = await readBody<CreateAccountBody>(event)

  const fullName =
    typeof body?.full_name === 'string' ? body.full_name.trim() : ''

  const email =
    typeof body?.username_email === 'string'
      ? body.username_email.trim().toLowerCase()
      : ''

  const role = body?.role
  const password =
    typeof body?.password === 'string' ? body.password : ''

  if (!fullName || !email || !role || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nama, email, peran, dan kata sandi wajib diisi.',
    })
  }

  if (fullName.length > 150) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nama lengkap maksimal 150 karakter.',
    })
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format email tidak valid.',
    })
  }

  if (
    typeof role !== 'string' ||
    !(STAFF_ROLES as readonly string[]).includes(role)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Peran akun staf tidak valid.',
    })
  }

  validateNewPassword(password)

  if (await findUserByEmail(email)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email sudah terdaftar.',
    })
  }

  const user = await createUser({
    full_name: fullName,
    username_email: email,
    password_hash: await hashPassword(password),
    role: role as StaffRole,
    account_status: 'ACTIVE',
  })

  await recordAccountAudit(event, {
    actorUserId: currentUser.user_id,
    action: 'ACCOUNT_CREATE',
    targetUserId: user.user_id,
    details: `Peran ${role}; email ${email}`,
  })

  return {
    success: true,
    message: 'Akun staf berhasil dibuat.',
    account: toPublicAccount(user),
  }
})
