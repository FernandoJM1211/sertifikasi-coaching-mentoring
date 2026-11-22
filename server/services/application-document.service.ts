import type { H3Event } from 'h3'

import { findApplicationDocumentsByApplicationId } from '../repositories/application-document.repository'
import {
  findFileById,
  type FileRecord,
} from '../repositories/file.repository'
import { convertGoogleDriveFileToPdf, downloadGoogleDriveFile } from './google-drive.service'

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

const WORD_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

/** Batas respons fungsi Vercel ±4,5 MB; hasil konversi di atas ini tidak dikirim. */
const MAX_PREVIEW_PDF_BYTES = 4.3 * 1024 * 1024

/** Hasil konversi Word → PDF disimpan sebentar di memori agar preview ulang tidak mengonversi lagi. */
const PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000
const PREVIEW_CACHE_MAX_ENTRIES = 10
const previewPdfCache = new Map<string, { expiresAt: number, buffer: Buffer }>()

async function getWordPreviewPdf(storageFileId: string): Promise<Buffer> {
  const cached = previewPdfCache.get(storageFileId)
  if (cached && cached.expiresAt > Date.now()) return cached.buffer

  const buffer = await convertGoogleDriveFileToPdf(storageFileId)

  if (buffer.length > MAX_PREVIEW_PDF_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Berkas terlalu besar untuk ditampilkan sebagai pratinjau. Silakan unduh berkas untuk membukanya.',
    })
  }

  previewPdfCache.delete(storageFileId)
  previewPdfCache.set(storageFileId, { expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS, buffer })
  // Buang entri terlama bila melebihi batas.
  while (previewPdfCache.size > PREVIEW_CACHE_MAX_ENTRIES) {
    previewPdfCache.delete(previewPdfCache.keys().next().value as string)
  }

  return buffer
}

/**
 * Mengirim isi berkas dari Google Drive (lewat backend, bukan link publik).
 * Query `?preview=pdf`: berkas Word dikirim sebagai PDF hasil konversi (untuk modal preview);
 * tanpa query, berkas asli dikirim apa adanya (untuk unduh). Otorisasi dicek pemanggil.
 */
export async function sendStoredFile(event: H3Event, file: FileRecord | null) {
  if (!file || file.storage_provider !== 'GOOGLE_DRIVE') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Berkas tidak ditemukan atau penyimpanan tidak didukung.',
    })
  }

  if (getQuery(event).preview === 'pdf' && WORD_MIME_TYPES.has(file.mime_type)) {
    const pdf = await getWordPreviewPdf(file.storage_file_id)
    setFileResponseHeaders(event, {
      mime_type: 'application/pdf',
      original_file_name: `${file.original_file_name.replace(/\.(docx?|DOCX?)$/, '')}.pdf`,
    })
    return pdf
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
