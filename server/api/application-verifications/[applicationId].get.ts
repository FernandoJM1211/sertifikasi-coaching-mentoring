import { getApplicationVerificationDetail } from '../../services/application-verification-detail.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return {
    success: true,
    data: await getApplicationVerificationDetail(applicationId),
  }
})
