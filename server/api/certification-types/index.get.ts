
import {
  findAllCertificationTypes,
} from '../../repositories/certification-type.repository'

export default defineEventHandler(async () => {
  const certificationTypes =
    await findAllCertificationTypes()

  return {
    success: true,
    data: certificationTypes,
  }
})
