import {
  assertValidApplicationPayload,
  createApplication,
  getOpenRegistrationPeriod,
} from './application.service'

import {
  createFile,
  findFileByStorageId,
} from '../repositories/file.repository'

import {
  createApplicationDocument,
  findLinkedFileIds,
} from '../repositories/application-document.repository'

import {
  renameGoogleDriveFile,
  uploadToGoogleDrive,
} from './google-drive.service'

import { getApplicationDocumentLabel } from '../../shared/utils/documents'
import {
  assertValidPdfFile,
  sanitizeFileNamePart,
} from '../utils/pdf-file'

/**
 * Pendaftaran guest dua langkah (agar setiap request < 4,5 MB, batas hosting serverless):
 * 1. `uploadRegistrationDocument` — setiap dokumen diunggah sendiri-sendiri saat dipilih;
 *    respons berisi `upload_token` (ID file Google Drive yang acak & tidak dapat ditebak).
 * 2. `processRegistration` — data form + 4 token; token diverifikasi lalu ditautkan ke pengajuan.
 *
 * Token hanya diterima jika berkas diunggah lewat langkah 1, belum tertaut ke pengajuan lain,
 * dan diunggah kurang dari 24 jam sebelumnya.
 */

/** Kunci field form → jenis dokumen yang disimpan. */
export const REGISTRATION_DOCUMENTS: Record<string, string> = {
  diploma: 'IJAZAH',
  appointment: 'SK_JABATAN',
  trainingCertificate: 'SERTIFIKAT_COACHING_MENTORING',
  practiceEvidence: 'BUKTI_PRAKTIK_COACHING_MENTORING',
}

/** Penanda `uploaded_by` untuk berkas yang diunggah guest sebelum pendaftaran dikirim. */
const GUEST_UPLOADER = 'GUEST_REGISTRATION'
const UPLOAD_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000
const UPLOAD_TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,200}$/

type RegistrationPayload = {
  fullName: string
  nip: string
  institution: string
  region: string
  email: string
  whatsapp: string
  education: string
  position: string
  /** Kunci dokumen → upload_token. */
  documents: Record<string, string>
}

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

/** Langkah 1: unggah satu dokumen pendaftaran. */
export async function uploadRegistrationDocument(documentKey: string, file: File | undefined) {
  const documentType = REGISTRATION_DOCUMENTS[documentKey]
  if (!documentType) badRequest('Jenis dokumen tidak dikenal.')

  // Hanya saat pendaftaran dibuka, agar endpoint publik ini tidak dipakai sebagai penyimpanan bebas.
  await getOpenRegistrationPeriod()

  const label = getApplicationDocumentLabel(documentType)
  await assertValidPdfFile(file, label)
  const validFile = file as File

  const uploaded = await uploadToGoogleDrive({
    fileName: `CMSP_PENDAFTARAN_${documentType}_${Date.now()}.pdf`,
    mimeType: validFile.type,
    buffer: Buffer.from(await validFile.arrayBuffer()),
  })

  await createFile({
    original_file_name: validFile.name,
    storage_provider: 'GOOGLE_DRIVE',
    storage_file_id: uploaded.storageFileId,
    file_url: uploaded.fileUrl,
    mime_type: uploaded.mimeType,
    file_size_bytes: uploaded.fileSizeBytes,
    uploaded_by: GUEST_UPLOADER,
  })

  return {
    upload_token: uploaded.storageFileId,
    original_file_name: validFile.name,
    file_size_bytes: uploaded.fileSizeBytes,
  }
}

/** Langkah 2: kirim data pendaftaran dengan token dokumen hasil langkah 1. */
export async function processRegistration(payload: RegistrationPayload) {
  // Validasi seluruh data dan pastikan pendaftaran sedang dibuka sebelum menulis apa pun.
  assertValidApplicationPayload(payload)
  await getOpenRegistrationPeriod()

  const tokens = Object.keys(REGISTRATION_DOCUMENTS).map((key) => {
    const token = payload.documents?.[key]
    const label = getApplicationDocumentLabel(REGISTRATION_DOCUMENTS[key] as string)
    if (typeof token !== 'string' || !UPLOAD_TOKEN_PATTERN.test(token)) {
      badRequest(`${label}: dokumen wajib diunggah.`)
    }
    return { key, token, label, documentType: REGISTRATION_DOCUMENTS[key] as string }
  })

  if (new Set(tokens.map((item) => item.token)).size !== tokens.length) {
    badRequest('Setiap dokumen persyaratan harus berupa berkas yang berbeda.')
  }

  const files = await Promise.all(tokens.map((item) => findFileByStorageId(item.token)))
  const linked = await findLinkedFileIds(files.map((file) => file?.file_id ?? ''))

  tokens.forEach((item, index) => {
    const file = files[index]
    const uploadedAt = Date.parse(file?.uploaded_at ?? '')

    if (
      !file
      || file.uploaded_by !== GUEST_UPLOADER
      || linked.has(file.file_id)
      || Number.isNaN(uploadedAt)
      || Date.now() - uploadedAt > UPLOAD_TOKEN_MAX_AGE_MS
    ) {
      badRequest(`${item.label}: berkas tidak ditemukan atau sudah kedaluwarsa. Silakan unggah ulang.`)
    }
  })

  const applicationResult = await createApplication({
    fullName: payload.fullName,
    nip: payload.nip,
    institution: payload.institution,
    region: payload.region,
    email: payload.email,
    whatsapp: payload.whatsapp,
    education: payload.education,
    position: payload.position,
  })

  const applicationId = applicationResult.data.application.application_id

  for (const [index, item] of tokens.entries()) {
    const file = files[index]!

    await createApplicationDocument({
      application_id: applicationId,
      document_type: item.documentType,
      file_id: file.file_id,
      is_required: true,
    })

    // Nama berkas di Drive mengikuti format lama (NIP & nama); gagal ganti nama tidak membatalkan pendaftaran.
    await renameGoogleDriveFile(
      file.storage_file_id,
      `CMSP_${payload.nip}_${item.documentType}_${sanitizeFileNamePart(payload.fullName)}.pdf`,
    ).catch((error) => console.error('Gagal mengganti nama berkas pendaftaran di Drive:', error))
  }

  return {
    success: true,
    message: 'Pendaftaran dan dokumen berhasil diproses.',
    data: applicationResult.data,
  }
}
