import { listPublicAssessments } from '../../../services/public-assessment.service'

/** Daftar penilaian CMSP-03 per periode (Asesor Kepublikan: miliknya; Super Admin: semua). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PUBLIC_ASSESSOR', 'SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  return { success: true, data: await listPublicAssessments(user, periodId) }
})
