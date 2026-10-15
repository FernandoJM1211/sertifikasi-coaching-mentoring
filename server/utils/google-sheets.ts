import { google } from 'googleapis'

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
const credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!spreadsheetId) {
  throw new Error(
    'GOOGLE_SPREADSHEET_ID belum dikonfigurasi.',
  )
}

if (!credentialsPath) {
  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS belum dikonfigurasi.',
  )
}

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
})

const sheets = google.sheets({
  version: 'v4',
  auth,
})

export async function getSheetValues(
  sheetName: string,
) {
  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    })

  return response.data.values ?? []
}

export async function appendSheetValues(
  sheetName: string,
  values: string[],
) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values],
    },
  })
}

export async function updateSheetRow(
  sheetName: string,
  rowNumber: number,
  values: string[],
) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [values],
    },
  })
}