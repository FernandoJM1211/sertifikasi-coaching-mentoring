import { google } from 'googleapis'
import { getAuthorizedGoogleClient } from './google-oauth.service'
import { readSpreadsheetSnapshot } from '../utils/google-sheets'

/**
 * Backup harian spreadsheet ke folder Drive terpisah (docs/08 K-32).
 *
 * - Isi: semua tab spreadsheet Data + tab `users` & `audit_logs` dari spreadsheet Auth
 *   (diberi awalan `auth_`). Sesi & token tidak ikut karena sementara.
 * - Ditulis sebagai spreadsheet BARU milik akun Drive aplikasi di folder "CMSP Backup" (dibuat otomatis,
 *   terpisah dari folder unggahan). Folder ini berisi hash kata sandi: JANGAN dibagikan.
 * - Retensi: 14 backup harian terbaru + backup pertama tiap bulan selama 12 bulan; sisanya ke Sampah Drive.
 * - Pemulihan dilakukan manual (salin tab dari file backup).
 */

const BACKUP_FOLDER_NAME = 'CMSP Backup'
const BACKUP_MARK = 'cmspBackup'
const AUTH_TABS = new Set(['users', 'audit_logs'])
const KEEP_DAILY = 14
const KEEP_MONTHLY = 12
/** Tombol "Backup Sekarang" tidak boleh berulang dalam waktu singkat. */
const MANUAL_COOLDOWN_MS = 2 * 60 * 1000
/** Backup dianggap terlambat bila yang terakhir lebih tua dari ini. */
const STALE_AFTER_MS = 48 * 60 * 60 * 1000

async function getClients() {
  const auth = await getAuthorizedGoogleClient()
  return { drive: google.drive({ version: 'v3', auth }), sheets: google.sheets({ version: 'v4', auth }) }
}

type Clients = Awaited<ReturnType<typeof getClients>>

async function findOrCreateFolder({ drive }: Clients): Promise<string> {
  const existing = await drive.files.list({
    q: `name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and appProperties has { key='${BACKUP_MARK}' and value='folder' }`,
    fields: 'files(id)',
    pageSize: 1,
  })
  const found = existing.data.files?.[0]?.id
  if (found) return found

  const created = await drive.files.create({
    requestBody: {
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      appProperties: { [BACKUP_MARK]: 'folder' },
    },
    fields: 'id',
  })

  return created.data.id!
}

type BackupFile = { id: string, name: string, createdTime: string, webViewLink: string }

async function listBackups({ drive }: Clients, folderId: string): Promise<BackupFile[]> {
  const files: BackupFile[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and appProperties has { key='${BACKUP_MARK}' and value='snapshot' }`,
      fields: 'nextPageToken, files(id, name, createdTime, webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      pageToken,
    })
    for (const file of response.data.files ?? []) {
      if (file.id && file.createdTime) {
        files.push({ id: file.id, name: file.name ?? '', createdTime: file.createdTime, webViewLink: file.webViewLink ?? '' })
      }
    }
    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  return files
}

/** Format waktu WIB untuk nama file, mis. "2026-11-26 02.00". */
function wibStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}.${get('minute')}`
}

/** File yang dipertahankan: 14 terbaru + yang pertama tiap bulan (12 bulan terakhir). */
export function selectBackupsToRemove(files: BackupFile[]): BackupFile[] {
  const sorted = [...files].sort((a, b) => b.createdTime.localeCompare(a.createdTime))
  const keep = new Set(sorted.slice(0, KEEP_DAILY).map((file) => file.id))

  const firstOfMonth = new Map<string, BackupFile>()
  for (const file of sorted) {
    const month = wibStamp(new Date(file.createdTime)).slice(0, 7)
    const current = firstOfMonth.get(month)
    if (!current || file.createdTime < current.createdTime) firstOfMonth.set(month, file)
  }
  const months = [...firstOfMonth.keys()].sort().reverse().slice(0, KEEP_MONTHLY)
  for (const month of months) keep.add(firstOfMonth.get(month)!.id)

  return sorted.filter((file) => !keep.has(file.id))
}

export type BackupResult = {
  fileName: string
  url: string
  tabs: number
  rows: number
  removed: number
}

export async function runSpreadsheetBackup(trigger: 'CRON' | 'MANUAL'): Promise<BackupResult> {
  const clients = await getClients()
  const folderId = await findOrCreateFolder(clients)

  if (trigger === 'MANUAL') {
    const [latest] = await listBackups(clients, folderId)
    if (latest && Date.now() - Date.parse(latest.createdTime) < MANUAL_COOLDOWN_MS) {
      throw createError({ statusCode: 429, statusMessage: 'Backup baru saja dibuat. Coba lagi beberapa menit lagi.' })
    }
  }

  const [dataTabs, authTabs] = await Promise.all([
    readSpreadsheetSnapshot('DATA'),
    readSpreadsheetSnapshot('AUTH', (title) => AUTH_TABS.has(title)),
  ])

  const now = new Date()
  const tabs = [
    ...dataTabs,
    ...authTabs.map((tab) => ({ title: `auth_${tab.title}`, values: tab.values })),
  ]
  const info = [
    ['Backup Sertifikasi CMSP'],
    ['Waktu (WIB)', wibStamp(now)],
    ['Pemicu', trigger === 'CRON' ? 'Otomatis harian' : 'Manual (Super Admin)'],
    ['Catatan', 'Salinan baca-saja. Untuk memulihkan, salin tab yang dibutuhkan ke spreadsheet utama di luar jam pakai.'],
    [],
    ['Tab', 'Sumber', 'Jumlah baris data'],
    ...tabs.map((tab) => [
      tab.title,
      tab.title.startsWith('auth_') ? 'Auth' : 'Data',
      String(Math.max(tab.values.length - 1, 0)),
    ]),
  ]

  const fileName = `CMSP Backup ${wibStamp(now)}`
  const allTabs = [{ title: '_info', values: info }, ...tabs]

  const created = await clients.sheets.spreadsheets.create({
    requestBody: {
      properties: { title: fileName, timeZone: 'Asia/Jakarta' },
      sheets: allTabs.map((tab) => ({ properties: { title: tab.title } })),
    },
    fields: 'spreadsheetId,spreadsheetUrl',
  })
  const spreadsheetId = created.data.spreadsheetId!

  // RAW: teks berawalan "=" tetap teks, tidak dijalankan sebagai rumus.
  const data = allTabs
    .filter((tab) => tab.values.length > 0)
    .map((tab) => ({ range: `'${tab.title.replace(/'/g, "''")}'!A1`, values: tab.values }))
  if (data.length > 0) {
    await clients.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data },
    })
  }

  // Pindahkan ke folder backup & tandai agar retensi hanya menyentuh file backup.
  const current = await clients.drive.files.get({ fileId: spreadsheetId, fields: 'parents' })
  await clients.drive.files.update({
    fileId: spreadsheetId,
    addParents: folderId,
    removeParents: (current.data.parents ?? []).join(','),
    requestBody: { appProperties: { [BACKUP_MARK]: 'snapshot' } },
    fields: 'id',
  })

  // Retensi: kegagalan membersihkan tidak menggagalkan backup.
  let removed = 0
  try {
    for (const file of selectBackupsToRemove(await listBackups(clients, folderId))) {
      await clients.drive.files.update({ fileId: file.id, requestBody: { trashed: true } })
      removed++
    }
  } catch (error) {
    console.error('Gagal membersihkan backup lama:', error)
  }

  return {
    fileName,
    url: created.data.spreadsheetUrl ?? '',
    tabs: tabs.length,
    rows: tabs.reduce((sum, tab) => sum + Math.max(tab.values.length - 1, 0), 0),
    removed,
  }
}

export type BackupStatus = {
  available: boolean
  lastBackupAt: string
  lastBackupUrl: string
  folderUrl: string
  count: number
  stale: boolean
}

/** Status untuk beranda Super Admin. `available=false` bila Drive tidak dapat diakses. */
export async function getBackupStatus(): Promise<BackupStatus> {
  try {
    const clients = await getClients()
    const folderId = await findOrCreateFolder(clients)
    const files = await listBackups(clients, folderId)
    const latest = files[0]

    return {
      available: true,
      lastBackupAt: latest?.createdTime ?? '',
      lastBackupUrl: latest?.webViewLink ?? '',
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      count: files.length,
      stale: !latest || Date.now() - Date.parse(latest.createdTime) > STALE_AFTER_MS,
    }
  } catch (error) {
    console.error('Gagal membaca status backup:', error)
    return { available: false, lastBackupAt: '', lastBackupUrl: '', folderUrl: '', count: 0, stale: true }
  }
}
