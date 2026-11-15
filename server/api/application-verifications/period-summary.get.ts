import { getApplicationVerificationSummaryByPeriod } from '../../services/application-verification-list.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const periodId = getQuery(event).periodId?.toString().trim()

  if (!periodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'periodId wajib diisi.',
    })
  }

  return {
    success: true,
    data: await getApplicationVerificationSummaryByPeriod(periodId),
  }
})
