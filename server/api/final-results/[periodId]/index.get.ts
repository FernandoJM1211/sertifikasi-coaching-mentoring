import { getPeriodFinalResults } from '../../../services/final-result.service'

/** Verifikator / Super Admin: Hasil Akhir satu periode (lulus, remedial, tidak lulus). */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  return { success: true, data: await getPeriodFinalResults(periodId) }
})
