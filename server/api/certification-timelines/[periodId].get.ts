
import {
  findCertificationTimelinesByPeriodId,
} from '../../repositories/certification-timeline.repository'

import {
  findCertificationPeriodById,
} from '../../repositories/certification-period.repository'

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
  !['VERIFIER', 'SUPER_ADMIN'].includes(user.role)
) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Anda tidak memiliki akses ke fitur timeline sertifikasi.',
  })
}

  const periodId = getRouterParam(event, 'periodId')?.trim()

  if (!periodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'periodId wajib diisi.',
    })
  }

  const period = await findCertificationPeriodById(periodId)

  if (!period) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Periode sertifikasi tidak ditemukan.',
    })
  }

  const timelines =
    await findCertificationTimelinesByPeriodId(periodId)

  // Urutkan tahap berdasarkan urutan bisnis yang telah ditetapkan.
  timelines.sort(
    (a, b) => Number(a.stage_order) - Number(b.stage_order),
  )

  return {
    success: true,
    data: {
      period,
      timelines,
    },
  }
})
