
import {
  getApplicationVerificationSummaryByPeriod,
} from '../../services/application-verification-list.service'

import {
  getAuthenticatedUser,
} from '../../services/auth.service'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(
    event,
    SESSION_COOKIE_NAME,
  )

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const user = await getAuthenticatedUser(sessionToken)

  if (
  user.account_status !== 'ACTIVE' ||
  !['VERIFIER', 'SUPER_ADMIN'].includes(user.role)
) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Anda tidak memiliki akses ke ringkasan verifikasi.',
  })
}

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
