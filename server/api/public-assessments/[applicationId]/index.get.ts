import { getPublicAssessment } from '../../../services/public-assessment.service'

/** Detail penilaian CMSP-03 satu peserta. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PUBLIC_ASSESSOR', 'SUPER_ADMIN'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return { success: true, data: await getPublicAssessment(user, applicationId) }
})
