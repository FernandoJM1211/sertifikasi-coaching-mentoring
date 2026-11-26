import { createError } from 'h3'
import {
  normalizeUserRole,
  USER_ROLES,
  ACCOUNT_STATUSES,
  type AccountStatus,
  type UserRole,
} from '../../shared/utils/roles'
import {
  appendAuthSheetRowsWithIds,
  getAuthSheetValues,
  updateAuthSheetRow,
  type ReadOptions,
} from '../utils/google-sheets'

export type { UserRole, AccountStatus as UserAccountStatus }

export type User = {
  user_id: string
  person_id: string
  full_name: string
  username_email: string
  password_hash: string
  role: UserRole
  account_status: AccountStatus
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
  account_status: AccountStatus
}

const SHEET_NAME = 'users'

function rowToUser(row: string[]): User {
  return {
    user_id: row[0] ?? '',
    person_id: row[1] ?? '',
    full_name: row[2] ?? '',
    username_email: row[3] ?? '',
    password_hash: row[4] ?? '',
    role: normalizeUserRole(row[5] ?? '') as UserRole,
    account_status: (row[6] ?? '') as AccountStatus,
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
  readOptions?: ReadOptions,
): Promise<User | null> {
  const normalizedUserId = userId.trim().toUpperCase()

  if (!normalizedUserId) {
    return null
  }

  const rows = await getAuthSheetValues(SHEET_NAME, readOptions)

  const foundRow = rows.slice(1).find(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
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

  const rows = await getAuthSheetValues(SHEET_NAME)

  return rows
    .slice(1)
    .filter(
      (row) =>
        String(row[1] ?? '').trim().toUpperCase() ===
        normalizedPersonId,
    )
    .map((row) => rowToUser(row))
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

  if (!USER_ROLES.includes(role)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role akun tidak valid.',
    })
  }

  if (!ACCOUNT_STATUSES.includes(accountStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status akun tidak valid.',
    })
  }

  if (role === 'PESERTA' && !personId) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Akun peserta harus terhubung dengan data Person.',
    })
  }

  if (
    role !== 'PESERTA' &&
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
    user_id: '', // ditetapkan saat baris ditulis
    person_id: personId,
    full_name: fullName,
    username_email: email,
    password_hash: passwordHash,
    role,
    account_status: accountStatus,
    email_verified_at: '',
    password_changed_at:
      role !== 'PESERTA' && accountStatus === 'ACTIVE'
        ? now
        : '',
    created_at: now,
    updated_at: now,
    last_login_at: '',
  }

  const [created] = await appendAuthSheetRowsWithIds(
    SHEET_NAME,
    'USR',
    1,
    (id) => ({ ...user, user_id: id }),
    (user) => userToRow(user),
  )

  return created!
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

  if (user.role !== 'PESERTA') {
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

/**
 * Mencatat waktu login terakhir pengguna.
 */
export async function updateUserLastLogin(
  userId: string,
): Promise<void> {
  const normalizedUserId = userId.trim().toUpperCase()

  if (!normalizedUserId) return

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
  )

  const row = rowIndex === -1 ? undefined : rows[rowIndex + 1]

  if (!row) return

  const updatedUser: User = {
    ...rowToUser(row),
    last_login_at: new Date().toISOString(),
  }

  await updateAuthSheetRow(
    SHEET_NAME,
    rowIndex + 2,
    userToRow(updatedUser),
  )
}

/**
 * Memperbarui nama lengkap pada akun (disinkronkan dari profil).
 */
export async function updateUserFullName(
  userId: string,
  fullName: string,
): Promise<void> {
  const normalizedUserId = userId.trim().toUpperCase()
  const normalizedName = fullName.trim()

  if (!normalizedUserId || !normalizedName) return

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
  )

  const row = rowIndex === -1 ? undefined : rows[rowIndex + 1]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun pengguna tidak ditemukan.',
    })
  }

  const updatedUser: User = {
    ...rowToUser(row),
    full_name: normalizedName,
    updated_at: new Date().toISOString(),
  }

  await updateAuthSheetRow(
    SHEET_NAME,
    rowIndex + 2,
    userToRow(updatedUser),
  )
}

/**
 * Mengganti email login akun (dipakai Super Admin, docs/08 K-28).
 * Pemeriksaan keunikan email dilakukan di service.
 */
export async function updateUserEmail(
  userId: string,
  email: string,
): Promise<User> {
  const normalizedUserId = userId.trim().toUpperCase()
  const normalizedEmail = email.trim().toLowerCase()

  const rows = await getAuthSheetValues(SHEET_NAME)

  const rowIndex = rows.slice(1).findIndex(
    (row) =>
      (row[0] ?? '').trim().toUpperCase() === normalizedUserId,
  )

  const row = rowIndex === -1 ? undefined : rows[rowIndex + 1]

  if (!row || !normalizedEmail) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Akun pengguna tidak ditemukan.',
    })
  }

  const updatedUser: User = {
    ...rowToUser(row),
    username_email: normalizedEmail,
    updated_at: new Date().toISOString(),
  }

  await updateAuthSheetRow(
    SHEET_NAME,
    rowIndex + 2,
    userToRow(updatedUser),
  )

  return updatedUser
}
