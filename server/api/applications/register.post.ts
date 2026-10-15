import { readMultipartFormData } from 'h3'
import { processRegistration } from '../../services/registration.service'

// Mapping nama field pada GuestRegistrationForm.vue
// ke document_type yang disimpan di database.
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  diploma: 'IJAZAH',
  appointment: 'SK_JABATAN',
  trainingCertificate: 'SERTIFIKAT_COACHING_MENTORING',
  practiceEvidence: 'BUKTI_PRAKTIK_COACHING_MENTORING',
}

export default defineEventHandler(async (event) => {
  // Endpoint menggunakan multipart/form-data karena satu request
  // membawa data pendaftaran sekaligus empat dokumen persyaratan.
  const parts = await readMultipartFormData(event)

  if (!parts || parts.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data pendaftaran tidak ditemukan.',
    })
  }

  const data: Record<string, string> = {}

  const files: Array<{
    file: File
    documentType: string
  }> = []

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    // Field tanpa filename adalah data teks dari form.
    if (!part.filename) {
      data[part.name] = part.data.toString('utf-8')
      continue
    }

    const documentType = DOCUMENT_TYPE_MAP[part.name]

    // Hanya field file yang sudah didefinisikan sebagai
    // dokumen persyaratan yang boleh diproses.
    if (!documentType) {
      continue
    }

    // readMultipartFormData menghasilkan Buffer.
    // Service registration menggunakan File, sehingga Buffer
    // dikonversi menjadi File sebelum diteruskan.
    // Buat salinan ArrayBuffer yang kompatibel dengan BlobPart/File.
// Salinan ini juga memastikan data file tetap utuh saat diteruskan ke service.
const fileBuffer = new Uint8Array(part.data.length)
fileBuffer.set(part.data)

const file = new File(
  [fileBuffer.buffer],
  part.filename,
  {
    type: part.type || 'application/octet-stream',
  },
)

    files.push({
      file,
      documentType,
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