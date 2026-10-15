
import {
  getApplicationVerificationSummary,
} from '../../services/application-verification-list.service'

export default defineEventHandler(async () => {
  const summary = await getApplicationVerificationSummary()

  return {
    success: true,
    data: summary,
  }
})
