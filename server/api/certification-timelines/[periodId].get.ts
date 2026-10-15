import {
  findCertificationTimelinesByPeriodId,
} from '../../repositories/certification-timeline.repository'

import {
  findCertificationPeriodById,
} from '../../repositories/certification-period.repository'

export default defineEventHandler(async (event) => {
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