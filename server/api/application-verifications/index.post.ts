
import {
  createApplicationVerificationService,
} from '../../services/application-verification.service'

import {
  getAuthenticatedUser,
} from '../../services/auth.service'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(
    event,
    SESSION_COOKIE_NAME,
  )

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const user = await getAuthenticatedUser(sessionToken)

  if (
  user.account_status !== 'ACTIVE' ||
  !['VERIFIER', 'SUPER_ADMIN'].includes(user.role)
) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Anda tidak memiliki hak akses untuk memverifikasi pengajuan.',
  })
}

  const body = await readBody(event)

  const verification =
    await createApplicationVerificationService({
      applicationId: body.applicationId,
      verifiedBy: user.user_id,
      verificationStatus: body.verificationStatus,
      verifiedAt: body.verifiedAt,
    })

  return {
    success: true,
    message: 'Verifikasi application berhasil dibuat.',
    data: verification,
  }
})
