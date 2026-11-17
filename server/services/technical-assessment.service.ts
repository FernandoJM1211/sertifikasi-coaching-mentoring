import type { H3Event } from 'h3'
import { findApplicationById, findApplicationsByPeriod } from '../repositories/application.repository'
import {
  findAssessorAssignmentsByPeriod,
  findAssignmentsByTechnicalAssessor,
} from '../repositories/assessor-assignment.repository'
import {
  findAllCertificationPeriods,
  findCertificationPeriodById,
} from '../repositories/certification-period.repository'
import {
  findCmsp01ByApplicationId,
  findCmsp01SubmissionsByPeriod,
  findCmsp02ByApplicationId,
  findCmsp02Evidences,
} from '../repositories/self-assessment.repository'
import {
  findTechnicalAssessmentByApplicationId,
  findTechnicalAssessmentsByPeriod,
  parseUnitResults,
  serializeUnitResults,
  upsertTechnicalAssessment,
  type TechnicalAssessment,
} from '../repositories/technical-assessment.repository'
import { findAllUsers } from '../repositories/user.repository'
import { CMSP02_COMPETENCY_UNITS } from '../../shared/utils/cmsp02-units'
import {
  TECHNICAL_ASSESSMENT_STAGE,
  type TechnicalAssessmentStatus,
} from '../../shared/utils/technical-assessment'
import type { TechnicalAssessmentInput } from '../utils/technical-assessment-input'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess, withStageSchedule } from './certification-stage.service'
import { loadSelfAssessmentContent, sendLinkedSelfAssessmentFile } from './self-assessment.service'

/**
 * Penilaian CMSP-02 oleh Asesor Teknis.
 *
 * - Asesor hanya melihat & menilai peserta yang ditugaskan kepadanya (`assessor_assignments`).
 * - Simpan draf & kirim hanya saat tahap ASSESSOR_ASSESSMENT dibuka; setelah dikirim terkunci.
 * - Super Admin dapat melihat semua penilaian, ikut mengisi/mengirim penilaian peserta yang sudah
 *   memiliki Asesor Teknis (tercatat atas nama asesor tersebut), dan membuka kunci penilaian terkirim.
 * - Asesor hanya menerima data CMSP-02 (evidence), bukan data pribadi CMSP-01.
 */

const UNIT_CODES = CMSP02_COMPETENCY_UNITS.map((unit) => unit.code)

function notFound(message = 'Data penilaian tidak ditemukan.'): never {
  throw createError({ statusCode: 404, statusMessage: message })
}

function conflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message })
}

const isSuperAdmin = (user: AuthenticatedUser) => user.role === 'SUPER_ADMIN'

function statusOf(assessment: TechnicalAssessment | null | undefined): TechnicalAssessmentStatus {
  if (!assessment) return 'NOT_STARTED'
  return assessment.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'
}

function countResults(assessment: TechnicalAssessment | null | undefined) {
  const results = parseUnitResults(assessment?.unit_results ?? '')
  const values = UNIT_CODES.map((code) => results[code])
  return {
    k: values.filter((value) => value === 'K').length,
    bk: values.filter((value) => value === 'BK').length,
    assessed: values.filter(Boolean).length,
  }
}

/**
 * Memastikan pengguna boleh mengakses penilaian pengajuan ini.
 * Asesor Teknis: harus asesor yang ditugaskan. Super Admin: semua.
 */
async function requireAccess(user: AuthenticatedUser, applicationId: string) {
  const application = await findApplicationById(applicationId)
  if (!application || application.application_status !== 'accepted') notFound('Peserta tidak ditemukan.')

  const assignments = await findAssessorAssignmentsByPeriod(application.period_id)
  const assignment = assignments.find((item) => item.application_id === applicationId) ?? null

  if (!isSuperAdmin(user) && assignment?.technical_assessor_id !== user.user_id) {
    // Disamarkan sebagai 404 agar keberadaan peserta lain tidak terungkap.
    notFound('Peserta tidak ditemukan atau tidak ditugaskan kepada Anda.')
  }

  return { application, assignment }
}

/* ------------------------------------------------------------------ */
/* Daftar periode & peserta                                            */
/* ------------------------------------------------------------------ */

/** Periode yang memiliki peserta yang ditugaskan kepada Asesor Teknis ini. */
export async function listAssessorPeriods(user: AuthenticatedUser) {
  const [assignments, periods] = await Promise.all([
    findAssignmentsByTechnicalAssessor(user.user_id),
    findAllCertificationPeriods(),
  ])
  const periodIds = new Set(assignments.map((item) => item.period_id))

  const assigned = periods
    .filter((period) => periodIds.has(period.period_id))
    .map((period) => ({
      period_id: period.period_id,
      period_name: period.period_name,
      period_status: period.period_status,
    }))

  // Jadwal tahap Penilaian Asesor untuk kartu periode.
  return withStageSchedule(assigned, TECHNICAL_ASSESSMENT_STAGE)
}

export async function listTechnicalAssessments(user: AuthenticatedUser, periodId: string) {
  const period = await findCertificationPeriodById(periodId)
  if (!period) notFound('Periode sertifikasi tidak ditemukan.')

  const [applications, submissions, assignments, assessments, stage, users] = await Promise.all([
    findApplicationsByPeriod(periodId),
    findCmsp01SubmissionsByPeriod(periodId),
    findAssessorAssignmentsByPeriod(periodId),
    findTechnicalAssessmentsByPeriod(periodId),
    getStageAccess(periodId, TECHNICAL_ASSESSMENT_STAGE),
    findAllUsers(),
  ])

  const applicationById = new Map(applications.map((item) => [item.application_id, item]))
  const submissionByApplication = new Map(submissions.map((item) => [item.application_id, item]))
  const assessmentByApplication = new Map(assessments.map((item) => [item.application_id, item]))
  const userName = new Map(users.map((item) => [item.user_id, item.full_name]))

  const items = assignments
    .filter((assignment) => assignment.technical_assessor_id)
    .filter((assignment) => isSuperAdmin(user) || assignment.technical_assessor_id === user.user_id)
    .map((assignment) => {
      const application = applicationById.get(assignment.application_id)
      if (!application || application.application_status !== 'accepted') return null

      const cmsp01 = submissionByApplication.get(application.application_id)
      const assessment = assessmentByApplication.get(application.application_id)
      const counts = countResults(assessment)

      return {
        application_id: application.application_id,
        full_name: cmsp01?.full_name || application.full_name_snapshot,
        nip: cmsp01?.nip || application.nip_snapshot,
        institution_name: cmsp01?.institution_name || application.institution_name,
        assessor_name: userName.get(assignment.technical_assessor_id) || '-',
        status: statusOf(assessment),
        recommendation: assessment?.recommendation ?? '',
        k_count: counts.k,
        bk_count: counts.bk,
        assessed_count: counts.assessed,
        submitted_at: assessment?.submitted_at ?? '',
        updated_at: assessment?.updated_at ?? '',
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))

  const count = (status: TechnicalAssessmentStatus) => items.filter((item) => item.status === status).length

  return {
    period: { period_id: period.period_id, period_name: period.period_name, period_status: period.period_status },
    stage,
    total_units: UNIT_CODES.length,
    summary: {
      total: items.length,
      notStarted: count('NOT_STARTED'),
      draft: count('DRAFT'),
      submitted: count('SUBMITTED'),
      continued: items.filter((item) => item.status === 'SUBMITTED' && item.recommendation === 'CONTINUE').length,
      notContinued: items.filter((item) => item.status === 'SUBMITTED' && item.recommendation === 'NOT_CONTINUE').length,
    },
    items,
  }
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export async function getTechnicalAssessment(user: AuthenticatedUser, applicationId: string) {
  const { application, assignment } = await requireAccess(user, applicationId)

  const [content, cmsp01, assessment, stage, period, users] = await Promise.all([
    loadSelfAssessmentContent(application),
    findCmsp01ByApplicationId(application.application_id),
    findTechnicalAssessmentByApplicationId(application.application_id),
    getStageAccess(application.period_id, TECHNICAL_ASSESSMENT_STAGE),
    findCertificationPeriodById(application.period_id),
    findAllUsers(),
  ])

  const userName = new Map(users.map((item) => [item.user_id, item.full_name]))
  const status = statusOf(assessment)
  const isAssignedAssessor = assignment?.technical_assessor_id === user.user_id

  return {
    participant: {
      application_id: application.application_id,
      full_name: cmsp01?.full_name || application.full_name_snapshot,
      nip: cmsp01?.nip || application.nip_snapshot,
      institution_name: cmsp01?.institution_name || application.institution_name,
    },
    period: { period_id: application.period_id, period_name: period?.period_name ?? '' },
    assessor_name: userName.get(assignment?.technical_assessor_id ?? '') || '-',
    selfAssessmentStatus: content.status,
    // Hanya CMSP-02 yang dikirim ke asesor.
    cmsp02: content.cmsp02,
    stage,
    units: CMSP02_COMPETENCY_UNITS.map((unit) => ({ code: unit.code, number: unit.number, title: unit.title })),
    assessment: {
      status,
      unit_results: parseUnitResults(assessment?.unit_results ?? ''),
      note: assessment?.note ?? '',
      recommendation: assessment?.recommendation ?? '',
      submitted_at: assessment?.submitted_at ?? '',
      updated_at: assessment?.updated_at ?? '',
      reopened_by_name: assessment?.reopened_by ? userName.get(assessment.reopened_by) || 'Super Admin' : '',
      reopened_at: assessment?.reopened_at ?? '',
    },
    canEdit: (isAssignedAssessor || (isSuperAdmin(user) && Boolean(assignment?.technical_assessor_id)))
      && stage.open && status !== 'SUBMITTED',
    canReopen: isSuperAdmin(user) && status === 'SUBMITTED',
  }
}

/* ------------------------------------------------------------------ */
/* Simpan draf / kirim                                                 */
/* ------------------------------------------------------------------ */

export async function saveTechnicalAssessment(
  user: AuthenticatedUser,
  applicationId: string,
  input: TechnicalAssessmentInput,
) {
  const { application, assignment } = await requireAccess(user, applicationId)

  const assessorId = assignment?.technical_assessor_id ?? ''
  if (!assessorId) conflict('Peserta belum memiliki Asesor Teknis.')
  if (!isSuperAdmin(user) && assessorId !== user.user_id) {
    conflict('Hanya Asesor Teknis yang ditugaskan yang dapat mengisi penilaian ini.')
  }

  const [stage, existing] = await Promise.all([
    getStageAccess(application.period_id, TECHNICAL_ASSESSMENT_STAGE),
    findTechnicalAssessmentByApplicationId(application.application_id),
  ])

  if (!stage.open) conflict(`Penilaian tidak dapat disimpan: ${stage.message}`)
  if (existing?.status === 'SUBMITTED') conflict('Penilaian sudah dikirim dan terkunci.')

  if (input.submit) {
    const missing = UNIT_CODES.filter((code) => !input.unitResults[code])
    if (missing.length > 0) conflict(`Masih ada ${missing.length} unit yang belum dinilai.`)
    if (!input.recommendation) conflict('Pilih rekomendasi asesmen terlebih dahulu.')
    if (input.recommendation === 'NOT_CONTINUE' && !input.note) {
      conflict('Catatan wajib diisi bila asesmen tidak dapat dilanjutkan.')
    }
  }

  const now = new Date().toISOString()
  await upsertTechnicalAssessment({
    application_id: application.application_id,
    period_id: application.period_id,
    // Penilaian selalu tercatat atas nama Asesor Teknis yang ditugaskan, termasuk bila diisi Super Admin.
    assessor_id: assessorId,
    unit_results: serializeUnitResults(input.unitResults),
    note: input.note,
    recommendation: input.recommendation,
    status: input.submit ? 'SUBMITTED' : 'DRAFT',
    submitted_at: input.submit ? now : '',
    created_at: existing?.created_at || now,
    updated_at: now,
    reopened_by: existing?.reopened_by ?? '',
    reopened_at: existing?.reopened_at ?? '',
  })

  return { status: input.submit ? 'SUBMITTED' : 'DRAFT', saved_at: now }
}

/** Super Admin membuka kunci penilaian terkirim agar asesor dapat memperbaikinya. */
export async function reopenTechnicalAssessment(user: AuthenticatedUser, applicationId: string) {
  await requireAccess(user, applicationId)
  const existing = await findTechnicalAssessmentByApplicationId(applicationId)

  if (!existing || existing.status !== 'SUBMITTED') conflict('Penilaian belum dikirim sehingga tidak perlu dibuka.')

  const now = new Date().toISOString()
  await upsertTechnicalAssessment({
    ...existing,
    status: 'DRAFT',
    submitted_at: '',
    updated_at: now,
    reopened_by: user.user_id,
    reopened_at: now,
  })

  return { status: 'DRAFT' as const }
}

/* ------------------------------------------------------------------ */
/* Berkas evidence                                                     */
/* ------------------------------------------------------------------ */

/** Hanya berkas evidence CMSP-02 yang dapat dibuka dari halaman penilaian. */
export async function sendTechnicalAssessmentFile(
  event: H3Event,
  user: AuthenticatedUser,
  applicationId: string,
  fileId: string,
) {
  const { application } = await requireAccess(user, applicationId)
  const cmsp02 = await findCmsp02ByApplicationId(application.application_id)
  const evidences = cmsp02 ? await findCmsp02Evidences(cmsp02.cmsp02_id) : []

  if (!evidences.some((item) => item.file_id === fileId)) notFound('Berkas tidak ditemukan.')

  return sendLinkedSelfAssessmentFile(event, application, fileId)
}
