import { listTechnicalAssessments } from '../../../services/technical-assessment.service'

/** Daftar penilaian CMSP-02 per periode (Asesor Teknis: miliknya; Super Admin: semua). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['TECHNICAL_ASSESSOR', 'SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  return { success: true, data: await listTechnicalAssessments(user, periodId) }
})
