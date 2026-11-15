/**
 * Konstanta role dan status akun yang dipakai bersama
 * oleh frontend (app/) dan backend (server/).
 *
 * Nilai role disimpan apa adanya di kolom `role` pada sheet `users`.
 */

export const USER_ROLES = [
  'SUPER_ADMIN',
  'VERIFIKATOR',
  'TECHNICAL_ASSESSOR',
  'PUBLIC_ASSESSOR',
  'PESERTA',
] as const

export type UserRole = (typeof USER_ROLES)[number]

/** Role pegawai/petugas yang akunnya dibuat oleh Super Admin. */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'VERIFIKATOR',
  'TECHNICAL_ASSESSOR',
  'PUBLIC_ASSESSOR',
] as const satisfies readonly UserRole[]

export type StaffRole = (typeof STAFF_ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  VERIFIKATOR: 'Verifikator',
  TECHNICAL_ASSESSOR: 'Asesor Teknis',
  PUBLIC_ASSESSOR: 'Asesor Kepublikan',
  PESERTA: 'Peserta',
}

/**
 * Halaman utama setiap role setelah login.
 * Role yang belum memiliki halaman diarahkan ke beranda.
 */
export const ROLE_HOME_PATHS: Partial<Record<UserRole, string>> = {
  SUPER_ADMIN: '/super-admin',
  VERIFIKATOR: '/verifikator/periods',
  PESERTA: '/peserta',
}

export const ACCOUNT_STATUSES = [
  'PENDING_ACTIVATION',
  'ACTIVE',
  'SUSPENDED',
  'DISABLED',
] as const

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING_ACTIVATION: 'Menunggu Aktivasi',
  ACTIVE: 'Aktif',
  SUSPENDED: 'Ditangguhkan',
  DISABLED: 'Dinonaktifkan',
}

/**
 * Nilai role lama yang mungkin masih tersimpan di sheet `users`
 * sebelum penggantian nama role. Dibaca sebagai role baru agar akun
 * lama tetap bisa login; baris akan tersimpan dengan nilai baru
 * saat akun tersebut diperbarui.
 */
const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  VERIFIER: 'VERIFIKATOR',
  PARTICIPANT: 'PESERTA',
}

export function normalizeUserRole(value: string): UserRole | '' {
  const role = value.trim().toUpperCase()

  if ((USER_ROLES as readonly string[]).includes(role)) {
    return role as UserRole
  }

  return LEGACY_ROLE_ALIASES[role] ?? ''
}

export function getRoleLabel(role: string | null | undefined): string {
  const normalized = normalizeUserRole(role ?? '')
  return normalized ? ROLE_LABELS[normalized] : (role || 'Pengguna')
}

export function getAccountStatusLabel(
  status: string | null | undefined,
): string {
  return (
    ACCOUNT_STATUS_LABELS[status as AccountStatus] ??
    (status || 'Tidak diketahui')
  )
}
