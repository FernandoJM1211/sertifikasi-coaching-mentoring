import {
  createApplicationVerificationService,
} from '../../services/application-verification.service'

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event)

    const verification =
      await createApplicationVerificationService({
        applicationId:
          body.applicationId,

        verifiedBy:
          body.verifiedBy,

        verificationStatus:
          body.verificationStatus,

        verifiedAt:
          body.verifiedAt,
      })

    return {
      success: true,
      message:
        'Verifikasi application berhasil dibuat.',
      data: verification,
    }
  },
)