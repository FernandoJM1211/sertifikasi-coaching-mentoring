
import {
  findCertificationTimelineById,
  updateCertificationTimelineOverride,
} from '../../../repositories/certification-timeline.repository'

const ALLOWED_MODES = ['NORMAL', 'OPEN', 'CLOSED'] as const

type OverrideMode = typeof ALLOWED_MODES[number]

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const timelineId = requireRouterParam(event, 'timelineId', 'ID timeline')

  // Validasi mode yang diminta.
  const body = await readBody<{ mode?: unknown }>(event)
  const mode =
    typeof body?.mode === 'string' ? body.mode.trim().toUpperCase() : ''

  if (!mode || !ALLOWED_MODES.includes(mode as OverrideMode)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Mode akses tidak valid. Gunakan NORMAL, OPEN, atau CLOSED.',
    })
  }

  // Pastikan tahapan timeline benar-benar tersedia.
  const existingTimeline =
    await findCertificationTimelineById(timelineId)

  if (!existingTimeline) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tahapan timeline tidak ditemukan.',
    })
  }

  const updatedTimeline = await updateCertificationTimelineOverride(
    timelineId,
    mode as OverrideMode,
    user.user_id,
  )

  if (!updatedTimeline) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gagal memperbarui akses timeline.',
    })
  }

  const modeLabels: Record<OverrideMode, string> = {
    NORMAL: 'Akses dikembalikan ke jadwal normal.',
    OPEN: 'Akses tahapan berhasil dibuka secara manual.',
    CLOSED: 'Akses tahapan berhasil ditutup secara manual.',
  }

  return {
    success: true,
    message: modeLabels[mode as OverrideMode],
    data: updatedTimeline,
  }
})
