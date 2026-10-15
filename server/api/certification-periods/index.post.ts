import {
  createCertificationPeriod,
} from '../../services/certification-period.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return await createCertificationPeriod({
    certificationTypeId:
      body.certificationTypeId,

    categoryId:
      body.categoryId,

    periodName:
      body.periodName,

    periodStatus:
      body.periodStatus,

    createdBy:
      body.createdBy,
  })
})