import { createApplicationVerificationService } from '../../services/application-verification.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const body = await readBody<{
    applicationId?: unknown
    verificationStatus?: unknown
  }>(event)

  if (
    typeof body?.applicationId !== 'string' ||
    typeof body?.verificationStatus !== 'string'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data verifikasi tidak valid.',
    })
  }

  const verification = await createApplicationVerificationService({
    applicationId: body.applicationId,
    verifiedBy: user.user_id,
    verificationStatus: body.verificationStatus,
  })

  return {
    success: true,
    message: 'Verifikasi pengajuan berhasil disimpan.',
    data: verification,
  }
})
