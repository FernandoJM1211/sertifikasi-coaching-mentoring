
import { findAllCertificationPeriods } from '../../repositories/certification-period.repository'

export default defineEventHandler(async () => {
  const periods = await findAllCertificationPeriods()

  return {
    success: true,
    data: periods,
  }
})
