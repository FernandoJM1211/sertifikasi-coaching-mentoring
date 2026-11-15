import type { H3Event } from 'h3'

/**
 * Validasi berkas unggahan berdasarkan ISI file (signature), bukan
 * tipe/ekstensi yang dikirim browser, sehingga file berbahaya yang
 * diganti namanya tidak lolos.
 */

const SIGNATURES: { mime: string, extensions: string[], bytes: number[] }[] = [
  { mime: 'application/pdf', extensions: ['pdf'], bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { mime: 'image/png', extensions: ['png'], bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], bytes: [0xff, 0xd8, 0xff] },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['docx'],
    bytes: [0x50, 0x4b, 0x03, 0x04],
  },
  { mime: 'application/msword', extensions: ['doc'], bytes: [0xd0, 0xcf, 0x11, 0xe0] },
]

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
}

/**
 * Mendeteksi tipe file dari signature + ekstensi.
 * Mengembalikan '' jika tidak dikenali.
 */
export async function detectFileMimeType(file: File): Promise<string> {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  const match = SIGNATURES.find(
    (signature) =>
      signature.extensions.includes(extension) &&
      signature.bytes.every((byte, index) => header[index] === byte),
  )

  return match?.mime ?? ''
}

export function getExtensionForMime(mime: string): string {
  return EXTENSION_BY_MIME[mime] ?? 'bin'
}

/**
 * Memastikan file ada, tidak melebihi ukuran, dan tipenya termasuk yang
 * diizinkan. Mengembalikan MIME type hasil deteksi.
 */
export async function assertValidUpload(
  file: File | undefined | null,
  options: { allowedMimeTypes: readonly string[], maxBytes: number, label: string },
): Promise<string> {
  if (!file || file.size === 0) {
    throw createError({ statusCode: 400, statusMessage: `${options.label}: file wajib dipilih.` })
  }

  if (file.size > options.maxBytes) {
    throw createError({
      statusCode: 400,
      statusMessage: `${options.label}: ukuran file maksimal ${Math.round(options.maxBytes / 1024 / 1024)} MB.`,
    })
  }

  const mime = await detectFileMimeType(file)

  if (!mime || !options.allowedMimeTypes.includes(mime)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${options.label}: format file tidak didukung.`,
    })
  }

  return mime
}

/** Tipe yang aman ditampilkan langsung di browser. */
const INLINE_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg'])

/**
 * Header respons untuk mengirim isi berkas. PDF/gambar ditampilkan inline;
 * tipe lain selalu diunduh agar tidak dapat dieksekusi di origin aplikasi.
 */
export function setFileResponseHeaders(
  event: H3Event,
  file: { mime_type: string, original_file_name: string },
) {
  const inline = INLINE_MIME_TYPES.has(file.mime_type)
  const safeName = encodeURIComponent(file.original_file_name || 'dokumen')

  setResponseHeaders(event, {
    'Content-Type': inline ? file.mime_type : 'application/octet-stream',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${safeName}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
}
