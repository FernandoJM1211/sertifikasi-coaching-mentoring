import { getPendingApplications } from '../../services/application-verification-list.service'

export default defineEventHandler(async () => {
  // Endpoint ini khusus menyediakan antrean Application
  // yang masih menunggu pemeriksaan Verifikator.
  const applications =
    await getPendingApplications()

  return {
    success: true,
    data: applications,
  }
})