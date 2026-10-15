import {
  createApplicationVerification,
} from '../../repositories/application-verification.repository'

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event)

    const verification =
      await createApplicationVerification({
        application_id:
          body.applicationId,

        verified_by:
          body.verifiedBy,

        verification_status:
          body.verificationStatus,

        verification_note:
          body.verificationNote,

        verified_at:
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