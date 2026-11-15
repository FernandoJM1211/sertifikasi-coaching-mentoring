import { saveSelfAssessmentDraft } from '../../../../../services/self-assessment.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  assertRateLimit(`self-assessment:save:${user.user_id}`, 60, 15 * 60 * 1000)

  const body = await readBody(event)

  return {
    success: true,
    message: 'Draft CMSP-01 dan CMSP-02 berhasil disimpan.',
    data: await saveSelfAssessmentDraft(user, applicationId, body),
  }
})
