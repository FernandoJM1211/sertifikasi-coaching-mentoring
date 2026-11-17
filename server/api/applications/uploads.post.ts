import { uploadRegistrationDocument } from '../../services/registration.service'
import { MAX_PDF_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from '../../../shared/utils/documents'

/**
 * Publik: unggah SATU dokumen pendaftaran (langkah 1 pendaftaran).
 * Body multipart: `document` (kunci dokumen, mis. `diploma`) + `file` (PDF).
 */

// Satu PDF + field teks & boundary multipart (tetap di bawah batas 4,5 MB Vercel).
const MAX_REQUEST_BYTES = MAX_PDF_SIZE_BYTES + 64 * 1024

export default defineEventHandler(async (event) => {
  assertRateLimit(
    `registration:upload:ip:${getClientIp(event)}`,
    40,
    60 * 60 * 1000,
    'Terlalu banyak unggahan dokumen. Silakan coba lagi nanti.',
  )

  const contentLength = Number(getRequestHeader(event, 'content-length'))

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw createError({ statusCode: 411, statusMessage: 'Ukuran berkas tidak diketahui.' })
  }

  if (contentLength > MAX_REQUEST_BYTES) {
    throw createError({ statusCode: 413, statusMessage: `Ukuran file maksimal ${MAX_UPLOAD_SIZE_MB} MB.` })
  }

  const parts = await readMultipartFormData(event)
  const documentKey = parts?.find((part) => part.name === 'document' && !part.filename)?.data.toString('utf-8') ?? ''
  const filePart = parts?.find((part) => part.name === 'file' && part.filename)

  return {
    success: true,
    data: await uploadRegistrationDocument(documentKey, filePart ? multipartPartToFile(filePart) : undefined),
  }
})
