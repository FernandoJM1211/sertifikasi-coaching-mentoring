import { findCertificationPeriodById } from '../repositories/certification-period.repository'
import { findCertificationTimelinesByPeriodId } from '../repositories/certification-timeline.repository'

export type StageAccess = {
  open: boolean
  /** Alasan jika tahap tidak dibuka (untuk ditampilkan ke pengguna). */
  message: string
  startAt: string
  endAt: string
}

/**
 * Menentukan apakah sebuah tahap timeline sedang dibuka untuk periode tertentu.
 *
 * Aturan: periode harus ACTIVE; lalu override Super Admin (OPEN/CLOSED)
 * diutamakan; jika NORMAL, mengikuti jadwal start_at–end_at.
 */
export async function getStageAccess(
  periodId: string,
  stageCode: string,
): Promise<StageAccess> {
  const closed = (message: string, startAt = '', endAt = ''): StageAccess => ({
    open: false,
    message,
    startAt,
    endAt,
  })

  const [period, timelines] = await Promise.all([
    findCertificationPeriodById(periodId),
    findCertificationTimelinesByPeriodId(periodId),
  ])

  if (!period || period.period_status.trim().toUpperCase() !== 'ACTIVE') {
    return closed('Periode sertifikasi sedang tidak aktif.')
  }

  const timeline = timelines.find(
    (item) => item.stage_code.trim().toUpperCase() === stageCode,
  )

  if (!timeline) {
    return closed('Jadwal tahapan belum tersedia.')
  }

  const startAt = timeline.start_at
  const endAt = timeline.end_at
  const override = (timeline.is_override_open || '').trim().toUpperCase()

  if (override === 'OPEN' || override === 'TRUE') {
    return { open: true, message: '', startAt, endAt }
  }

  if (override === 'CLOSED') {
    return closed('Tahapan sedang ditutup oleh penyelenggara.', startAt, endAt)
  }

  const start = Date.parse(startAt)
  const end = Date.parse(endAt)
  const now = Date.now()

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return closed('Jadwal tahapan belum lengkap.', startAt, endAt)
  }

  if (now < start) {
    return closed('Tahapan belum dibuka.', startAt, endAt)
  }

  if (now > end) {
    return closed('Masa tahapan telah berakhir.', startAt, endAt)
  }

  return { open: true, message: '', startAt, endAt }
}

/** Melempar 409 jika tahap tidak sedang dibuka. */
export async function assertStageOpen(
  periodId: string,
  stageCode: string,
): Promise<void> {
  const access = await getStageAccess(periodId, stageCode)

  if (!access.open) {
    throw createError({
      statusCode: 409,
      statusMessage: access.message,
    })
  }
}
