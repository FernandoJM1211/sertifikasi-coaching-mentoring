import { reopenPublicAssessment } from '../../../services/public-assessment.service'

/** Super Admin: membuka kunci penilaian CMSP-03 yang sudah dikirim agar dapat diperbaiki asesor. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return { success: true, message: 'Kunci penilaian dibuka.', data: await reopenPublicAssessment(user, applicationId) }
})
