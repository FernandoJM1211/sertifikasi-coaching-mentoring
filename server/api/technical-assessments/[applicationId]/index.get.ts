import { getTechnicalAssessment } from '../../../services/technical-assessment.service'

/** Detail penilaian CMSP-02 satu peserta beserta evidence CMSP-02-nya. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['TECHNICAL_ASSESSOR', 'SUPER_ADMIN'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return { success: true, data: await getTechnicalAssessment(user, applicationId) }
})
