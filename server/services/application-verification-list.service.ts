import { findApplicationsByPeriod } from '../repositories/application.repository'

const PENDING_VERIFICATION_STATUS = 'pending_verification'
const ACCEPTED_STATUS = 'accepted'
const REJECTED_STATUS = 'rejected'

/**
 * Ringkasan jumlah pengajuan per status pada satu periode.
 */
export async function getApplicationVerificationSummaryByPeriod(
  periodId: string,
) {
  const applications = await findApplicationsByPeriod(periodId)

  const countByStatus = (status: string) =>
    applications.filter(
      (application) => application.application_status === status,
    ).length

  return {
    total: applications.length,
    pendingVerification: countByStatus(PENDING_VERIFICATION_STATUS),
    accepted: countByStatus(ACCEPTED_STATUS),
    rejected: countByStatus(REJECTED_STATUS),
  }
}
