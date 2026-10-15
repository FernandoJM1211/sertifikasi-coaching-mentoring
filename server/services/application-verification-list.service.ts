import {
  findApplicationsByStatus,
  findApplicationsByPeriod,
} from '../repositories/application.repository'

const PENDING_VERIFICATION_STATUS = 'pending_verification'
const ACCEPTED_STATUS = 'accepted'
const REJECTED_STATUS = 'rejected'

export async function getPendingApplications() {
  // Antrean hanya berisi pengajuan yang belum diputuskan.
  return await findApplicationsByStatus(
    PENDING_VERIFICATION_STATUS,
  )
}

export async function getApplicationVerificationSummary() {
  // Ringkasan global dipertahankan untuk endpoint yang sudah ada.
  const [pending, accepted, rejected] = await Promise.all([
    findApplicationsByStatus(PENDING_VERIFICATION_STATUS),
    findApplicationsByStatus(ACCEPTED_STATUS),
    findApplicationsByStatus(REJECTED_STATUS),
  ])

  return {
    pendingVerification: pending.length,
    accepted: accepted.length,
    rejected: rejected.length,
  }
}

export async function getApplicationVerificationSummaryByPeriod(
  periodId: string,
) {
  // Ambil seluruh pengajuan pada periode terpilih,
  // lalu hitung setiap status dari data aktual.
  const applications = await findApplicationsByPeriod(periodId)

  return {
    total: applications.length,
    pendingVerification: applications.filter(
      (application) =>
        application.application_status === PENDING_VERIFICATION_STATUS,
    ).length,
    accepted: applications.filter(
      (application) =>
        application.application_status === ACCEPTED_STATUS,
    ).length,
    rejected: applications.filter(
      (application) =>
        application.application_status === REJECTED_STATUS,
    ).length,
  }
}