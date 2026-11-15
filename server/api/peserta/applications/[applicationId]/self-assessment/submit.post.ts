import { submitSelfAssessment } from '../../../../../services/self-assessment.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return {
    success: true,
    message: 'Self assessment berhasil dikirim untuk diverifikasi.',
    data: await submitSelfAssessment(user, applicationId),
  }
})
