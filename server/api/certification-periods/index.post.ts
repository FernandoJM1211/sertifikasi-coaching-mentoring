import { createCertificationPeriod } from '../../services/certification-period.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])

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
