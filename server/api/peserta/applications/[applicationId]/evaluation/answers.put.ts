import { saveEvaluationAnswers } from '../../../../../services/evaluation-attempt.service'
import { parseAnswersInput } from '../../../../../utils/evaluation-input'

/** Autosave jawaban: seluruh jawaban dikirim sekaligus (huruf yang ditampilkan). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const answers = parseAnswersInput(await readBody(event))

  return { success: true, data: await saveEvaluationAnswers(user, applicationId, answers) }
})
