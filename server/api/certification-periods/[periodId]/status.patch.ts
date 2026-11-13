import {
  updateCertificationPeriodStatus,
} from '../../../services/certification-period.service'

import {
  getAuthenticatedUser,
} from '../../../services/auth.service'

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
      statusMessage: 'Anda tidak memiliki akses untuk mengubah status periode sertifikasi.',
    })
  }

  const periodId = getRouterParam(event, 'periodId')?.trim()
  const body = await readBody(event)

  if (!periodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID periode wajib diisi.',
    })
  }

  if (!body || typeof body !== 'object' || !body.periodStatus) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status periode sertifikasi wajib diisi.',
    })
  }

  return await updateCertificationPeriodStatus(
    periodId,
    body.periodStatus,
  )
})