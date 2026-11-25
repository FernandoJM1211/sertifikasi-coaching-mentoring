import { submitRemedial } from '../../../../../services/final-result.service'
import { isGoogleDriveLink, REMEDIAL_LINK_MAX, REMEDIAL_NOTE_MAX } from '../../../../../../shared/utils/final-result'

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

/** Peserta Remedial: kirim / ubah link Google Drive tugas remedial (selama tahap Pengumuman dibuka). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const body = (await readBody(event)) as unknown

  if (!body || typeof body !== 'object') badRequest('Data tugas remedial tidak valid.')
  const { drive_link: rawLink, note: rawNote } = body as Record<string, unknown>

  if (typeof rawLink !== 'string' || !rawLink.trim()) badRequest('Link Google Drive wajib diisi.')
  const driveLink = rawLink.trim()
  if (driveLink.length > REMEDIAL_LINK_MAX) badRequest(`Link maksimal ${REMEDIAL_LINK_MAX} karakter.`)
  if (!isGoogleDriveLink(driveLink)) badRequest('Link harus berupa link Google Drive (https://drive.google.com/...).')

  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') badRequest('Catatan tidak valid.')
  const note = typeof rawNote === 'string' ? rawNote.trim() : ''
  if (note.length > REMEDIAL_NOTE_MAX) badRequest(`Catatan maksimal ${REMEDIAL_NOTE_MAX} karakter.`)

  const data = await submitRemedial(user, applicationId, { drive_link: driveLink, note })

  return {
    success: true,
    message: data.updated ? 'Tugas remedial berhasil diperbarui.' : 'Tugas remedial berhasil dikirim.',
    data,
  }
})
