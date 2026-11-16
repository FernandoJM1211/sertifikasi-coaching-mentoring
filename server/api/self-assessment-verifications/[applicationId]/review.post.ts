import {
  REVIEW_NOTE_MAX_LENGTH,
  SELF_ASSESSMENT_REVIEW_DECISIONS,
  reviewSelfAssessment,
  type SelfAssessmentReviewDecision,
} from '../../../services/self-assessment-verification.service'

function readNote(value: unknown, label: string): string {
  if (value === undefined || value === null) return ''

  if (typeof value !== 'string' || value.length > REVIEW_NOTE_MAX_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} tidak valid (maksimal ${REVIEW_NOTE_MAX_LENGTH} karakter).`,
    })
  }

  return value.trim()
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  const body = await readBody<{ decision?: unknown, cmsp01Note?: unknown, cmsp02Note?: unknown }>(event)

  if (
    typeof body?.decision !== 'string' ||
    !SELF_ASSESSMENT_REVIEW_DECISIONS.includes(body.decision as SelfAssessmentReviewDecision)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Keputusan verifikasi tidak valid.' })
  }

  const result = await reviewSelfAssessment(user, applicationId, {
    decision: body.decision as SelfAssessmentReviewDecision,
    cmsp01Note: readNote(body.cmsp01Note, 'Catatan CMSP-01'),
    cmsp02Note: readNote(body.cmsp02Note, 'Catatan CMSP-02'),
  })

  return {
    success: true,
    message: result.status === 'VERIFIED'
      ? 'Self assessment berhasil diverifikasi.'
      : 'Permintaan perbaikan berhasil dikirim ke peserta.',
    data: result,
  }
})
