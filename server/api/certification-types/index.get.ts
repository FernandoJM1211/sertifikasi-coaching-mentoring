import { findAllCertificationTypes } from '../../repositories/certification-type.repository'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  return {
    success: true,
    data: await findAllCertificationTypes(),
  }
})
