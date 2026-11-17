import { getPesertaEvaluation } from '../../../../../services/evaluation-attempt.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  return { success: true, data: await getPesertaEvaluation(user, applicationId) }
})
