import {
  createApplication,
} from './application.service'

import {
  createFile,
} from '../repositories/file.repository'

import {
  createApplicationDocument,
} from '../repositories/application-document.repository'

import {
  uploadToGoogleDrive,
} from './google-drive.service'

type RegistrationFile = {
  file: File
  documentType: string
}

type RegistrationPayload = {
  fullName: string
  nip: string
  institution: string
  region: string
  email: string
  whatsapp: string
  education: string
  position: string
  files: RegistrationFile[]
}

const MAX_FILE_SIZE =
  5 * 1024 * 1024

const REQUIRED_DOCUMENTS = [
  {
    key: 'diploma',
    documentType: 'IJAZAH',
  },
  {
    key: 'appointment',
    documentType: 'SK_JABATAN',
  },
  {
    key: 'trainingCertificate',
    documentType:
      'SERTIFIKAT_COACHING_MENTORING',
  },
  {
    key: 'practiceEvidence',
    documentType:
      'BUKTI_PRAKTIK_COACHING_MENTORING',
  },
]


async function validateFile(
  file: File,
  documentType: string,
) {
  if (!file) {
    throw createError({
      statusCode: 400,
      statusMessage:
        `${documentType}: dokumen wajib diunggah.`,
    })
  }

  if (file.type !== 'application/pdf') {
    throw createError({
      statusCode: 400,
      statusMessage:
        `${documentType}: file harus dalam format PDF.`,
    })
  }

  if (file.size > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage:
        `${documentType}: ukuran file maksimal 5 MB.`,
    })
  }

  // Periksa signature file agar file biasa yang hanya
  // diberi MIME type PDF tidak langsung lolos validasi.
  const header = new Uint8Array(
    await file.slice(0, 5).arrayBuffer(),
  )

  const signature = String.fromCharCode(...header)

  if (signature !== '%PDF-') {
    throw createError({
      statusCode: 400,
      statusMessage:
        `${documentType}: isi file tidak terdeteksi sebagai PDF yang valid.`,
    })
  }
}


function sanitizeFileName(
  value: string,
) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

export async function processRegistration(
  payload: RegistrationPayload,
) {
  if (!payload.fullName?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Nama lengkap wajib diisi.',
    })
  }

  if (!payload.nip?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'NIP wajib diisi.',
    })
  }

  if (!payload.institution?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Nama instansi wajib diisi.',
    })
  }

  if (!payload.region?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Asal daerah wajib diisi.',
    })
  }

  if (!payload.email?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Email wajib diisi.',
    })
  }

  if (!payload.whatsapp?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Nomor WhatsApp wajib diisi.',
    })
  }

  if (!payload.education?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Pendidikan terakhir wajib diisi.',
    })
  }

  if (!payload.position?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Jabatan wajib diisi.',
    })
  }

  if (
    !Array.isArray(payload.files) ||
    payload.files.length !==
      REQUIRED_DOCUMENTS.length
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Empat dokumen persyaratan wajib diunggah.',
    })
  }

  for (
    const requiredDocument
    of REQUIRED_DOCUMENTS
  ) {
    const uploadedFile =
      payload.files.find(
        (item) =>
          item.documentType ===
          requiredDocument.documentType,
      )

    if (!uploadedFile?.file) {
      throw createError({
        statusCode: 400,
        statusMessage:
          `${requiredDocument.documentType}: dokumen wajib diunggah.`,
      })
    }

    await validateFile(
  uploadedFile.file,
  requiredDocument.documentType,
)
  }

  const uploadedFiles: Array<{
    documentType: string
    originalFileName: string
    storageFileId: string
    fileUrl: string
    mimeType: string
    fileSizeBytes: number
  }> = []

  for (
    const requiredDocument
    of REQUIRED_DOCUMENTS
  ) {
    const registrationFile =
      payload.files.find(
        (item) =>
          item.documentType ===
          requiredDocument.documentType,
      )!

    const fileBuffer =
      Buffer.from(
        await registrationFile.file.arrayBuffer(),
      )

    const fileName =
      `CMSP_${payload.nip}_${requiredDocument.documentType}_${sanitizeFileName(payload.fullName)}.pdf`

    const uploaded =
      await uploadToGoogleDrive({
        fileName,
        mimeType:
          registrationFile.file.type,
        buffer: fileBuffer,
      })

    uploadedFiles.push({
      documentType:
        requiredDocument.documentType,
      originalFileName:
        registrationFile.file.name,
      storageFileId:
        uploaded.storageFileId,
      fileUrl:
        uploaded.fileUrl,
      mimeType:
        uploaded.mimeType,
      fileSizeBytes:
        uploaded.fileSizeBytes,
    })
  }

  const applicationResult =
    await createApplication({
      fullName: payload.fullName,
      nip: payload.nip,
      institution: payload.institution,
      region: payload.region,
      email: payload.email,
      whatsapp: payload.whatsapp,
      education: payload.education,
      position: payload.position,
    })

  const applicationId =
    applicationResult.data
      .application.application_id

  const savedFiles = []

  for (
    const uploadedFile
    of uploadedFiles
  ) {
    const fileRecord =
      await createFile({
        original_file_name:
          uploadedFile.originalFileName,
        storage_provider:
          'GOOGLE_DRIVE',
        storage_file_id:
          uploadedFile.storageFileId,
        file_url:
          uploadedFile.fileUrl,
        mime_type:
          uploadedFile.mimeType,
        file_size_bytes:
          uploadedFile.fileSizeBytes,
        uploaded_by:
          'GUEST_REGISTRATION',
      })

    savedFiles.push(fileRecord)

    await createApplicationDocument({
      application_id:
        applicationId,
      document_type:
        uploadedFile.documentType,
      file_id:
        fileRecord.file_id,
      is_required: true,
    })
  }

  return {
    success: true,
    message:
      'Pendaftaran dan dokumen berhasil diproses.',
    data: {
      ...applicationResult.data,
      files: savedFiles,
    },
  }
}