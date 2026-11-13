import {
  createCertificationPeriod,
} from '../../services/certification-period.service'
import {
  getAuthenticatedUser,
} from '../../services/auth.service'

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
    user.role !== 'SUPER_ADMIN'
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak memiliki akses untuk membuat periode sertifikasi.',
    })
  }

  const body = await readBody(event)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data periode sertifikasi tidak valid.',
    })
  }

  return await createCertificationPeriod({
    certificationTypeId: body.certificationTypeId,
    categoryId: body.categoryId,
    periodName: body.periodName,
    periodStatus: 'DRAFT',
    createdBy: user.user_id,
  })
})