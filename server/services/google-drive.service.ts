import { google } from 'googleapis'
import { Readable } from 'node:stream'

import {
  googleOAuthClient,
  loadGoogleOAuthTokens,
} from './google-oauth.service'

const googleDriveFolderId =
  process.env.GOOGLE_DRIVE_FOLDER_ID

if (!googleDriveFolderId) {
  throw new Error(
    'GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi.',
  )
}

function getGoogleDriveFolderId(): string {
  if (!googleDriveFolderId) {
    throw new Error(
      'GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi.',
    )
  }

  return googleDriveFolderId
}

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

async function getGoogleDriveClient() {
  const tokens =
    await loadGoogleOAuthTokens()

  if (!tokens?.refresh_token) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'OAuth Google Drive belum terhubung. Refresh token tidak ditemukan.',
    })
  }

  googleOAuthClient.setCredentials({
    refresh_token: tokens.refresh_token,
  })

  return google.drive({
    version: 'v3',
    auth: googleOAuthClient,
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

  const drive =
    await getGoogleDriveClient()

  const createFileRequest = {
    requestBody: {
      name: input.fileName,
      parents: [
        getGoogleDriveFolderId(),
      ],
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.buffer),
    },
    fields:
      'id,name,mimeType,size,webViewLink',
  }

  const response =
    await drive.files.create(
      createFileRequest,
    )

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
    fileName:
      file.name ?? input.fileName,
    mimeType:
      file.mimeType ?? input.mimeType,
    fileSizeBytes:
      Number(
        file.size ??
          input.buffer.length,
      ),
  }
}

/**
 * Mengambil isi berkas dari Google Drive untuk kebutuhan preview.
 * Menggunakan autentikasi OAuth aplikasi, bukan URL publik.
 */
export async function getGoogleDriveFileForPreview(
  storageFileId: string,
) {
  if (!storageFileId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'ID file Google Drive wajib diisi.',
    })
  }

  const drive = await getGoogleDriveClient()

  const response = await drive.files.get(
    {
      fileId: storageFileId,
      alt: 'media',
    },
    {
      responseType: 'stream',
    },
  )

  return response.data
}