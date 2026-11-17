import { reopenTechnicalAssessment } from '../../../services/technical-assessment.service'

/** Super Admin: membuka kunci penilaian yang sudah dikirim agar dapat diperbaiki asesor. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return { success: true, message: 'Kunci penilaian dibuka.', data: await reopenTechnicalAssessment(user, applicationId) }
})
