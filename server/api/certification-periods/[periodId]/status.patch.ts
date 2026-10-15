
import {
  updateCertificationPeriodStatus,
} from '../../../services/certification-period.service'

export default defineEventHandler(async (event) => {
  const periodId = getRouterParam(event, 'periodId')?.trim()
  const body = await readBody(event)

  if (!periodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID periode wajib diisi.',
    })
  }

  return await updateCertificationPeriodStatus(
    periodId,
    body?.periodStatus,
  )
})
