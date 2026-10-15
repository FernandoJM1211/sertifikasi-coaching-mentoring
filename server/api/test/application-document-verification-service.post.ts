import {
  createApplicationDocumentVerificationService,
} from '../../services/application-document-verification.service'

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event)

    const verification =
      await createApplicationDocumentVerificationService({
        applicationDocumentId:
          body.applicationDocumentId,

        verifiedBy:
          body.verifiedBy,

        verificationStatus:
          body.verificationStatus,

        verificationNote:
          body.verificationNote,

        verifiedAt:
          body.verifiedAt,
      })

    return {
      success: true,
      message:
        'Verifikasi dokumen application berhasil dibuat melalui service.',
      data: verification,
    }
  },
)