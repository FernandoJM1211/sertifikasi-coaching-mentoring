import { getPeriodEvaluationPlan } from '../../../services/evaluation-admin.service'

/** Pengaturan tes tertulis periode + nilai peserta (hanya Super Admin). */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')
  return { success: true, data: await getPeriodEvaluationPlan(periodId) }
})
