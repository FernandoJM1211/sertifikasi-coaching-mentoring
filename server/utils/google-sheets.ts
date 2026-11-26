import { createError } from 'h3'
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

/* ------------------------------------------------------------------ */
/* Kuota Google Sheets API                                             */
/* ------------------------------------------------------------------ */
/*
 * Google membatasi ±60 permintaan baca per menit per akun (service account). Repository membaca
 * satu sheet utuh setiap dipanggil, sehingga satu aksi (mis. simpan draft self assessment) bisa
 * membaca sheet yang sama berkali-kali. Untuk menghemat kuota:
 * 1. Cache baca singkat (READ_CACHE_TTL_MS) per sheet + penggabungan pembacaan bersamaan.
 *    Pemanggil boleh menerima data lebih lama lewat `maxAgeMs` (mis. cek sesi login di
 *    `requireUser`), atau memaksa baca langsung lewat `fresh`.
 * 2. Write-through: setelah UPDATE berhasil, baris di cache diganti nilai baru (cache tidak
 *    dihapus), sehingga penulisan beruntun (mis. autosave tes tertulis) tidak memicu baca ulang.
 *    APPEND tetap menghapus cache sheet. (Antar-instance server, data bisa tertinggal maks. TTL.)
 * 3. Coba ulang otomatis bila Google membalas 429 (kuota habis) / 5xx sementara.
 */

const READ_CACHE_TTL_MS = 3_000
/** Umur cache terpanjang yang boleh diminta pemanggil (`maxAgeMs`). */
const READ_CACHE_TTL_MAX_MS = 30_000
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000]

/** `rows` terisi setelah pembacaan selesai (dipakai untuk write-through). */
type CacheEntry = { fetchedAt: number, promise: Promise<string[][]>, rows?: string[][] }

/** Opsi baca: `fresh` = abaikan cache; `maxAgeMs` = umur cache maksimum yang diterima. */
export type ReadOptions = { fresh?: boolean, maxAgeMs?: number }
const readCache = new Map<string, CacheEntry>()

function errorStatus(error: unknown): number {
  const value = error as { code?: unknown, status?: unknown, response?: { status?: unknown } } | null
  return Number(value?.response?.status ?? value?.code ?? value?.status)
}

function isRetryableError(error: unknown, onlyQuota: boolean): boolean {
  const status = errorStatus(error)
  if (status === 429) return true
  return !onlyQuota && (status === 500 || status === 502 || status === 503)
}

async function withRetry<T>(operation: () => Promise<T>, options: { onlyQuota?: boolean } = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt]
      if (delay === undefined || !isRetryableError(error, Boolean(options.onlyQuota))) throw error
      // Jitter kecil agar permintaan yang gagal bersamaan tidak mencoba ulang serentak.
      await new Promise((resolve) => setTimeout(resolve, delay + Math.floor(Math.random() * 300)))
    }
  }
}

/** Salinan baris agar pemanggil tidak mengubah isi cache. */
const cloneRows = (rows: string[][]) => rows.map((row) => [...row])

const ID_VERIFY_ATTEMPTS = 5

/* Antrean per sheet (dalam satu instance server) untuk pembuatan ID. */
const sheetLocks = new Map<string, Promise<unknown>>()

function withSheetLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = sheetLocks.get(key) ?? Promise.resolve()
  const run = previous.catch(() => undefined).then(operation)
  const tail = run.catch(() => undefined)

  sheetLocks.set(key, tail)
  void tail.then(() => {
    if (sheetLocks.get(key) === tail) sheetLocks.delete(key)
  })

  return run
}

function createSheetStore(spreadsheetEnvName: string) {
  const cacheKey = (sheetName: string) => `${spreadsheetEnvName}:${sheetName}`
  const invalidate = (sheetName: string) => readCache.delete(cacheKey(sheetName))

  const store = {
    async getValues(sheetName: string, options: ReadOptions = {}): Promise<string[][]> {
      const key = cacheKey(sheetName)
      const cached = readCache.get(key)
      const maxAgeMs = Math.min(options.maxAgeMs ?? READ_CACHE_TTL_MS, READ_CACHE_TTL_MAX_MS)

      if (!options.fresh && cached && Date.now() - cached.fetchedAt < maxAgeMs) {
        return cloneRows(await cached.promise)
      }

      const promise = withRetry(async () => {
        const response = await getSheetsClient().spreadsheets.values.get({
          spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
          range: quoteSheetName(sheetName),
        })

        return (response.data.values ?? []) as string[][]
      })

      const entry: CacheEntry = { fetchedAt: Date.now(), promise }
      readCache.set(key, entry)
      promise.then((rows) => { entry.rows = rows }, () => undefined)

      try {
        return cloneRows(await promise)
      } catch (error) {
        // Pembacaan gagal tidak disimpan di cache.
        if (readCache.get(key) === entry) readCache.delete(key)
        throw error
      }
    },

    async appendRow(sheetName: string, values: string[]): Promise<void> {
      await write(sheetName, () => getSheetsClient().spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        range: quoteSheetName(sheetName),
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [values] },
      }))
    },

    async appendRows(sheetName: string, rows: string[][]): Promise<void> {
      if (rows.length === 0) return

      await write(sheetName, () => getSheetsClient().spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        range: quoteSheetName(sheetName),
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
      }))
    },

    appendRowsWithIds,

    /** Memperbarui banyak baris sekaligus dalam satu request. */
    async updateRows(
      sheetName: string,
      updates: { rowNumber: number, values: string[] }[],
    ): Promise<void> {
      if (updates.length === 0) return

      await writeUpdates(sheetName, updates, () => getSheetsClient().spreadsheets.values.batchUpdate({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        requestBody: {
          valueInputOption: 'RAW',
          data: updates.map((update) => ({
            range: `${quoteSheetName(sheetName)}!A${update.rowNumber}`,
            values: [update.values],
          })),
        },
      }))
    },

    async updateRow(
      sheetName: string,
      rowNumber: number,
      values: string[],
    ): Promise<void> {
      await writeUpdates(sheetName, [{ rowNumber, values }], () => getSheetsClient().spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        range: `${quoteSheetName(sheetName)}!A${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: { values: [values] },
      }))
    },
  }

  return store

  /** Append lalu kembalikan nomor baris pertama yang ditulis (dibaca dari `updatedRange`). */
  async function appendAndLocate(sheetName: string, rows: string[][]): Promise<number | null> {
    let startRow: number | null = null

    await write(sheetName, async () => {
      const response = await getSheetsClient().spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(spreadsheetEnvName),
        range: quoteSheetName(sheetName),
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
      })
      const match = (response.data.updates?.updatedRange ?? '').match(/![A-Z]+(\d+)/)
      startRow = match ? Number(match[1]) : null
    })

    return startRow
  }

  /**
   * Menambah baris baru dengan ID berurutan (`PREFIX-000001` di kolom A) yang dijamin unik,
   * termasuk saat beberapa permintaan atau instance server menulis bersamaan.
   *
   * 1. Dalam satu instance, pembuatan ID per sheet diantrekan.
   * 2. Setelah append, sheet dibaca ulang. Bila ID bentrok, baris ini diberi nomor baru lalu
   *    diperiksa lagi. Aturan: baris asli mengalah pada baris ber-ID sama di atasnya; baris yang
   *    sudah dinomori ulang mengalah pada baris mana pun. Jadi dua baris tidak bisa sama-sama
   *    mempertahankan ID yang sama.
   *
   * `make(id, index)` membuat data baris, `toRow` mengubahnya menjadi nilai sel (ID di indeks 0).
   */
  async function appendRowsWithIds<T>(
    sheetName: string,
    idPrefix: string,
    count: number,
    make: (id: string, index: number) => T,
    toRow: (item: T) => string[],
  ): Promise<T[]> {
    if (count <= 0) return []

    return withSheetLock(cacheKey(sheetName), async () => {
      const pattern = new RegExp(`^${idPrefix}-(\\d+)$`)
      const formatId = (number: number) => `${idPrefix}-${String(number).padStart(6, '0')}`
      const maxIdNumber = (rows: string[][]) => rows.slice(1).reduce((max, row) => {
        const match = (row[0] ?? '').match(pattern)
        return match ? Math.max(max, Number(match[1])) : max
      }, 0)

      let max = maxIdNumber(await store.getValues(sheetName))
      const items = Array.from({ length: count }, (_, index) => make(formatId(++max), index))
      const startRow = await appendAndLocate(sheetName, items.map(toRow))

      // Nomor baris tidak terbaca (seharusnya tidak terjadi): verifikasi dilewati.
      if (startRow === null) return items

      const renumbered = new Set<number>()

      for (let attempt = 0; attempt < ID_VERIFY_ATTEMPTS; attempt++) {
        const rows = await store.getValues(sheetName, { fresh: true })
        const conflicts = items.flatMap((item, index) => {
          const rowNumber = startRow + index
          const id = toRow(item)[0]
          const clash = rows.some((row, rowIndex) =>
            rowIndex > 0
            && rowIndex + 1 !== rowNumber
            && row[0] === id
            && (renumbered.has(index) || rowIndex + 1 < rowNumber))
          return clash ? [index] : []
        })

        if (conflicts.length === 0) return items

        max = Math.max(max, maxIdNumber(rows))
        await store.updateRows(sheetName, conflicts.map((index) => {
          const item = make(formatId(++max), index)
          items[index] = item
          renumbered.add(index)
          return { rowNumber: startRow + index, values: toRow(item) }
        }))

        // Jeda acak agar instance lain yang juga menomori ulang tidak bentrok lagi.
        await new Promise((resolve) => setTimeout(resolve, 200 + Math.floor(Math.random() * 400)))
      }

      throw createError({
        statusCode: 503,
        statusMessage: 'Sistem sedang sibuk. Silakan coba lagi beberapa saat.',
      })
    })
  }

  /**
   * Update baris: setelah berhasil, baris di cache diganti nilai baru (write-through) bila cache
   * sudah terisi; bila cache sedang dibaca/kosong, cache dihapus. Gagal → cache dihapus.
   */
  async function writeUpdates(
    sheetName: string,
    updates: { rowNumber: number, values: string[] }[],
    operation: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await withRetry(operation, { onlyQuota: true })
    } catch (error) {
      invalidate(sheetName)
      throw error
    }

    const key = cacheKey(sheetName)
    const entry = readCache.get(key)

    if (!entry?.rows || Date.now() - entry.fetchedAt >= READ_CACHE_TTL_MAX_MS) {
      readCache.delete(key)
      return
    }

    const rows = cloneRows(entry.rows)

    for (const update of updates) {
      while (rows.length < update.rowNumber) rows.push([])
      const previous = rows[update.rowNumber - 1] ?? []
      // Sel di luar panjang `values` tidak ikut ditulis ke sheet, jadi nilainya dipertahankan.
      rows[update.rowNumber - 1] = [...update.values, ...previous.slice(update.values.length)]
    }

    readCache.set(key, { fetchedAt: entry.fetchedAt, promise: Promise.resolve(rows), rows })
  }

  /**
   * Penulisan (append): cache sheet dihapus sebelum & sesudah menulis. Coba ulang HANYA untuk 429
   * (permintaan ditolak sebelum diproses) — pada 5xx penulisan mungkin sudah tersimpan,
   * sehingga mengulang `append` bisa membuat baris ganda.
   */
  async function write(sheetName: string, operation: () => Promise<unknown>): Promise<void> {
    invalidate(sheetName)
    try {
      await withRetry(operation, { onlyQuota: true })
    } finally {
      invalidate(sheetName)
    }
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
export const updateAuthSheetRows = authSheets.updateRows

export const appendSheetRows = dataSheets.appendRows
export const updateSheetRows = dataSheets.updateRows

/** Menambah baris dengan ID unik berurutan (lihat `appendRowsWithIds`). */
export const appendSheetRowsWithIds = dataSheets.appendRowsWithIds
export const appendAuthSheetRowsWithIds = authSheets.appendRowsWithIds

/**
 * Mengganti seluruh baris anak milik satu induk (mis. riwayat pelatihan
 * milik satu CMSP-01) tanpa menghapus baris fisik:
 * - baris lama dipakai ulang (ditimpa) sesuai urutan,
 * - baris yang kurang ditambahkan di akhir sheet,
 * - baris lama yang berlebih dikosongkan.
 *
 * `buildRow(index, id)` menghasilkan isi baris. `id` adalah ID baris lama
 * jika slot dipakai ulang, atau ID baru unik (`idPrefix-000001`) untuk baris baru.
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

  const existingRowNumbers: { rowNumber: number, id: string }[] = []

  rows.forEach((row, index) => {
    if (index > 0 && row[input.parentColumnIndex] === input.parentId) {
      existingRowNumbers.push({ rowNumber: index + 1, id: row[0] ?? '' })
    }
  })

  const updates: { rowNumber: number, values: string[] }[] = []
  const reused = Math.min(existingRowNumbers.length, input.count)

  for (let index = 0; index < reused; index++) {
    const slot = existingRowNumbers[index]!
    updates.push({ rowNumber: slot.rowNumber, values: input.buildRow(index, slot.id) })
  }

  // Kosongkan baris lama yang sudah tidak dipakai.
  for (const slot of existingRowNumbers.slice(input.count)) {
    updates.push({
      rowNumber: slot.rowNumber,
      values: Array.from({ length: input.columnCount }, () => ''),
    })
  }

  await updateSheetRows(input.sheetName, updates)
  await appendSheetRowsWithIds(
    input.sheetName,
    input.idPrefix,
    input.count - reused,
    (id, index) => input.buildRow(reused + index, id),
    (row) => row,
  )
}

/**
 * Membaca seluruh tab satu spreadsheet sekaligus untuk backup (docs/08 K-32): 1 permintaan daftar tab +
 * 1 permintaan `batchGet`. Tidak memakai cache. `includeTab` menyaring tab yang ikut dibaca.
 */
export async function readSpreadsheetSnapshot(
  spreadsheet: 'DATA' | 'AUTH',
  includeTab: (title: string) => boolean = () => true,
): Promise<{ title: string, values: string[][] }[]> {
  const spreadsheetId = getSpreadsheetId(spreadsheet === 'DATA' ? 'GOOGLE_SPREADSHEET_ID' : 'AUTH_SPREADSHEET_ID')
  const client = getSheetsClient()

  const meta = await withRetry(() => client.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  }))
  const titles = (meta.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title ?? '')
    .filter((title) => title && includeTab(title))

  if (titles.length === 0) return []

  const response = await withRetry(() => client.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: titles.map(quoteSheetName),
    valueRenderOption: 'UNFORMATTED_VALUE',
  }))

  return titles.map((title, index) => ({
    title,
    values: ((response.data.valueRanges?.[index]?.values ?? []) as unknown[][])
      .map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))),
  }))
}
