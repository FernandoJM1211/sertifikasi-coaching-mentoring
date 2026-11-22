
import {
  createApplicationVerification,
  findApplicationVerificationsByApplicationId,
  type ApplicationVerification,
  type CreateApplicationVerificationInput,
} from '../repositories/application-verification.repository'

import {
  findApplicationById,
  updateApplicationStatus,
  findAcceptedApplicationByNipAndPeriod,
  supersedePendingApplicationsByNipAndPeriod,
} from '../repositories/application.repository'

import {
  preparePesertaAccount,
  sendPesertaActivationEmail,
} from './peserta-account-provisioning.service'

import { findCertificationPeriodById } from '../repositories/certification-period.repository'
import { sendApplicationRejectedEmail } from '../utils/email'

async function getPeriodName(periodId: string): Promise<string> {
  const period = await findCertificationPeriodById(periodId).catch(() => null)
  return period?.period_name ?? ''
}

export type CreateApplicationVerificationServiceInput = {
  applicationId: string
  verifiedBy: string
  verificationStatus: string
  verifiedAt?: string
}

export async function createApplicationVerificationService(
  input: CreateApplicationVerificationServiceInput,
): Promise<ApplicationVerification> {
  const applicationId = input.applicationId?.trim() ?? ''
  const verifiedBy = input.verifiedBy?.trim() ?? ''
  const verificationStatus =
    input.verificationStatus?.trim().toUpperCase() ?? ''

  if (!applicationId || !verifiedBy || !verificationStatus) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'applicationId, verifiedBy, dan verificationStatus wajib diisi.',
    })
  }

  if (!['DITERIMA', 'DITOLAK'].includes(verificationStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'verificationStatus harus DITERIMA atau DITOLAK.',
    })
  }

  const application = await findApplicationById(applicationId)

  if (!application) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Application tidak ditemukan.',
    })
  }

  const histories =
    await findApplicationVerificationsByApplicationId(applicationId)

  if (histories.length > 1) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Ditemukan lebih dari satu riwayat verifikasi. Periksa data sebelum melanjutkan.',
    })
  }

  const existingVerification = histories[0]

  if (
    existingVerification &&
    existingVerification.verification_status !== verificationStatus
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Pengajuan sudah memiliki riwayat dengan keputusan berbeda.',
    })
  }

  const isAccepted = verificationStatus === 'DITERIMA'
  const nextStatus = isAccepted ? 'accepted' : 'rejected'

  // Jika status sudah sesuai dan riwayat tersedia, proses dapat
  // dilanjutkan untuk memulihkan tahap yang sebelumnya gagal.
  const isResume =
    Boolean(existingVerification) &&
    application.application_status === nextStatus

  if (
    application.application_status !== 'pending_verification' &&
    !isResume
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Application tidak dapat diverifikasi atau dilanjutkan dari status saat ini.',
    })
  }

  if (isAccepted) {
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

  // Siapkan akun dan token terlebih dahulu, tanpa mengirim email.
  // Penolakan tidak menjalankan proses pembuatan akun.
  const preparedAccount = isAccepted
    ? await preparePesertaAccount({
        person_id: application.person_id,
        full_name_snapshot: application.full_name_snapshot,
        nip_snapshot: application.nip_snapshot,
        institution_name: application.institution_name,
        region: application.region,
        email_snapshot: application.email_snapshot,
        phone_snapshot: application.phone_snapshot,
        last_education: application.last_education,
        position: application.position,
      })
    : null

  const payload: CreateApplicationVerificationInput = {
    application_id: applicationId,
    verified_by: verifiedBy,
    verification_status: verificationStatus,
    verification_note: existingVerification?.verification_note ?? '',
    verified_at:
      existingVerification?.verified_at ?? input.verifiedAt,
  }

  // Buat riwayat hanya jika belum ada, agar percobaan ulang
  // tidak membuat riwayat verifikasi kedua.
  const verification =
    existingVerification ??
    await createApplicationVerification(payload)

  if (application.application_status !== nextStatus) {
    const updatedApplication = await updateApplicationStatus(
      applicationId,
      nextStatus,
    )

    if (!updatedApplication) {
      throw createError({
        statusCode: 404,
        statusMessage:
          'Application tidak ditemukan saat memperbarui status.',
      })
    }
  }

  if (isAccepted) {
    await supersedePendingApplicationsByNipAndPeriod(
      application.nip_snapshot,
      application.period_id,
      application.application_id,
    )

    // Email hanya dikirim setelah status accepted berhasil disimpan.
    // Jika pengiriman aktivasi gagal, pemanggilan ulang dapat menyiapkan
    // token baru dan mencoba mengirim kembali.
    if (preparedAccount) {
      await sendPesertaActivationEmail(preparedAccount, {
        applicationEmail: application.email_snapshot,
        periodName: await getPeriodName(application.period_id),
      })
    }
  } else if (application.application_status !== 'rejected') {
    // Pemberitahuan penolakan (umum, tanpa catatan Verifikator) ke email pengajuan.
    // Hanya saat keputusan pertama kali disimpan; gagal kirim tidak membatalkan keputusan.
    await sendApplicationRejectedEmail(application.email_snapshot, {
      periodName: await getPeriodName(application.period_id),
    }).catch((error) => console.error('Gagal mengirim email penolakan:', error))
  }

  return verification
}
