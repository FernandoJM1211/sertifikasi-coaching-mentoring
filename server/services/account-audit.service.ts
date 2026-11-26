import { findAuditLogsByTarget } from '../repositories/audit-log.repository'
import { findAllUsers } from '../repositories/user.repository'
import { auditActionLabel } from '../../shared/utils/audit'

export type AccountHistoryItem = {
  audit_id: string
  event_time: string
  action: string
  action_label: string
  actor_name: string
  actor_is_self: boolean
  details: string
}

/** Riwayat tindakan atas satu akun untuk halaman detail akun Super Admin (docs/08 K-30). */
export async function getAccountHistory(userId: string): Promise<AccountHistoryItem[]> {
  const logs = await findAuditLogsByTarget(userId)
  if (logs.length === 0) return []

  const users = await findAllUsers()
  const nameById = new Map(users.map((user) => [user.user_id.toUpperCase(), user.full_name]))
  const target = userId.trim().toUpperCase()

  return logs.map((log) => ({
    audit_id: log.audit_id,
    event_time: log.event_time,
    action: log.action,
    action_label: auditActionLabel(log.action),
    actor_name: nameById.get(log.actor_user_id) || log.actor_user_id || 'Sistem',
    actor_is_self: log.actor_user_id === target,
    details: log.details,
  }))
}
