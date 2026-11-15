import { updateCertificationPeriodStatus } from '../../../services/certification-period.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

  const periodId = requireRouterParam(event, 'periodId', 'ID periode')
  const body = await readBody<{ periodStatus?: unknown }>(event)

  if (typeof body?.periodStatus !== 'string' || !body.periodStatus) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status periode sertifikasi wajib diisi.',
    })
  }

  return await updateCertificationPeriodStatus(periodId, body.periodStatus)
})
