import {
  appendAuthSheetValues,
  getAuthSheetValues,
  updateAuthSheetRow,
} from '../utils/google-auth-sheets'

export type UserRole =
  | 'PARTICIPANT'
  | 'VERIFIER'
  | 'TECHNICAL_ASSESSOR'
  | 'PUBLIC_ASSESSOR'
  | 'SUPER_ADMIN'

export type UserAccountStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DISABLED'

export type User = {
  user_id: string
  person_id: string
  full_name: string
  username_email: string
  password_hash: string
  role: UserRole
  account_status: UserAccountStatus
  email_verified_at: string
  password_changed_at: string
  created_at: string
  updated_at: string
  last_login_at: string
}

export type CreateUserPayload = {
  person_id?: string
  full_name: string
  username_email: string
  password_hash: string
  role: UserRole
  account_status: UserAccountStatus
}

const SHEET_NAME = 'users'

const ALLOWED_ROLES: UserRole[] = [
  'PARTICIPANT',
  'VERIFIER',
  'TECHNICAL_ASSESSOR',
  'PUBLIC_ASSESSOR',
  'SUPER_ADMIN',
]

const ALLOWED_ACCOUNT_STATUSES: UserAccountStatus[] = [
  'PENDING_ACTIVATION',
  'ACTIVE',
  'SUSPENDED',
  'DISABLED',
]

const STAFF_ROLES: UserRole[] = [
  'VERIFIER',
  'TECHNICAL_ASSESSOR',
  'PUBLIC_ASSESSOR',
  'SUPER_ADMIN',
]

function rowToUser(row: string[]): User {
  return {
    user_id: row[0] ?? '',
    person_id: row[1] ?? '',
    full_name: row[2] ?? '',
    username_email: row[3] ?? '',
    password_hash: row[4] ?? '',
    role: (row[5] ?? '') as UserRole,
    account_status: (row[6] ?? '') as UserAccountStatus,
    email_verified_at: row[7] ?? '',
    password_changed_at: row[8] ?? '',
    created_at: row[9] ?? '',
    updated_at: row[10] ?? '',
    last_login_at: row[11] ?? '',
  }
}

function userToRow(user: User): string[] {
  return [
    user.user_id,
    user.person_id,
    user.full_name,
    user.username_email,
    user.password_hash,
    user.role,
    user.account_status,
    user.email_verified_at,
    user.password_changed_at,
    user.created_at,
    user.updated_at,
    user.last_login_at,
  ]
}

function generateNextUserId(rows: string[][]): string {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const match = (row[0] ?? '').match(/^USR-(\d+)$/)

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `USR-${String(maxNumber + 1).padStart(6, '0')}`
}

export async function findUserByEmail(
  email: string,
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const foundRow = rows.slice(1).find(
    (row) =>
      (row[3] ?? '').trim().toLowerCase() === normalizedEmail,
  )

  return foundRow ? rowToUser(foundRow) : null
}

export async function findUserById(
  userId: string,
): Promise<User | null> {
  const normalizedUserId = userId.trim().toUpperCase()

  if (!normalizedUserId) {
    return null
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const foundRow = rows.slice(1).find(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
  )

  return foundRow ? rowToUser(foundRow) : null
}


export async function findUserByPersonId(
  personId: string,
): Promise<User | null> {
  const normalizedPersonId = personId.trim().toUpperCase()

  if (!normalizedPersonId) {
    return null
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const foundRow = rows.slice(1).find(
    (row) =>
      (row[1] ?? '').trim().toUpperCase() === normalizedPersonId,
  )

  return foundRow ? rowToUser(foundRow) : null
}

export async function findUsersByPersonId(
  personId: string,
): Promise<User[]> {
  const normalizedPersonId = personId.trim().toUpperCase()

  if (!normalizedPersonId) {
    return []
  }

  const rows = await getAuthSheetValues('users')

  return rows
    .slice(1)
    .filter(
      (row) =>
        String(row[1] ?? '').trim().toUpperCase() ===
        normalizedPersonId,
    )
    .map((row) => ({
      user_id: String(row[0] ?? ''),
      person_id: String(row[1] ?? ''),
      full_name: String(row[2] ?? ''),
      username_email: String(row[3] ?? ''),
      password_hash: String(row[4] ?? ''),
      role: String(row[5] ?? '') as User['role'],
      account_status: String(row[6] ?? '') as User['account_status'],
      email_verified_at: String(row[7] ?? ''),
      password_changed_at: String(row[8] ?? ''),
      created_at: String(row[9] ?? ''),
      updated_at: String(row[10] ?? ''),
      last_login_at: String(row[11] ?? ''),
    }))
}


/**
 * Mengambil seluruh akun dari sheet users.
 * Data dikembalikan sebagai User; endpoint API wajib
 * menyaring password_hash sebelum mengirim respons ke frontend.
 */
export async function findAllUsers(): Promise<User[]> {
  const rows = await getAuthSheetValues(SHEET_NAME)

  return rows.slice(1)
    .filter((row) => (row[0] ?? '').trim() !== '')
    .map((row) => rowToUser(row))
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<User> {
  const personId = payload.person_id?.trim() ?? ''
  const fullName = payload.full_name.trim()
  const email = payload.username_email.trim().toLowerCase()
  const passwordHash = payload.password_hash.trim()
  const role = payload.role
  const accountStatus = payload.account_status

  if (!fullName || !email || !passwordHash || !role || !accountStatus) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Nama, email, kata sandi, role, dan status akun wajib diisi.',
    })
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format email tidak valid.',
    })
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role akun tidak valid.',
    })
  }

  if (!ALLOWED_ACCOUNT_STATUSES.includes(accountStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status akun tidak valid.',
    })
  }

  if (role === 'PARTICIPANT' && !personId) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Akun peserta harus terhubung dengan data Person.',
    })
  }

  if (
    role !== 'PARTICIPANT' &&
    accountStatus === 'PENDING_ACTIVATION'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Akun pegawai tidak menggunakan status aktivasi peserta.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const existingUser = rows.slice(1).find(
    (row) =>
      (row[3] ?? '').trim().toLowerCase() === email,
  )

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Email tersebut sudah terdaftar sebagai akun.',
    })
  }

  const now = new Date().toISOString()

  const user: User = {
    user_id: generateNextUserId(rows),
    person_id: personId,
    full_name: fullName,
    username_email: email,
    password_hash: passwordHash,
    role,
    account_status: accountStatus,
    email_verified_at: '',
    password_changed_at:
      role !== 'PARTICIPANT' && accountStatus === 'ACTIVE'
        ? now
        : '',
    created_at: now,
    updated_at: now,
    last_login_at: '',
  }

  await appendAuthSheetValues(SHEET_NAME, userToRow(user))

  return user
}

/**
 * Aktivasi token hanya berlaku untuk akun peserta.
 */
export async function activateUserAccount(
  userId: string,
  passwordHash: string,
): Promise<User> {
  const normalizedUserId = userId.trim().toUpperCase()
  const normalizedPasswordHash = passwordHash.trim()

  if (!normalizedUserId || !normalizedPasswordHash) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'ID akun dan hash kata sandi wajib diisi.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
  )

  if (rowIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun tidak ditemukan.',
    })
  }

  const row = rows[rowIndex + 1]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data akun tidak ditemukan.',
    })
  }

  const user = rowToUser(row)

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
      statusMessage:
        'Akun tidak berada dalam status menunggu aktivasi.',
    })
  }

  const now = new Date().toISOString()

  const updatedUser: User = {
    ...user,
    password_hash: normalizedPasswordHash,
    account_status: 'ACTIVE',
    email_verified_at: now,
    password_changed_at: now,
    updated_at: now,
  }

  await updateAuthSheetRow(
    SHEET_NAME,
    rowIndex + 2,
    userToRow(updatedUser),
  )

  return updatedUser
}

/**
 * Menyiapkan akun pegawai tanpa token aktivasi peserta.
 * Pemanggil wajib memverifikasi otorisasi Super Admin
 * sebelum menggunakan fungsi ini.
 */
export async function activateStaffAccount(
  userId: string,
  passwordHash: string,
): Promise<User> {
  const normalizedUserId = userId.trim().toUpperCase()
  const normalizedPasswordHash = passwordHash.trim()

  if (!normalizedUserId || !normalizedPasswordHash) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'ID akun dan hash kata sandi wajib diisi.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
  )

  if (rowIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun pegawai tidak ditemukan.',
    })
  }

  const row = rows[rowIndex + 1]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data akun pegawai tidak ditemukan.',
    })
  }

  const user = rowToUser(row)

  if (!STAFF_ROLES.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Fungsi ini hanya untuk akun pegawai.',
    })
  }

  if (
    user.account_status !== 'PENDING_ACTIVATION' &&
    user.account_status !== 'ACTIVE'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Status akun tidak memungkinkan penetapan kata sandi.',
    })
  }

  const now = new Date().toISOString()

  const updatedUser: User = {
    ...user,
    password_hash: normalizedPasswordHash,
    account_status: 'ACTIVE',
    password_changed_at: now,
    updated_at: now,
  }

  await updateAuthSheetRow(
    SHEET_NAME,
    rowIndex + 2,
    userToRow(updatedUser),
  )

  return updatedUser
}


/**
 * Memperbarui hash kata sandi pengguna.
 */
export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<User> {
  const normalizedUserId = userId.trim().toUpperCase()
  const normalizedPasswordHash = passwordHash.trim()

  if (!normalizedUserId || !normalizedPasswordHash) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'ID pengguna dan hash kata sandi wajib diisi.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
  )

  if (rowIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun pengguna tidak ditemukan.',
    })
  }

  const row = rows[rowIndex + 1]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data akun pengguna tidak ditemukan.',
    })
  }

  const user = rowToUser(row)

  if (user.account_status !== 'ACTIVE') {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Kata sandi hanya dapat diubah untuk akun aktif.',
    })
  }

  const now = new Date().toISOString()

  const updatedUser: User = {
    ...user,
    password_hash: normalizedPasswordHash,
    password_changed_at: now,
    updated_at: now,
  }

  await updateAuthSheetRow(
    SHEET_NAME,
    rowIndex + 2,
    userToRow(updatedUser),
  )

  return updatedUser
}


/**
 * Memperbarui status akun pengguna.
 * Hanya mendukung ACTIVE dan DISABLED.
 */
export async function updateUserStatus(
  userId: string,
  accountStatus: 'ACTIVE' | 'DISABLED',
): Promise<User> {
  const normalizedUserId = userId.trim().toUpperCase()

  if (!normalizedUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID pengguna wajib diisi.',
    })
  }

  if (!['ACTIVE', 'DISABLED'].includes(accountStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status akun tidak valid.',
    })
  }

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
  )

  if (rowIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun pengguna tidak ditemukan.',
    })
  }

  const row = rows[rowIndex + 1]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data akun pengguna tidak ditemukan.',
    })
  }

  const user = rowToUser(row)

  if (
    user.account_status === 'PENDING_ACTIVATION' &&
    accountStatus === 'ACTIVE'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Akun dengan status menunggu aktivasi tidak dapat diaktifkan melalui fitur ini.',
    })
  }

  const now = new Date().toISOString()

  const updatedUser: User = {
    ...user,
    account_status: accountStatus,
    updated_at: now,
  }

  await updateAuthSheetRow(
    SHEET_NAME,
    rowIndex + 2,
    userToRow(updatedUser),
  )

  return updatedUser
}
