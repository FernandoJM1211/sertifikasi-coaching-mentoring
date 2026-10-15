import { google } from 'googleapis'

import {
  googleOAuthClient,
  loadGoogleOAuthTokens,
} from '../../../../../services/google-oauth.service'

import {
  findApplicationDocumentsByApplicationId,
} from '../../../../../repositories/application-document.repository'

import {
  findFileById,
} from '../../../../../repositories/file.repository'

export default defineEventHandler(async (event) => {
  const applicationId =
    getRouterParam(event, 'applicationId')?.trim()

  const applicationDocumentId =
    getRouterParam(event, 'applicationDocumentId')?.trim()

  if (!applicationId || !applicationDocumentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID pengajuan dan dokumen wajib diisi.',
    })
  }

  // Pastikan dokumen benar-benar milik pengajuan pada URL.
  const applicationDocuments =
    await findApplicationDocumentsByApplicationId(applicationId)

  const applicationDocument =
    applicationDocuments.find(
      (item) =>
        item.application_document_id === applicationDocumentId,
    )

  if (!applicationDocument) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dokumen pengajuan tidak ditemukan.',
    })
  }

  const file = await findFileById(applicationDocument.file_id)

  if (!file || file.storage_provider !== 'GOOGLE_DRIVE') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Berkas tidak ditemukan atau penyimpanan tidak didukung.',
    })
  }

  const tokens = await loadGoogleOAuthTokens()

  if (!tokens?.refresh_token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OAuth Google Drive belum terhubung.',
    })
  }

  googleOAuthClient.setCredentials({
    refresh_token: tokens.refresh_token,
  })

  const drive = google.drive({
    version: 'v3',
    auth: googleOAuthClient,
  })

  // Unduh berkas melalui backend agar akses tidak bergantung
  // pada izin publik Google Drive.
  const response = await drive.files.get(
    {
      fileId: file.storage_file_id,
      alt: 'media',
    },
    {
      responseType: 'arraybuffer',
    },
  )

  const buffer = Buffer.from(response.data as ArrayBuffer)

  setResponseHeaders(event, {
    'Content-Type': file.mime_type || 'application/octet-stream',
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })

  return buffer
})