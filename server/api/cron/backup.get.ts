import { timingSafeEqual } from 'node:crypto'
import { runSpreadsheetBackup } from '../../services/backup.service'

/**
 * Dipanggil Vercel Cron sekali sehari (jadwal di nuxt.config.ts → nitro.vercel.config.crons), docs/08 K-32.
 * Vercel mengirim header `Authorization: Bearer <CRON_SECRET>`. Tanpa CRON_SECRET endpoint ini menolak semua permintaan.
 */
export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET?.trim()

  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'CRON_SECRET belum dikonfigurasi.' })
  }

  const received = Buffer.from(getHeader(event, 'authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Tidak diizinkan.' })
  }

  const result = await runSpreadsheetBackup('CRON')
  console.info(`Backup harian: ${result.fileName} (${result.tabs} tab, ${result.rows} baris, ${result.removed} backup lama dihapus).`)

  return { success: true, fileName: result.fileName, tabs: result.tabs, rows: result.rows, removed: result.removed }
})
