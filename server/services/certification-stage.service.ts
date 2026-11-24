import { findCertificationPeriodById } from '../repositories/certification-period.repository'
import {
  findAllCertificationTimelines,
  findCertificationTimelinesByPeriodId,
} from '../repositories/certification-timeline.repository'

/** Kode jadwal khusus: rentang seluruh timeline periode (tahap pertama s.d. terakhir). */
export const SCHEDULE_WHOLE_PERIOD = 'PERIOD'

export type StageSchedule = { stage_start_at: string, stage_end_at: string }

/**
 * Jadwal satu tahap untuk setiap periode (untuk kartu pemilihan periode).
 * `stageCode = 'PERIOD'` → rentang seluruh timeline periode.
 */
export async function getStageSchedules(stageCode: string): Promise<Map<string, StageSchedule>> {
  const timelines = await findAllCertificationTimelines()
  const code = stageCode.trim().toUpperCase()
  const result = new Map<string, StageSchedule>()

  for (const item of timelines) {
    if (code !== SCHEDULE_WHOLE_PERIOD && item.stage_code.trim().toUpperCase() !== code) continue

    const current = result.get(item.period_id)
    if (!current) {
      result.set(item.period_id, { stage_start_at: item.start_at, stage_end_at: item.end_at })
      continue
    }

    // Rentang seluruh periode: ambil mulai paling awal & selesai paling akhir.
    if (item.start_at && (!current.stage_start_at || Date.parse(item.start_at) < Date.parse(current.stage_start_at))) {
      current.stage_start_at = item.start_at
    }
    if (item.end_at && (!current.stage_end_at || Date.parse(item.end_at) > Date.parse(current.stage_end_at))) {
      current.stage_end_at = item.end_at
    }
  }

  return result
}

/** Menambahkan `stage_start_at`/`stage_end_at` ke setiap periode. */
export async function withStageSchedule<T extends { period_id: string }>(periods: T[], stageCode: string) {
  const schedules = await getStageSchedules(stageCode)
  return periods.map((period) => ({
    ...period,
    ...(schedules.get(period.period_id) ?? { stage_start_at: '', stage_end_at: '' }),
  }))
}

export type StageAccess = {
  open: boolean
  /** Alasan jika tahap tidak dibuka (untuk ditampilkan ke pengguna). */
  message: string
  startAt: string
  endAt: string
  /** true bila tahap dibuka manual oleh Super Admin (override OPEN), bukan karena jadwal. */
  manual?: boolean
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
    return { open: true, message: '', startAt, endAt, manual: true }
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
/**
 * true bila tahap sudah selesai: tidak sedang dibuka DAN jadwal selesainya sudah lewat.
 * Tahap yang ditutup manual sebelum jadwalnya habis belum dianggap selesai.
 */
export async function hasStageEnded(periodId: string, stageCode: string) {
  const access = await getStageAccess(periodId, stageCode)
  const end = Date.parse(access.endAt)
  return !access.open && !Number.isNaN(end) && Date.now() > end
}

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
