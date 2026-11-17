import { sendTechnicalAssessmentFile } from '../../../../services/technical-assessment.service'

/** Pratinjau berkas evidence CMSP-02 untuk Asesor Teknis yang ditugaskan / Super Admin. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['TECHNICAL_ASSESSOR', 'SUPER_ADMIN'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const fileId = requireRouterParam(event, 'fileId', 'ID berkas')

  return sendTechnicalAssessmentFile(event, user, applicationId, fileId)
})
