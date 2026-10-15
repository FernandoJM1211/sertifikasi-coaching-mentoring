import { google } from 'googleapis'

const credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!credentialsPath) {
  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS belum dikonfigurasi.',
  )
}

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: [
    'https://www.googleapis.com/auth/drive',
  ],
})

const drive = google.drive({
  version: 'v3',
  auth,
})

export default defineEventHandler(async () => {
  const response = await drive.files.list({
    q: "name = 'Database Dokumen Sertifikasi' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'files(id,name,mimeType,parents,driveId)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  return {
  success: true,
  message: 'Pencarian folder Google Drive berhasil.',
  folders:
    response.data.files?.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      parents: file.parents,
      driveId: file.driveId,
    })) ?? [],
}
})