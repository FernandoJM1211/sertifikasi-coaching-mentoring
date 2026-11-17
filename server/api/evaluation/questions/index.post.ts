import { createQuestion } from '../../../services/evaluation-admin.service'
import { parseQuestionInput } from '../../../utils/evaluation-input'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const input = parseQuestionInput(await readBody(event))

  return { success: true, message: 'Soal berhasil ditambahkan.', data: await createQuestion(user, input) }
})
