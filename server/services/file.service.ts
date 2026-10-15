import {
  createFile,
  type FileRecord,
  type CreateFileInput,
} from '../repositories/file.repository'

export type CreateFileServiceInput = {
  originalFileName: string
  storageProvider: string
  storageFileId: string
  fileUrl: string
  mimeType: string
  fileSizeBytes: number
  uploadedBy: string
  uploadedAt?: string
  status?: string
}

export async function createFileService(
  input: CreateFileServiceInput,
): Promise<FileRecord> {
  const originalFileName =
    input.originalFileName?.trim() ?? ''

  const storageProvider =
    input.storageProvider?.trim() ?? ''

  const storageFileId =
    input.storageFileId?.trim() ?? ''

  const fileUrl =
    input.fileUrl?.trim() ?? ''

  const mimeType =
    input.mimeType?.trim() ?? ''

  const uploadedBy =
    input.uploadedBy?.trim() ?? ''

  if (!originalFileName) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'originalFileName wajib diisi.',
    })
  }

  if (!storageProvider) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'storageProvider wajib diisi.',
    })
  }

  if (!storageFileId) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'storageFileId wajib diisi.',
    })
  }

  if (!fileUrl) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'fileUrl wajib diisi.',
    })
  }

  if (!mimeType) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'mimeType wajib diisi.',
    })
  }

  if (
    typeof input.fileSizeBytes !== 'number' ||
    input.fileSizeBytes <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'fileSizeBytes harus berupa angka lebih dari 0.',
    })
  }

  if (!uploadedBy) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'uploadedBy wajib diisi.',
    })
  }

  const payload: CreateFileInput = {
    original_file_name:
      originalFileName,

    storage_provider:
      storageProvider,

    storage_file_id:
      storageFileId,

    file_url:
      fileUrl,

    mime_type:
      mimeType,

    file_size_bytes:
      input.fileSizeBytes,

    uploaded_by:
      uploadedBy,

    uploaded_at:
      input.uploadedAt,

    status:
      input.status?.trim() || undefined,
  }

  return await createFile(payload)
}