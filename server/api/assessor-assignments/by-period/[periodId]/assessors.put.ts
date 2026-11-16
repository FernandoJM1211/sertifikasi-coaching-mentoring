import {
  ASSESSOR_ROLES,
  MAX_PERIOD_ASSESSORS,
  updatePeriodAssessors,
} from '../../../../services/assessor-assignment.service'
import type { AssessorRole } from '../../../../repositories/assessor-assignment.repository'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  const body = await readBody<{ role?: unknown, userIds?: unknown }>(event)

  if (typeof body?.role !== 'string' || !ASSESSOR_ROLES.includes(body.role as AssessorRole)) {
    throw createError({ statusCode: 400, statusMessage: 'Jenis asesor tidak valid.' })
  }

  const userIds = body.userIds

  if (
    !Array.isArray(userIds) ||
    userIds.length > MAX_PERIOD_ASSESSORS ||
    userIds.some((id) => typeof id !== 'string' || !id.trim() || id.length > 50)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Daftar asesor tidak valid.' })
  }

  const result = await updatePeriodAssessors(
    user,
    periodId,
    body.role as AssessorRole,
    (userIds as string[]).map((id) => id.trim()),
  )

  return {
    success: true,
    message: 'Asesor periode berhasil diperbarui.',
    data: result,
  }
})
