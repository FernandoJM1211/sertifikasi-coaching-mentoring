import {
  findApplicationById,
} from '../repositories/application.repository'

import {
  findApplicationDocumentsByApplicationId,
} from '../repositories/application-document.repository'

import {
  findFileById,
} from '../repositories/file.repository'

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

  return {
    application,
    documents,
  }
}