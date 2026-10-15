import {
  findApplicationById,
  updateApplicationVerificationNote,
} from '../repositories/application.repository'

export type UpdateApplicationVerificationNoteInput = {
  applicationId: string
  verificationNote?: string
}

export async function updateApplicationVerificationNoteService(
  input: UpdateApplicationVerificationNoteInput,
) {
  const applicationId =
    input.applicationId?.trim() ?? ''

  const verificationNote =
    input.verificationNote?.trim() ?? ''

  if (!applicationId) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'applicationId wajib diisi.',
    })
  }

  // Pastikan Application yang akan diberi catatan
  // memang terdaftar.
  const application =
    await findApplicationById(
      applicationId,
    )

  if (!application) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Application tidak ditemukan.',
    })
  }

  // Catatan hanya dapat diperbarui selama
  // Application masih dalam proses verifikasi.
  if (
    application.application_status !==
    'pending_verification'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Catatan tidak dapat diperbarui karena Application bukan pending_verification.',
    })
  }

  const updatedApplication =
    await updateApplicationVerificationNote(
      applicationId,
      verificationNote,
    )

  if (!updatedApplication) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Application tidak ditemukan.',
    })
  }

  return updatedApplication
}