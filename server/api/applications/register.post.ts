import { processRegistration } from '../../services/registration.service'

// Mapping nama field pada GuestRegistrationForm.vue
// ke document_type yang disimpan di database.
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  diploma: 'IJAZAH',
  appointment: 'SK_JABATAN',
  trainingCertificate: 'SERTIFIKAT_COACHING_MENTORING',
  practiceEvidence: 'BUKTI_PRAKTIK_COACHING_MENTORING',
}

// 4 dokumen x 5 MB + ruang untuk field teks dan boundary multipart.
const MAX_REQUEST_BYTES = 21 * 1024 * 1024

const REGISTRATION_WINDOW_MS = 60 * 60 * 1000
const REGISTRATION_LIMIT_PER_IP = 10

export default defineEventHandler(async (event) => {
  // Endpoint publik: batasi jumlah pendaftaran per IP.
  assertRateLimit(
    `registration:ip:${getClientIp(event)}`,
    REGISTRATION_LIMIT_PER_IP,
    REGISTRATION_WINDOW_MS,
    'Terlalu banyak pengajuan pendaftaran. Silakan coba lagi nanti.',
  )

  // Tolak request yang terlalu besar sebelum isi body dibaca ke memori.
  const contentLength = Number(getRequestHeader(event, 'content-length'))

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw createError({
      statusCode: 411,
      statusMessage: 'Ukuran data pendaftaran tidak diketahui.',
    })
  }

  if (contentLength > MAX_REQUEST_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Total ukuran berkas terlalu besar.',
    })
  }

  // Satu request membawa data pendaftaran sekaligus empat dokumen.
  const parts = await readMultipartFormData(event)

  if (!parts || parts.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data pendaftaran tidak ditemukan.',
    })
  }

  const data: Record<string, string> = {}
  const files: Array<{ file: File, documentType: string }> = []

  for (const part of parts) {
    if (!part.name) continue

    // Field tanpa filename adalah data teks dari form.
    if (!part.filename) {
      data[part.name] = part.data.toString('utf-8')
      continue
    }

    const documentType = DOCUMENT_TYPE_MAP[part.name]

    // Hanya field dokumen persyaratan yang dikenal yang diproses.
    if (!documentType) continue

    files.push({
      documentType,
      file: multipartPartToFile(part),
    })
  }

  return await processRegistration({
    fullName: data.fullName || '',
    nip: data.nip || '',
    institution: data.institution || '',
    region: data.region || '',
    email: data.email || '',
    whatsapp: data.whatsapp || '',
    education: data.education || '',
    position: data.position || '',
    files,
  })
})
