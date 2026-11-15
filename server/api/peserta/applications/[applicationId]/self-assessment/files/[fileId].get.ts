import { sendSelfAssessmentFile } from '../../../../../../services/self-assessment.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const fileId = requireRouterParam(event, 'fileId', 'ID berkas')

  return sendSelfAssessmentFile(event, user, applicationId, fileId)
})
