import { getPesertaAnnouncement } from '../../../../../services/final-result.service'

/** Peserta: pengumuman hasil sertifikasi & status tugas remedial (tampil sejak awal tahap Pengumuman). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  return { success: true, data: await getPesertaAnnouncement(user, applicationId) }
})
