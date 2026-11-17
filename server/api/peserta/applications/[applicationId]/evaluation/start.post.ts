import { startEvaluation } from '../../../../../services/evaluation-attempt.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  return { success: true, message: 'Evaluasi dimulai.', data: await startEvaluation(user, applicationId) }
})
