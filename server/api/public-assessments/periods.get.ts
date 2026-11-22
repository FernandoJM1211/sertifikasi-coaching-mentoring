import { listPublicAssessorPeriods } from '../../services/public-assessment.service'

/** Asesor Kepublikan: periode yang memiliki peserta yang ditugaskan kepadanya. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PUBLIC_ASSESSOR'])

  return { success: true, data: await listPublicAssessorPeriods(user) }
})
