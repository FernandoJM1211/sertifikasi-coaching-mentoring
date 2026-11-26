import { getBackupStatus } from '../../../services/backup.service'

/** Status backup terakhir untuk beranda Super Admin (docs/08 K-32). */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

  return await getBackupStatus()
})
