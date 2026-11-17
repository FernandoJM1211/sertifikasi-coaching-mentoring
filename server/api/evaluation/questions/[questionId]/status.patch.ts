import { setQuestionStatus } from '../../../../services/evaluation-admin.service'
import { parseStatusInput } from '../../../../utils/evaluation-input'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const questionId = requireRouterParam(event, 'questionId', 'ID soal')
  const status = parseStatusInput(await readBody(event))

  return {
    success: true,
    message: status === 'ARCHIVED' ? 'Soal diarsipkan.' : 'Soal diaktifkan kembali.',
    data: await setQuestionStatus(user, questionId, status),
  }
})
