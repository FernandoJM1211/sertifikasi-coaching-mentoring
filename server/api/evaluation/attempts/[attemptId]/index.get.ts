import { getAttemptDetail } from '../../../../services/evaluation-admin.service'

/** Super Admin: detail hasil tes tertulis satu pengerjaan (soal, jawaban, kunci, benar/salah). */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])
  const attemptId = requireRouterParam(event, 'attemptId', 'ID pengerjaan')

  return { success: true, data: await getAttemptDetail(attemptId) }
})
