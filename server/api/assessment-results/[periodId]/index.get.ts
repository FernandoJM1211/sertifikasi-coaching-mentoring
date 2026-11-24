import { getPeriodAssessmentResults } from '../../../services/assessment-result.service'

/** Super Admin: rekap tes tertulis + kedua asesor per peserta & status penetapan satu periode. */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  return { success: true, data: await getPeriodAssessmentResults(periodId) }
})
