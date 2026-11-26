import { runSpreadsheetBackup } from '../../../services/backup.service'

/** Tombol "Backup Sekarang" di beranda Super Admin (docs/08 K-32). */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

  const result = await runSpreadsheetBackup('MANUAL')

  return {
    success: true,
    message: `${result.fileName} dibuat (${result.tabs} tab, ${result.rows} baris).`,
    url: result.url,
  }
})
