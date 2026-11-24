import { cancelPeriodAssessmentResults } from '../../../services/assessment-result.service'

/** Super Admin: batalkan penetapan hasil asesmen satu periode (selama tahap masih dibuka). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  const data = await cancelPeriodAssessmentResults(user, periodId)

  return { success: true, message: 'Penetapan hasil asesmen dibatalkan.', data }
})
