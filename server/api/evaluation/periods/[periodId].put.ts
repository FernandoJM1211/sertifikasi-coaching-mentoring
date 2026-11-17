import { savePeriodEvaluation } from '../../../services/evaluation-admin.service'
import { parsePeriodEvaluationInput } from '../../../utils/evaluation-input'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')
  const input = parsePeriodEvaluationInput(await readBody(event))

  return { success: true, message: 'Pengaturan evaluasi berhasil disimpan dan diterapkan.', data: await savePeriodEvaluation(user, periodId, input) }
})
