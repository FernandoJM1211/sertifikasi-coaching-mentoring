
import {
  getPendingApplications,
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
    user.role !== 'VERIFIER'
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak memiliki akses ke antrean verifikasi.',
    })
  }

  const applications =
    await getPendingApplications()

  return {
    success: true,
    data: applications,
  }
})
