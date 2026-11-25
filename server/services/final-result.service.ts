import { findApplicationById, findApplicationsByPeriod, type Application } from '../repositories/application.repository'
import {
  findActiveResultByApplication,
  findActiveResultsByPeriod,
  type AssessmentResult,
} from '../repositories/assessment-result.repository'
import { findCertificationPeriodById } from '../repositories/certification-period.repository'
import {
  findRemedialByApplication,
  findRemedialsByPeriod,
  remedialSubmissions,
  type RemedialSubmission,
} from '../repositories/remedial-submission.repository'
import { findCmsp01SubmissionsByPeriod } from '../repositories/self-assessment.repository'
import { findAllUsers } from '../repositories/user.repository'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess, type StageAccess } from './certification-stage.service'
import { getCertificationInfo, requireOwnedApplication } from './peserta-application.service'
import {
  ANNOUNCEMENT_STAGE,
  type FinalStatus,
  type RemedialDecision,
} from '../../shared/utils/final-result'

/**
 * Pengumuman Sertifikasi & Hasil Akhir (tahap 8) — docs/08 K-26.
 *
 * - Hasil penetapan (`assessment_results` ACTIVE) baru tampil ke peserta sejak AWAL tahap Pengumuman
 *   dan tetap tampil sesudah tahap berakhir.
 * - Peserta Remedial mengirim link Google Drive tugas remedial selama tahap Pengumuman DIBUKA
 *   (akhir tahap = batas kirim). Link dapat diubah selama belum diputuskan panitia.
 * - Verifikator / Super Admin memutuskan Lulus / Tidak Lulus remedial. Keputusan final.
 */

function notFound(message: string): never {
  throw createError({ statusCode: 404, statusMessage: message })
}

function conflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message })
}

export type AnnouncementState = {
  stage: StageAccess
  /** Hasil sudah boleh tampil ke peserta: tahap Pengumuman sedang dibuka atau jadwal mulainya sudah lewat. */
  announced: boolean
  /** Tugas remedial dapat dikirim (tahap Pengumuman sedang dibuka). */
  remedialOpen: boolean
  /** Batas kirim remedial sudah lewat (tahap tidak dibuka & jadwal selesai sudah lewat). */
  remedialEnded: boolean
}

/**
 * Status tahap Pengumuman. Penutupan manual (override CLOSED) menyembunyikan pengumuman yang
 * jadwalnya belum dimulai, tetapi tidak menarik kembali pengumuman yang jadwalnya sudah lewat.
 */
export async function getAnnouncementState(periodId: string): Promise<AnnouncementState> {
  const stage = await getStageAccess(periodId, ANNOUNCEMENT_STAGE)
  const now = Date.now()
  const start = Date.parse(stage.startAt)
  const end = Date.parse(stage.endAt)

  return {
    stage,
    announced: stage.open || (!Number.isNaN(start) && now >= start),
    remedialOpen: stage.open,
    remedialEnded: !stage.open && !Number.isNaN(end) && now > end,
  }
}

/** Status akhir dari hasil penetapan + tugas remedial. */
export function finalStatusOf(
  result: Pick<AssessmentResult, 'outcome'>,
  remedial: Pick<RemedialSubmission, 'status'> | null,
  remedialEnded: boolean,
): FinalStatus {
  if (result.outcome === 'PASSED') return 'PASSED'
  if (result.outcome === 'WITHDRAWN') return 'WITHDRAWN'
  if (remedial?.status === 'PASSED') return 'REMEDIAL_PASSED'
  if (remedial?.status === 'FAILED') return 'REMEDIAL_FAILED'
  if (remedial?.status === 'SUBMITTED') return 'REMEDIAL_SUBMITTED'
  return remedialEnded ? 'REMEDIAL_EXPIRED' : 'REMEDIAL_PENDING'
}

/** Sheet `remedial_submissions` belum dibuat → dianggap belum ada tugas remedial (hanya untuk baca). */
async function safeRead<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read()
  } catch {
    return fallback
  }
}

/* ------------------------------------------------------------------ */
/* Peserta                                                             */
/* ------------------------------------------------------------------ */

export async function getPesertaAnnouncement(user: AuthenticatedUser, applicationId: string) {
  const application = await requireOwnedApplication(user, applicationId)
  const [info, state, result, remedial] = await Promise.all([
    getCertificationInfo(application),
    getAnnouncementState(application.period_id),
    safeRead(() => findActiveResultByApplication(application.application_id), null),
    safeRead(() => findRemedialByApplication(application.application_id), null),
  ])

  const base = {
    application: { application_id: application.application_id },
    period: { period_id: application.period_id, period_name: info.period_name },
    stage: { open: state.stage.open, startAt: state.stage.startAt, endAt: state.stage.endAt },
  }

  // Belum diumumkan / belum ditetapkan → peserta belum boleh melihat hasil apa pun.
  if (!state.announced || !result) {
    return { ...base, announced: state.announced, decided: false, status: null, remedial: null, canSubmitRemedial: false }
  }

  const status = finalStatusOf(result, remedial, state.remedialEnded)
  const canSubmitRemedial = state.remedialOpen && result.outcome === 'REMEDIAL' && (!remedial || remedial.status === 'SUBMITTED')

  return {
    ...base,
    announced: true,
    decided: true,
    status,
    remedial: result.outcome === 'REMEDIAL' && remedial
      ? {
          drive_link: remedial.drive_link,
          note: remedial.note,
          submitted_at: remedial.submitted_at,
          updated_at: remedial.updated_at,
          decided_at: remedial.decided_at,
        }
      : null,
    canSubmitRemedial,
  }
}

/** Ringkas untuk tombol beranda peserta: status akhir hanya bila sudah diumumkan. */
export async function getAnnouncementProgress(application: Application) {
  const [state, result, remedial] = await Promise.all([
    getAnnouncementState(application.period_id),
    safeRead(() => findActiveResultByApplication(application.application_id), null),
    safeRead(() => findRemedialByApplication(application.application_id), null),
  ])

  if (!state.announced || !result) return { announced: state.announced, status: null, canSubmitRemedial: false }

  return {
    announced: true,
    status: finalStatusOf(result, remedial, state.remedialEnded),
    canSubmitRemedial: state.remedialOpen && result.outcome === 'REMEDIAL' && (!remedial || remedial.status === 'SUBMITTED'),
  }
}

/** Mengirim / mengubah link tugas remedial (sebelum diputuskan panitia). */
export async function submitRemedial(
  user: AuthenticatedUser,
  applicationId: string,
  input: { drive_link: string, note: string },
) {
  const application = await requireOwnedApplication(user, applicationId)
  const [state, result] = await Promise.all([
    getAnnouncementState(application.period_id),
    findActiveResultByApplication(application.application_id),
  ])

  if (!state.announced || !result) conflict('Hasil sertifikasi Anda belum diumumkan.')
  if (result.outcome !== 'REMEDIAL') conflict('Anda tidak termasuk peserta remedial.')
  if (!state.remedialOpen) {
    conflict(state.remedialEnded ? 'Batas waktu pengiriman tugas remedial telah berakhir.' : 'Pengiriman tugas remedial sedang ditutup.')
  }

  const existing = await findRemedialByApplication(application.application_id)
  if (existing && existing.status !== 'SUBMITTED') conflict('Tugas remedial Anda sudah diputuskan panitia dan tidak dapat diubah.')

  const now = new Date().toISOString()

  if (existing) {
    await remedialSubmissions.update(existing.remedial_id, {
      drive_link: input.drive_link,
      note: input.note,
      result_id: result.result_id,
      updated_at: now,
    })
    return { updated: true }
  }

  await remedialSubmissions.create({
    application_id: application.application_id,
    period_id: application.period_id,
    result_id: result.result_id,
    drive_link: input.drive_link,
    note: input.note,
    status: 'SUBMITTED',
    submitted_at: now,
    updated_at: now,
    decided_by: '',
    decided_at: '',
  })
  return { updated: false }
}

/* ------------------------------------------------------------------ */
/* Verifikator & Super Admin                                           */
/* ------------------------------------------------------------------ */

/** Dashboard Hasil Akhir satu periode: peserta yang hasilnya sudah ditetapkan. */
export async function getPeriodFinalResults(periodId: string) {
  const period = await findCertificationPeriodById(periodId)
  if (!period) notFound('Periode sertifikasi tidak ditemukan.')

  const [state, results, remedials, applications, submissions, users] = await Promise.all([
    getAnnouncementState(periodId),
    safeRead(() => findActiveResultsByPeriod(periodId), []),
    safeRead(() => findRemedialsByPeriod(periodId), []),
    findApplicationsByPeriod(periodId),
    findCmsp01SubmissionsByPeriod(periodId),
    findAllUsers(),
  ])

  const applicationById = new Map(applications.map((item) => [item.application_id, item]))
  const submissionByApplication = new Map(submissions.map((item) => [item.application_id, item]))
  const remedialByApplication = new Map(remedials.map((item) => [item.application_id, item]))
  const userName = (id: string) => (id ? users.find((item) => item.user_id === id)?.full_name || id : '')

  const items = results
    .map((result) => {
      const application = applicationById.get(result.application_id)
      const cmsp01 = submissionByApplication.get(result.application_id)
      const remedial = result.outcome === 'REMEDIAL' ? remedialByApplication.get(result.application_id) ?? null : null

      return {
        application_id: result.application_id,
        full_name: cmsp01?.full_name || application?.full_name_snapshot || '',
        nip: cmsp01?.nip || application?.nip_snapshot || '',
        institution_name: cmsp01?.institution_name || application?.institution_name || '',
        status: finalStatusOf(result, remedial, state.remedialEnded),
        remedial: remedial
          ? {
              drive_link: remedial.drive_link,
              note: remedial.note,
              submitted_at: remedial.submitted_at,
              updated_at: remedial.updated_at,
              decided_at: remedial.decided_at,
              decided_by_name: userName(remedial.decided_by),
            }
          : null,
      }
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))

  const count = (...statuses: FinalStatus[]) => items.filter((item) => statuses.includes(item.status)).length

  return {
    period: { period_id: period.period_id, period_name: period.period_name, period_status: period.period_status },
    stage: state.stage,
    announced: state.announced,
    remedialOpen: state.remedialOpen,
    decided: results.length > 0,
    summary: {
      total: items.length,
      passed: count('PASSED', 'REMEDIAL_PASSED'),
      remedialPending: count('REMEDIAL_PENDING'),
      remedialSubmitted: count('REMEDIAL_SUBMITTED'),
      failed: count('REMEDIAL_FAILED', 'REMEDIAL_EXPIRED'),
      withdrawn: count('WITHDRAWN'),
    },
    items,
  }
}

/** Memutuskan tugas remedial: Lulus / Tidak Lulus (final). */
export async function decideRemedial(
  user: AuthenticatedUser,
  periodId: string,
  applicationId: string,
  decision: RemedialDecision,
) {
  const application = await findApplicationById(applicationId)
  if (!application || application.period_id !== periodId) notFound('Peserta tidak ditemukan pada periode ini.')

  const [result, remedial] = await Promise.all([
    findActiveResultByApplication(applicationId),
    findRemedialByApplication(applicationId),
  ])

  if (!result || result.outcome !== 'REMEDIAL') conflict('Peserta ini tidak termasuk peserta remedial.')
  if (!remedial) conflict('Peserta belum mengirim tugas remedial.')
  if (remedial.status !== 'SUBMITTED') conflict('Tugas remedial peserta ini sudah diputuskan.')

  await remedialSubmissions.update(remedial.remedial_id, {
    status: decision,
    decided_by: user.user_id,
    decided_at: new Date().toISOString(),
  })

  return { decision }
}
