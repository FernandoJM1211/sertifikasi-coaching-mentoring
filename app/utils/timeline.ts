/**
 * Timeline sertifikasi untuk beranda semua role (progres bar & tahapan saat ini).
 *
 * Aturan progres: status setiap tahap dihitung dari jadwal saja (override Super Admin diabaikan),
 * lalu tahap terjauh yang sedang berlangsung menjadi acuan — semua tahap sebelumnya "Selesai",
 * tahap itu "Sedang Berlangsung", sesudahnya "Belum Dimulai".
 */

export type TimelineStageStatus = 'completed' | 'active' | 'upcoming'

export type TimelineStage = {
  order: number
  code: string
  name: string
  startAt: string
  endAt: string
  status: TimelineStageStatus
}

/** Baris timeline dari API (`certification_timelines`). */
export type TimelineRecord = {
  stage_order?: string | number
  stage_code?: string
  stage_name?: string
  start_at?: string
  end_at?: string
}

/** Isi panel tombol dinamis di bawah "Tahapan Saat Ini". */
export type TimelineTask = {
  /** pending = tunggakan tahap sebelumnya; action = tugas tahap ini; done = sudah dikerjakan; info = tanpa tindakan. */
  tone: 'pending' | 'action' | 'done' | 'info'
  title?: string
  description: string
  label?: string
  icon?: string
  /** Tujuan tombol (tanpa tombol bila kosong). */
  to?: string
}

const STAGE_FALLBACKS: Record<number, { code: string, name: string }> = {
  1: { code: 'REGISTRATION', name: 'Pendaftaran' },
  2: { code: 'DOCUMENT_VERIFICATION', name: 'Verifikasi Peserta' },
  3: { code: 'SELF_ASSESSMENT', name: 'Self Assessment' },
  4: { code: 'SELF_ASSESSMENT_VERIFICATION', name: 'Verifikasi Self Assessment' },
  5: { code: 'EVALUATION', name: 'Tes Tertulis' },
  6: { code: 'ASSESSOR_ASSESSMENT', name: 'Assessment oleh Asesor' },
  7: { code: 'ASSESSMENT_VERIFICATION', name: 'Penetapan Hasil Asesmen' },
  8: { code: 'ANNOUNCEMENT', name: 'Pengumuman' },
}

function scheduleStatus(startAt: string, endAt: string): TimelineStageStatus {
  const now = Date.now()
  const start = Date.parse(startAt)
  const end = Date.parse(endAt)

  if (!Number.isNaN(end) && now > end) return 'completed'
  if (!Number.isNaN(start) && now >= start && (Number.isNaN(end) || now <= end)) return 'active'
  return 'upcoming'
}

/** Mengubah baris timeline API menjadi tahap berurutan dengan status progres. */
export function buildTimelineStages(records: TimelineRecord[] | null | undefined): TimelineStage[] {
  const list = (records ?? [])
    .map((record) => {
      const order = Number(record.stage_order || 0)
      const fallback = STAGE_FALLBACKS[order]
      const startAt = String(record.start_at || '')
      const endAt = String(record.end_at || '')

      return {
        order,
        code: String(record.stage_code || fallback?.code || `STAGE_${order}`),
        name: String(record.stage_name || fallback?.name || `Tahap ${order}`),
        startAt,
        endAt,
        status: scheduleStatus(startAt, endAt),
      }
    })
    .sort((a, b) => a.order - b.order)

  const lastIndexOf = (status: TimelineStageStatus) =>
    list.reduce((found, stage, index) => (stage.status === status ? index : found), -1)

  const activeIndex = lastIndexOf('active')
  const pivot = activeIndex >= 0 ? activeIndex : lastIndexOf('completed')

  return list.map((stage, index) => ({
    ...stage,
    status: index < pivot || (activeIndex < 0 && index === pivot)
      ? 'completed'
      : index === activeIndex
        ? 'active'
        : 'upcoming',
  }))
}

export const getActiveStage = (stages: TimelineStage[]) => stages.find((stage) => stage.status === 'active')

export const getNextStage = (stages: TimelineStage[]) => stages.find((stage) => stage.status === 'upcoming')
