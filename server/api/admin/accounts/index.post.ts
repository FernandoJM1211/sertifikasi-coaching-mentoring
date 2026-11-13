
import { getAuthenticatedUser } from '../../../services/auth.service'
import { createUser, findUserByEmail } from '../../../repositories/user.repository'
import { hashPassword } from '../../../utils/password'

const SESSION_COOKIE_NAME = 'cmsp_session'

const ALLOWED_STAFF_ROLES = [
  'VERIFIER',
  'TECHNICAL_ASSESSOR',
  'PUBLIC_ASSESSOR',
  'SUPER_ADMIN',
] as const

type StaffRole = (typeof ALLOWED_STAFF_ROLES)[number]

type CreateAccountBody = {
  full_name?: unknown
  username_email?: unknown
  role?: unknown
  password?: unknown
}

export default defineEventHandler(async (event) => {
  // Validasi asal permintaan untuk membantu mencegah CSRF.
  const origin = getRequestHeader(event, 'origin')
  const host = getRequestHeader(event, 'host')

  if (!origin || !host) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak dapat diverifikasi.',
    })
  }

  let originHost = ''

  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak valid.',
    })
  }

  if (originHost !== host) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Asal permintaan tidak diizinkan.',
    })
  }

  // Pastikan pengguna sudah login.
  const sessionToken = getCookie(event, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const currentUser = await getAuthenticatedUser(sessionToken)

  // Hanya Super Admin yang boleh membuat akun staf.
  if (currentUser.role !== 'SUPER_ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak memiliki akses untuk membuat akun.',
    })
  }

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

  // Validasi data wajib.
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
    !ALLOWED_STAFF_ROLES.includes(role as StaffRole)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Peran akun staf tidak valid.',
    })
  }

  if (password.length < 12) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kata sandi minimal 12 karakter.',
    })
  }

  if (password.length > 128) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kata sandi maksimal 128 karakter.',
    })
  }

  // Periksa apakah email sudah digunakan.
  const existingUser = await findUserByEmail(email)

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email sudah terdaftar.',
    })
  }

  // Hash kata sandi sebelum disimpan.
  const passwordHash = await hashPassword(password)

  let user

  try {
    user = await createUser({
      full_name: fullName,
      username_email: email,
      password_hash: passwordHash,
      role: role as StaffRole,
      account_status: 'ACTIVE',
    })
  } catch (error: unknown) {
    // Pertahankan error HTTP yang sudah dikenali.
    if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error
    ) {
      throw error
    }

    console.error('Gagal membuat akun staf:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Akun gagal dibuat. Silakan coba kembali.',
    })
  }

  // Jangan pernah mengirim password_hash ke frontend.
  return {
    success: true,
    message: 'Akun staf berhasil dibuat.',
    account: {
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
    },
  }
})
