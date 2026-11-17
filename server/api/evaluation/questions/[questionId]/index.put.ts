import { updateQuestion } from '../../../../services/evaluation-admin.service'
import { parseQuestionInput } from '../../../../utils/evaluation-input'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const questionId = requireRouterParam(event, 'questionId', 'ID soal')
  const input = parseQuestionInput(await readBody(event))

  return { success: true, message: 'Soal berhasil diperbarui.', data: await updateQuestion(user, questionId, input) }
})
