import { createQuestions } from '../../../services/evaluation-admin.service'
import { parseQuestionInput, type QuestionInput } from '../../../utils/evaluation-input'
import { QUESTION_IMPORT_MAX_ROWS } from '../../../../shared/utils/evaluation-import'

/**
 * Import soal hasil baca Excel di browser.
 * Body: { questions: { topic, questionText, options, correctOption }[] } (1–200 soal).
 * Setiap soal divalidasi ulang dengan aturan yang sama seperti form Tambah Soal;
 * bila ada yang tidak valid, tidak ada soal yang disimpan.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const body = await readBody<{ questions?: unknown }>(event)

  const list = body?.questions
  if (!Array.isArray(list) || list.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada soal untuk diimpor.' })
  }
  if (list.length > QUESTION_IMPORT_MAX_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Maksimal ${QUESTION_IMPORT_MAX_ROWS} soal per import.`,
    })
  }

  const inputs: QuestionInput[] = list.map((item, index) => {
    try {
      return parseQuestionInput(item)
    } catch (error) {
      const message = (error as { statusMessage?: string }).statusMessage || 'Data tidak valid.'
      throw createError({ statusCode: 400, statusMessage: `Soal ke-${index + 1}: ${message}` })
    }
  })

  const count = await createQuestions(user, inputs)

  return { success: true, message: `${count} soal berhasil diimpor.`, data: { count } }
})
