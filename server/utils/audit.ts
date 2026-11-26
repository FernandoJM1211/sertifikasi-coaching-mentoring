import type { H3Event } from 'h3'
import { appendAuditLog } from '../repositories/audit-log.repository'
import { AUDIT_DETAILS_MAX, type AuditAction } from '../../shared/utils/audit'

/**
 * Mencatat tindakan akun ke `audit_logs` (docs/08 K-30). Dipanggil SETELAH tindakan berhasil.
 * Best effort: gagal mencatat hanya ditulis ke log server, tindakan tetap dianggap berhasil.
 * `details` berisi ringkasan yang aman dibaca admin — JANGAN memasukkan kata sandi atau token.
 */
export async function recordAccountAudit(
  event: H3Event,
  entry: {
    actorUserId: string
    action: AuditAction
    targetUserId: string
    details?: string
  },
): Promise<void> {
  try {
    await appendAuditLog({
      event_time: new Date().toISOString(),
      actor_user_id: entry.actorUserId.trim().toUpperCase(),
      action: entry.action,
      target_type: 'USER',
      target_id: entry.targetUserId.trim().toUpperCase(),
      result: 'SUCCESS',
      ip_address: getClientIp(event).slice(0, 64),
      request_id: '',
      details: (entry.details ?? '').slice(0, AUDIT_DETAILS_MAX),
    })
  } catch (error) {
    console.error(`Gagal mencatat audit ${entry.action} untuk ${entry.targetUserId}:`, error)
  }
}
