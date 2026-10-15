import {
  createApplicationDocumentVerification,
  type ApplicationDocumentVerification,
  type CreateApplicationDocumentVerificationInput,
} from '../repositories/application-document-verification.repository'

import {
  findApplicationDocumentById,
} from '../repositories/application-document.repository'

export type CreateApplicationDocumentVerificationServiceInput = {
  applicationDocumentId: string
  verifiedBy: string
  verificationStatus: string
  verificationNote?: string
  verifiedAt?: string
}

export async function createApplicationDocumentVerificationService(
  input: CreateApplicationDocumentVerificationServiceInput,
): Promise<ApplicationDocumentVerification> {
  const applicationDocumentId =
    input.applicationDocumentId?.trim() ?? ''

  const verifiedBy =
    input.verifiedBy?.trim() ?? ''

  const verificationStatus =
    input.verificationStatus?.trim().toUpperCase() ?? ''

  const verificationNote =
    input.verificationNote?.trim() ?? ''

  if (!applicationDocumentId) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'applicationDocumentId wajib diisi.',
    })
  }

  if (!verifiedBy) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'verifiedBy wajib diisi.',
    })
  }

  if (!verificationStatus) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'verificationStatus wajib diisi.',
    })
  }

  // Hanya dua hasil verifikasi yang diperbolehkan
  // sesuai business rule verifikasi dokumen.
  if (
    !['VALID', 'TIDAK_VALID'].includes(
      verificationStatus,
    )
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'verificationStatus harus VALID atau TIDAK_VALID.',
    })
  }

  // Pastikan dokumen yang diverifikasi memang
  // terdaftar pada application_documents.
  const applicationDocument =
    await findApplicationDocumentById(
      applicationDocumentId,
    )

  if (!applicationDocument) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Application document tidak ditemukan.',
    })
  }

  const payload: CreateApplicationDocumentVerificationInput = {
    application_document_id:
      applicationDocument.application_document_id,

    verified_by:
      verifiedBy,

    verification_status:
      verificationStatus,

    verification_note:
      verificationNote,

    verified_at:
      input.verifiedAt,
  }

  return await createApplicationDocumentVerification(
    payload,
  )
}