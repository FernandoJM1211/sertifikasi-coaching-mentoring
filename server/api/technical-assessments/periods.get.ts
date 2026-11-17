import { listAssessorPeriods } from '../../services/technical-assessment.service'

/** Asesor Teknis: periode yang memiliki peserta yang ditugaskan kepadanya. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['TECHNICAL_ASSESSOR'])

  return { success: true, data: await listAssessorPeriods(user) }
})
