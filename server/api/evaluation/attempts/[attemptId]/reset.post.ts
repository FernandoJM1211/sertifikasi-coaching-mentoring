import { resetAttempt } from '../../../../services/evaluation-admin.service'

/** Super Admin: reset progres evaluasi satu peserta (pengerjaan ditandai RESET). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const attemptId = requireRouterParam(event, 'attemptId', 'ID pengerjaan')

  return { success: true, message: 'Progres evaluasi peserta berhasil direset.', data: await resetAttempt(user, attemptId) }
})
