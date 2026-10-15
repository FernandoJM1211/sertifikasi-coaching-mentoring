import {
  getApplicationVerificationSummaryByPeriod,
} from '../../services/application-verification-list.service'

export default defineEventHandler(async (event) => {
  const periodId = getQuery(event).periodId?.toString().trim()

  if (!periodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'periodId wajib diisi.',
    })
  }

  const summary =
    await getApplicationVerificationSummaryByPeriod(periodId)

  return {
    success: true,
    data: summary,
  }
})