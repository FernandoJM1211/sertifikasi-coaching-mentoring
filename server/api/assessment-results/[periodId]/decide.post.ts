import { decidePeriodAssessmentResults } from '../../../services/assessment-result.service'

/** Super Admin: tetapkan hasil asesmen seluruh peserta satu periode. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  const data = await decidePeriodAssessmentResults(user, periodId)

  return {
    success: true,
    message: `Hasil asesmen ${data.total} peserta berhasil ditetapkan: ${data.passed} lulus, ${data.remedial} remedial${data.withdrawn ? `, ${data.withdrawn} tidak melanjutkan` : ''}.`,
    data,
  }
})
