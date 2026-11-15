import { MAX_PDF_SIZE_BYTES } from '../../shared/utils/documents'

/**
 * Memastikan berkas adalah PDF yang valid: tipe MIME, ukuran,
 * dan signature isi file (`%PDF-`), sehingga file lain yang hanya
 * diberi ekstensi/MIME PDF tidak lolos.
 */
export async function assertValidPdfFile(
  file: File | undefined | null,
  label: string,
): Promise<void> {
  if (!file || file.size === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label}: dokumen wajib diunggah.`,
    })
  }

  if (file.type !== 'application/pdf') {
    throw createError({
      statusCode: 400,
      statusMessage: `${label}: file harus dalam format PDF.`,
    })
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label}: ukuran file maksimal 5 MB.`,
    })
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer())

  if (String.fromCharCode(...header) !== '%PDF-') {
    throw createError({
      statusCode: 400,
      statusMessage: `${label}: isi file tidak terdeteksi sebagai PDF yang valid.`,
    })
  }
}

/** Nama aman untuk dipakai sebagai bagian nama file di Google Drive. */
export function sanitizeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

/** Mengubah bagian multipart menjadi objek File. */
export function multipartPartToFile(part: {
  data: Buffer
  filename?: string
  type?: string
}): File {
  const fileBuffer = new Uint8Array(part.data.length)
  fileBuffer.set(part.data)

  return new File([fileBuffer.buffer], part.filename || 'dokumen.pdf', {
    type: part.type || 'application/octet-stream',
  })
}
