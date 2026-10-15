import {
  createApplicationVerification,
  type ApplicationVerification,
  type CreateApplicationVerificationInput,
} from '../repositories/application-verification.repository'

import {
  findApplicationById,
  updateApplicationStatus,
  findAcceptedApplicationByNipAndPeriod,
  supersedePendingApplicationsByNipAndPeriod,
} from '../repositories/application.repository'

export type CreateApplicationVerificationServiceInput = {
  applicationId: string
  verifiedBy: string
  verificationStatus: string
  verifiedAt?: string
}

export async function createApplicationVerificationService(
  input: CreateApplicationVerificationServiceInput,
): Promise<ApplicationVerification> {
  const applicationId =
    input.applicationId?.trim() ?? ''

  const verifiedBy =
    input.verifiedBy?.trim() ?? ''

  const verificationStatus =
    input.verificationStatus?.trim().toUpperCase() ?? ''

  if (!applicationId) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'applicationId wajib diisi.',
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

  // Keputusan verifikasi application hanya memiliki
  // dua hasil resmi: DITERIMA atau DITOLAK.
  if (
    !['DITERIMA', 'DITOLAK'].includes(
      verificationStatus,
    )
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'verificationStatus harus DITERIMA atau DITOLAK.',
    })
  }

  // Pastikan application yang diverifikasi memang
  // terdaftar di database.
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

  // Application hanya dapat diverifikasi
  // ketika masih berada pada tahap verifikasi.
  if (
    application.application_status !==
    'pending_verification'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Application tidak dapat diverifikasi karena statusnya bukan pending_verification.',
    })
  }

  // Cegah NIP yang sama diterima lebih dari sekali
  // pada periode yang sama.
  if (verificationStatus === 'DITERIMA') {
    const acceptedApplication =
      await findAcceptedApplicationByNipAndPeriod(
        application.nip_snapshot,
        application.period_id,
        application.application_id,
      )

    if (acceptedApplication) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Sudah ada pengajuan dengan NIP dan periode yang sama yang diterima.',
      })
    }
  }

  const payload: CreateApplicationVerificationInput = {
    application_id:
      applicationId,

    verified_by:
      verifiedBy,

    verification_status:
      verificationStatus,

    verification_note:
      '',

    verified_at:
      input.verifiedAt,
  }

  const verification =
    await createApplicationVerification(
      payload,
    )

  const nextApplicationStatus =
    verificationStatus === 'DITERIMA'
      ? 'accepted'
      : 'rejected'

  const updatedApplication =
    await updateApplicationStatus(
      applicationId,
      nextApplicationStatus,
    )

  if (!updatedApplication) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Application tidak ditemukan saat memperbarui status.',
    })
  }

  // Jika pengajuan diterima, tandai pengajuan lain
  // dengan NIP dan periode yang sama yang masih pending
  // sebagai superseded agar tidak ikut diproses lagi.
  if (verificationStatus === 'DITERIMA') {
    await supersedePendingApplicationsByNipAndPeriod(
      application.nip_snapshot,
      application.period_id,
      application.application_id,
    )
  }

  return verification
}
