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
  const response = await drive.about.get({
    fields: 'user(displayName,emailAddress,permissionId)',
  })

  return {
    success: true,
    message: 'Identitas Google Drive berhasil dibaca.',
    email:
      response.data.user?.emailAddress ?? null,
    displayName:
      response.data.user?.displayName ?? null,
    permissionId:
      response.data.user?.permissionId ?? null,
  }
})