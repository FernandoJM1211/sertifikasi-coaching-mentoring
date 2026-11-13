import {
  createCertificationTimeline,
} from '../../services/certification-timeline.service'
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
      statusMessage: 'Anda tidak memiliki akses untuk mengatur timeline sertifikasi.',
    })
  }

  const body = await readBody(event)

  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data timeline sertifikasi tidak valid.',
    })
  }

  return await createCertificationTimeline({
    periodId: body.periodId,
    stages: body.stages,
  })
})