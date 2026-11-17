import { listHomePeriods } from '../../services/home.service'

/** Beranda staf: periode aktif yang relevan dengan role pengguna + timeline-nya. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN', 'VERIFIKATOR', 'TECHNICAL_ASSESSOR'])

  return { success: true, data: await listHomePeriods(user) }
})
