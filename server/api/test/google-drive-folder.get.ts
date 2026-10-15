import { google } from 'googleapis'

const credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS

const folderId =
  process.env.GOOGLE_DRIVE_FOLDER_ID

if (!credentialsPath) {
  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS belum dikonfigurasi.',
  )
}

if (!folderId) {
  throw new Error(
    'GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi.',
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
  const response = await drive.files.get({
    fileId: folderId,
    fields: 'id,name,mimeType,parents,driveId',
    supportsAllDrives: true,
  })

  return {
    success: true,
    message: 'Folder Google Drive berhasil ditemukan.',
    data: response.data,
  }
})