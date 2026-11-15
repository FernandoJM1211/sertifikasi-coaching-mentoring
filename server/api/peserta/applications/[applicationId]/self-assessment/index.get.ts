import { getSelfAssessment } from '../../../../../services/self-assessment.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return {
    success: true,
    data: await getSelfAssessment(user, applicationId),
  }
})
