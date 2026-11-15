import { createCertificationTimeline } from '../../services/certification-timeline.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

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
