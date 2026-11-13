
import {
  findApplicationsByPeriod,
} from '../../../repositories/application.repository'

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
  !['VERIFIER', 'SUPER_ADMIN'].includes(user.role)
) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Anda tidak memiliki akses ke daftar pengajuan sertifikasi.',
  })
}

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
