import { sendSelfAssessmentVerificationFile } from '../../../../services/self-assessment-verification.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const fileId = requireRouterParam(event, 'fileId', 'ID berkas')

  return sendSelfAssessmentVerificationFile(event, applicationId, fileId)
})
