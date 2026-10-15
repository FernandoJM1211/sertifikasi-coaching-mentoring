
import { findApplicationsByPeriod } from '../../../repositories/application.repository'

export default defineEventHandler(async (event) => {
  const periodId = getRouterParam(event, 'periodId')?.trim()

  if (!periodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'periodId wajib diisi.',
    })
  }

  const applications = await findApplicationsByPeriod(periodId)

  return {
    success: true,
    data: applications,
  }
})
