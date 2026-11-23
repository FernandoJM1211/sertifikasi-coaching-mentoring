import { submitEvaluation } from '../../../../../services/evaluation-attempt.service'
import { parseAnswersInput } from '../../../../../utils/evaluation-input'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const answers = parseAnswersInput(await readBody(event))

  return { success: true, message: 'Jawaban tes tertulis berhasil dikirim.', data: await submitEvaluation(user, applicationId, answers) }
})
