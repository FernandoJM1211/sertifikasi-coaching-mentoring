import {
  findApplicationById,
} from '../repositories/application.repository'

import {
  findApplicationDocumentsByApplicationId,
} from '../repositories/application-document.repository'

import {
  findFileById,
} from '../repositories/file.repository'

import { findUsersByPersonId } from '../repositories/user.repository'

export async function getApplicationVerificationDetail(
  applicationId: string,
) {
  // Detail dapat dibaca pada semua status.
  // Pembatasan keputusan ulang tetap ditangani service keputusan.
  const application =
    await findApplicationById(applicationId)

  if (!application) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Application tidak ditemukan.',
    })
  }

  // Ambil seluruh dokumen yang terhubung dengan Application.
  const applicationDocuments =
    await findApplicationDocumentsByApplicationId(
      applicationId,
    )

  const documents = []

  for (const applicationDocument of applicationDocuments) {
    const file = await findFileById(
      applicationDocument.file_id,
    )

    documents.push({
      ...applicationDocument,
      file,
    })
  }

  // Penanda kasus "NIP lama + email baru": peserta sudah punya akun dengan email lain.
  // Bila diterima, akun lama tetap dipakai dan emailnya tidak diganti.
  const accounts = application.person_id
    ? await findUsersByPersonId(application.person_id)
    : []
  const accountEmail =
    accounts[0]?.username_email.trim().toLowerCase() ?? ''
  const emailMismatch =
    Boolean(accountEmail) &&
    accountEmail !== application.email_snapshot.trim().toLowerCase()

  return {
    application,
    documents,
    identity: {
      emailMismatch,
      accountEmail: emailMismatch ? accountEmail : '',
    },
  }
}