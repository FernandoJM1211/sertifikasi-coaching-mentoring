import { findAssignmentsByTechnicalAssessor } from '../repositories/assessor-assignment.repository'
import { findAllCertificationPeriods } from '../repositories/certification-period.repository'
import { findAllCertificationTimelines } from '../repositories/certification-timeline.repository'
import type { AuthenticatedUser } from './auth.service'

/**
 * Beranda staf (Super Admin, Verifikator, Asesor): periode AKTIF beserta timeline-nya.
 * - Super Admin & Verifikator: semua periode aktif.
 * - Asesor Teknis: hanya periode aktif yang memiliki peserta yang ditugaskan kepadanya.
 */
export async function listHomePeriods(user: AuthenticatedUser) {
  const [periods, timelines, assignments] = await Promise.all([
    findAllCertificationPeriods(),
    findAllCertificationTimelines(),
    user.role === 'TECHNICAL_ASSESSOR' ? findAssignmentsByTechnicalAssessor(user.user_id) : Promise.resolve(null),
  ])

  const assignedPeriodIds = assignments ? new Set(assignments.map((item) => item.period_id)) : null

  return periods
    .filter((period) => period.period_status.trim().toUpperCase() === 'ACTIVE')
    .filter((period) => !assignedPeriodIds || assignedPeriodIds.has(period.period_id))
    .map((period) => ({
      period_id: period.period_id,
      period_name: period.period_name,
      timelines: timelines
        .filter((item) => item.period_id === period.period_id)
        .sort((a, b) => Number(a.stage_order) - Number(b.stage_order))
        .map((item) => ({
          stage_order: item.stage_order,
          stage_code: item.stage_code,
          stage_name: item.stage_name,
          start_at: item.start_at,
          end_at: item.end_at,
        })),
    }))
}
