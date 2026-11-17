import { Readable } from 'node:stream'
import { google } from 'googleapis'

import { getAuthorizedGoogleClient } from './google-oauth.service'

export interface UploadToGoogleDriveInput {
  fileName: string
  mimeType: string
  buffer: Buffer
}

export interface UploadedGoogleDriveFile {
  storageFileId: string
  fileUrl: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
}

function getGoogleDriveFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi.')
  }

  return folderId
}

/**
 * Mengubah error otorisasi Google menjadi pesan yang jelas.
 * `invalid_grant` = refresh token dicabut/kedaluwarsa (mis. aplikasi OAuth
 * masih berstatus "Testing" sehingga token hanya berlaku 7 hari).
 */
function handleDriveError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('invalid_grant')) {
    console.error('Google Drive OAuth: refresh token tidak valid (invalid_grant).')

    throw createError({
      statusCode: 503,
      statusMessage:
        'Koneksi Google Drive sistem sudah kedaluwarsa. Silakan hubungi Super Admin untuk menghubungkan ulang Google Drive.',
    })
  }

  throw error
}

async function getGoogleDriveClient() {
  return google.drive({
    version: 'v3',
    auth: await getAuthorizedGoogleClient(),
  })
}

export async function uploadToGoogleDrive(
  input: UploadToGoogleDriveInput,
): Promise<UploadedGoogleDriveFile> {
  if (!input.fileName.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nama file wajib diisi.',
    })
  }

  if (!input.mimeType.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'MIME type wajib diisi.',
    })
  }

  if (!input.buffer || input.buffer.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File kosong atau tidak valid.',
    })
  }

  const drive = await getGoogleDriveClient()

  const response = await drive.files.create({
    requestBody: {
      name: input.fileName,
      parents: [getGoogleDriveFolderId()],
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.buffer),
    },
    fields: 'id,name,mimeType,size,webViewLink',
  }).catch(handleDriveError)

  const file = response.data

  if (!file?.id) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'File berhasil diunggah tetapi ID file Google Drive tidak ditemukan.',
    })
  }

  return {
    storageFileId: file.id,
    fileUrl:
      file.webViewLink ??
      `https://drive.google.com/file/d/${file.id}/view`,
    fileName: file.name ?? input.fileName,
    mimeType: file.mimeType ?? input.mimeType,
    fileSizeBytes: Number(file.size ?? input.buffer.length),
  }
}

/** Mengganti nama berkas di Google Drive (mis. setelah pendaftaran lengkap). */
export async function renameGoogleDriveFile(storageFileId: string, fileName: string): Promise<void> {
  const drive = await getGoogleDriveClient()

  await drive.files.update({
    fileId: storageFileId,
    requestBody: { name: fileName },
  }).catch(handleDriveError)
}

/**
 * Mengunduh isi berkas dari Google Drive melalui backend,
 * sehingga berkas tidak perlu dibagikan secara publik.
 */
export async function downloadGoogleDriveFile(
  storageFileId: string,
): Promise<Buffer> {
  if (!storageFileId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID file Google Drive wajib diisi.',
    })
  }

  const drive = await getGoogleDriveClient()

  const response = await drive.files.get(
    { fileId: storageFileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  ).catch(handleDriveError)

  return Buffer.from(response.data as ArrayBuffer)
}
