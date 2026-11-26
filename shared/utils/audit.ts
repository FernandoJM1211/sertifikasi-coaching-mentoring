/**
 * Jenis tindakan akun yang dicatat di sheet `audit_logs` (spreadsheet Auth) — docs/08 K-30.
 * Kata sandi dan token TIDAK PERNAH dicatat.
 */
export const AUDIT_ACTIONS = [
  'ACCOUNT_CREATE',
  'ACCOUNT_PASSWORD_RESET_BY_ADMIN',
  'ACCOUNT_STATUS_CHANGE',
  'ACCOUNT_EMAIL_CHANGE',
  'ACCOUNT_ACTIVATION_RESEND',
  'ACCOUNT_ACTIVATE',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET_BY_EMAIL',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  ACCOUNT_CREATE: 'Akun dibuat',
  ACCOUNT_PASSWORD_RESET_BY_ADMIN: 'Kata sandi diatur ulang admin',
  ACCOUNT_STATUS_CHANGE: 'Status akun diubah',
  ACCOUNT_EMAIL_CHANGE: 'Email akun diubah',
  ACCOUNT_ACTIVATION_RESEND: 'Tautan aktivasi dikirim ulang',
  ACCOUNT_ACTIVATE: 'Akun diaktifkan',
  PASSWORD_CHANGE: 'Kata sandi diganti',
  PASSWORD_RESET_BY_EMAIL: 'Kata sandi diatur ulang lewat email',
}

export const auditActionLabel = (action: string) =>
  AUDIT_ACTION_LABELS[action as AuditAction] ?? action

/** Batas panjang kolom `details` (teks ringkas, bukan data rahasia). */
export const AUDIT_DETAILS_MAX = 500
