
import {
  getAuthenticatedUser,
} from '../../services/auth.service'
import {
  findAllCertificationPeriods,
} from '../../repositories/certification-period.repository'
import {
  hashAuthToken,
} from '../../utils/auth-token'
import {
  findSessionByTokenHash,
} from '../../repositories/session.repository'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, SESSION_COOKIE_NAME)

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
    statusMessage: 'Anda tidak memiliki akses ke fitur ini.',
  })
}

  // Pastikan token sesi memang terdaftar dan masih berlaku.
  const session = await findSessionByTokenHash(
    hashAuthToken(sessionToken),
  )

  if (
    !session ||
    session.revoked_at ||
    Date.parse(session.expires_at) <= Date.now()
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi login sudah tidak berlaku.',
    })
  }

  const periods = await findAllCertificationPeriods()

  return {
    success: true,
    data: periods,
  }
})
