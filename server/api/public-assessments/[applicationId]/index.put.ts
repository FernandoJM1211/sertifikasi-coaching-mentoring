import { savePublicAssessment } from '../../../services/public-assessment.service'
import { parsePublicAssessmentInput } from '../../../utils/technical-assessment-input'

/** Asesor Kepublikan yang ditugaskan / Super Admin: simpan draf (`submit: false`) atau kirim final (`submit: true`). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PUBLIC_ASSESSOR', 'SUPER_ADMIN'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const input = parsePublicAssessmentInput(await readBody(event))
  const data = await savePublicAssessment(user, applicationId, input)

  return {
    success: true,
    message: input.submit ? 'Penilaian berhasil dikirim.' : 'Draf penilaian tersimpan.',
    data,
  }
})
