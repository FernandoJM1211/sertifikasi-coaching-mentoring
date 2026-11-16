import { listSelfAssessmentVerifications } from '../../../services/self-assessment-verification.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  return {
    success: true,
    data: await listSelfAssessmentVerifications(periodId),
  }
})
