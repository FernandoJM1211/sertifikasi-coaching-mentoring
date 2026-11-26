import { checkGoogleDriveConnection } from '../../../services/google-oauth.service'

/** Status koneksi Google Drive aplikasi untuk beranda Super Admin (docs/08 K-31). */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])

  const force = getQuery(event).refresh === '1'

  return await checkGoogleDriveConnection({ force })
})
