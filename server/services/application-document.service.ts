import type { H3Event } from 'h3'

import { findApplicationDocumentsByApplicationId } from '../repositories/application-document.repository'
import {
  findFileById,
  type FileRecord,
} from '../repositories/file.repository'
import { downloadGoogleDriveFile } from './google-drive.service'

/** Metadata berkas yang aman dikirim ke frontend (tanpa ID/URL Drive). */
export function toPublicFile(file: FileRecord | null | undefined) {
  if (!file) return null

  return {
    file_id: file.file_id,
    original_file_name: file.original_file_name,
    mime_type: file.mime_type,
    file_size_bytes: Number(file.file_size_bytes) || 0,
    uploaded_at: file.uploaded_at,
  }
}

export type PublicFile = NonNullable<ReturnType<typeof toPublicFile>>

/** Mengirim isi berkas dari Google Drive (lewat backend, bukan link publik). */
export async function sendStoredFile(event: H3Event, file: FileRecord | null) {
  if (!file || file.storage_provider !== 'GOOGLE_DRIVE') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Berkas tidak ditemukan atau penyimpanan tidak didukung.',
    })
  }

  const buffer = await downloadGoogleDriveFile(file.storage_file_id)
  setFileResponseHeaders(event, file)

  return buffer
}

/**
 * Preview dokumen pendaftaran untuk Verifikator/Super Admin.
 * Dokumen harus benar-benar milik pengajuan pada URL.
 */
export async function sendApplicationDocumentPreview(
  event: H3Event,
  applicationId: string,
  applicationDocumentId: string,
) {
  const documents = await findApplicationDocumentsByApplicationId(applicationId)

  const document = documents.find(
    (item) => item.application_document_id === applicationDocumentId,
  )

  if (!document) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dokumen pengajuan tidak ditemukan.',
    })
  }

  return sendStoredFile(event, await findFileById(document.file_id))
}
