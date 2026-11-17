import { saveTechnicalAssessment } from '../../../services/technical-assessment.service'
import { parseTechnicalAssessmentInput } from '../../../utils/technical-assessment-input'

/** Asesor Teknis yang ditugaskan / Super Admin: simpan draf (`submit: false`) atau kirim final (`submit: true`). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['TECHNICAL_ASSESSOR', 'SUPER_ADMIN'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const input = parseTechnicalAssessmentInput(await readBody(event))
  const data = await saveTechnicalAssessment(user, applicationId, input)

  return {
    success: true,
    message: input.submit ? 'Penilaian berhasil dikirim.' : 'Draf penilaian tersimpan.',
    data,
  }
})
