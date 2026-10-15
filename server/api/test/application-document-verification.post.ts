import {
  createApplicationDocumentVerification,
} from '../../repositories/application-document-verification.repository'

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event)

    const verification =
      await createApplicationDocumentVerification({
        application_document_id:
          body.applicationDocumentId,

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
        'Verifikasi dokumen application berhasil dibuat.',
      data: verification,
    }
  },
)