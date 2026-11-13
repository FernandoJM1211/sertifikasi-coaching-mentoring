
import {
  findCertificationTimelineById,
  updateCertificationTimelineOverride,
} from '../../../repositories/certification-timeline.repository'

import {
  getAuthenticatedUser,
} from '../../../services/auth.service'


const SESSION_COOKIE_NAME = 'cmsp_session'

const ALLOWED_MODES = ['NORMAL', 'OPEN', 'CLOSED'] as const

type OverrideMode = typeof ALLOWED_MODES[number]

export default defineEventHandler(async (event) => {
  // Validasi sesi login.
  const sessionToken = getCookie(event, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const user = await getAuthenticatedUser(sessionToken)

  // Hanya Super Admin aktif yang boleh mengubah mode akses.
  if (
    user.account_status !== 'ACTIVE' ||
    user.role !== 'SUPER_ADMIN'
  ) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Hanya Super Admin yang dapat mengubah akses timeline.',
    })
  }

  // Validasi ID timeline.
  const timelineId = getRouterParam(event, 'timelineId')?.trim()

  if (!timelineId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID timeline wajib diisi.',
    })
  }

  // Validasi mode yang diminta.
  const body = await readBody<{ mode?: string }>(event)
  const mode = body?.mode?.trim().toUpperCase()

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
