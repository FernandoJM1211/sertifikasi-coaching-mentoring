import {
  MAX_BULK_ASSIGN,
  MAX_CHANGE_REASON_LENGTH,
  assignAssessors,
} from '../../../../services/assessor-assignment.service'

function optionalId(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined

  if (typeof value !== 'string' || value.length > 50) {
    throw createError({ statusCode: 400, statusMessage: `${label} tidak valid.` })
  }

  return value.trim() || undefined
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  const body = await readBody<{
    applicationIds?: unknown
    technicalAssessorId?: unknown
    publicAssessorId?: unknown
    reason?: unknown
  }>(event)

  const reason = body?.reason ?? ''

  if (typeof reason !== 'string' || reason.length > MAX_CHANGE_REASON_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Alasan pergantian maksimal ${MAX_CHANGE_REASON_LENGTH} karakter.`,
    })
  }

  const applicationIds = body?.applicationIds

  if (
    !Array.isArray(applicationIds) ||
    applicationIds.length === 0 ||
    applicationIds.length > MAX_BULK_ASSIGN ||
    applicationIds.some((id) => typeof id !== 'string' || !id.trim() || id.length > 50)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih minimal satu peserta.' })
  }

  const result = await assignAssessors(user, periodId, {
    applicationIds: (applicationIds as string[]).map((id) => id.trim()),
    technicalAssessorId: optionalId(body?.technicalAssessorId, 'Asesor Teknis'),
    publicAssessorId: optionalId(body?.publicAssessorId, 'Asesor Kepublikan'),
    reason: reason.trim(),
  })

  return {
    success: true,
    message: `Penugasan asesor untuk ${result.count} peserta berhasil disimpan.`,
    data: result,
  }
})
