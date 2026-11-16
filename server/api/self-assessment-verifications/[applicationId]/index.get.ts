import { getSelfAssessmentVerification } from '../../../services/self-assessment-verification.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return {
    success: true,
    data: await getSelfAssessmentVerification(applicationId),
  }
})
