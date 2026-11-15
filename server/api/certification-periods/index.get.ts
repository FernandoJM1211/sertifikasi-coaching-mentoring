import { findAllCertificationPeriods } from '../../repositories/certification-period.repository'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  return {
    success: true,
    data: await findAllCertificationPeriods(),
  }
})
