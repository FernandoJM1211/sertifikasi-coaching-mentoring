import { google, type sheets_v4 } from 'googleapis'

/**
 * Akses Google Sheets sebagai database.
 *
 * Ada dua spreadsheet:
 * - GOOGLE_SPREADSHEET_ID : data operasional (periode, pengajuan, dokumen, ...)
 * - AUTH_SPREADSHEET_ID   : data autentikasi (users, sessions, activation_tokens)
 *
 * Seluruh penulisan memakai valueInputOption RAW agar input pengguna
 * tidak pernah dieksekusi sebagai formula spreadsheet.
 */

let sheetsClient: sheets_v4.Sheets | null = null

/**
 * Kredensial Service Account:
 * - `GOOGLE_SERVICE_ACCOUNT_JSON` : isi file JSON (mentah atau base64) — untuk hosting tanpa
 *   file kredensial, mis. Vercel;
 * - `GOOGLE_APPLICATION_CREDENTIALS` : path file JSON — untuk development lokal.
 */
function readServiceAccountCredentials(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return null

  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')

  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON/base64 yang valid.')
  }
}

function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient

  const credentials = readServiceAccountCredentials()
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!credentials && !credentialsPath) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON atau GOOGLE_APPLICATION_CREDENTIALS belum dikonfigurasi.')
  }

  const auth = new google.auth.GoogleAuth({
    ...(credentials ? { credentials } : { keyFile: credentialsPath }),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  sheetsClient = google.sheets({ version: 'v4', auth })

  return sheetsClient
}

function getSpreadsheetId(envName: string): string {
  const spreadsheetId = process.env[envName]

  if (!spreadsheetId) {
    throw new Error(`${envName} belum dikonfigurasi.`)
  }

  return spreadsheetId
}

function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`
}

function createSheetStore(spreadsheetEnvName: string) {
  return {
    async getValues(sheetName: string): Promise<string[][]> {
      const response = await getSheetsClient().spreadsheets.values.get({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        range: quoteSheetName(sheetName),
      })

      return (response.data.values ?? []) as string[][]
    },

    async appendRow(sheetName: string, values: string[]): Promise<void> {
      await getSheetsClient().spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        range: quoteSheetName(sheetName),
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [values] },
      })
    },

    async appendRows(sheetName: string, rows: string[][]): Promise<void> {
      if (rows.length === 0) return

      await getSheetsClient().spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        range: quoteSheetName(sheetName),
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
      })
    },

    /** Memperbarui banyak baris sekaligus dalam satu request. */
    async updateRows(
      sheetName: string,
      updates: { rowNumber: number, values: string[] }[],
    ): Promise<void> {
      if (updates.length === 0) return

      await getSheetsClient().spreadsheets.values.batchUpdate({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        requestBody: {
          valueInputOption: 'RAW',
          data: updates.map((update) => ({
            range: `${quoteSheetName(sheetName)}!A${update.rowNumber}`,
            values: [update.values],
          })),
        },
      })
    },

    async updateRow(
      sheetName: string,
      rowNumber: number,
      values: string[],
    ): Promise<void> {
      await getSheetsClient().spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        range: `${quoteSheetName(sheetName)}!A${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: { values: [values] },
      })
    },
  }
}

const dataSheets = createSheetStore('GOOGLE_SPREADSHEET_ID')
const authSheets = createSheetStore('AUTH_SPREADSHEET_ID')

// Spreadsheet data operasional.
export const getSheetValues = dataSheets.getValues
export const appendSheetValues = dataSheets.appendRow
export const updateSheetRow = dataSheets.updateRow

// Spreadsheet autentikasi.
export const getAuthSheetValues = authSheets.getValues
export const appendAuthSheetValues = authSheets.appendRow
export const updateAuthSheetRow = authSheets.updateRow

export const appendSheetRows = dataSheets.appendRows
export const updateSheetRows = dataSheets.updateRows

/**
 * Mengganti seluruh baris anak milik satu induk (mis. riwayat pelatihan
 * milik satu CMSP-01) tanpa menghapus baris fisik:
 * - baris lama dipakai ulang (ditimpa) sesuai urutan,
 * - baris yang kurang ditambahkan di akhir sheet,
 * - baris lama yang berlebih dikosongkan.
 *
 * `buildRow(index, id)` menghasilkan isi baris. `id` adalah ID baris lama
 * jika slot dipakai ulang, atau ID baru (`idPrefix-000001`) untuk baris baru.
 */
export async function replaceChildRows(input: {
  sheetName: string
  parentColumnIndex: number
  parentId: string
  count: number
  columnCount: number
  idPrefix: string
  buildRow: (index: number, id: string) => string[]
}): Promise<void> {
  const rows = await getSheetValues(input.sheetName)

  let maxNumber = 0
  const idPattern = new RegExp(`^${input.idPrefix}-(\\d+)$`)

  for (const row of rows.slice(1)) {
    const match = (row[0] ?? '').match(idPattern)
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]))
  }

  const nextId = () => {
    maxNumber += 1
    return `${input.idPrefix}-${String(maxNumber).padStart(6, '0')}`
  }

  const existingRowNumbers: { rowNumber: number, id: string }[] = []

  rows.forEach((row, index) => {
    if (index > 0 && row[input.parentColumnIndex] === input.parentId) {
      existingRowNumbers.push({ rowNumber: index + 1, id: row[0] ?? '' })
    }
  })

  const updates: { rowNumber: number, values: string[] }[] = []
  const appends: string[][] = []

  for (let index = 0; index < input.count; index++) {
    const slot = existingRowNumbers[index]

    if (slot) {
      updates.push({ rowNumber: slot.rowNumber, values: input.buildRow(index, slot.id) })
    } else {
      appends.push(input.buildRow(index, nextId()))
    }
  }

  // Kosongkan baris lama yang sudah tidak dipakai.
  for (const slot of existingRowNumbers.slice(input.count)) {
    updates.push({
      rowNumber: slot.rowNumber,
      values: Array.from({ length: input.columnCount }, () => ''),
    })
  }

  await updateSheetRows(input.sheetName, updates)
  await appendSheetRows(input.sheetName, appends)
}
