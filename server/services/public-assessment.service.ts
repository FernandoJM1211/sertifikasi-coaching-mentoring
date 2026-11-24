import { assertResultNotDecided } from './assessment-result.service'
import { findApplicationById, findApplicationsByPeriod } from '../repositories/application.repository'
import {
  findAssessorAssignmentsByPeriod,
  findAssignmentsByPublicAssessor,
} from '../repositories/assessor-assignment.repository'
import {
  findAllCertificationPeriods,
  findCertificationPeriodById,
} from '../repositories/certification-period.repository'
import {
  findPublicAssessmentByApplicationId,
  findPublicAssessmentsByPeriod,
  upsertPublicAssessment,
  type PublicAssessment,
} from '../repositories/public-assessment.repository'
import { findCmsp01ByApplicationId, findCmsp01SubmissionsByPeriod } from '../repositories/self-assessment.repository'
import {
  findTechnicalAssessmentByApplicationId,
  findTechnicalAssessmentsByPeriod,
  parseUnitResults,
  serializeUnitResults,
  type TechnicalAssessment,
} from '../repositories/technical-assessment.repository'
import { findAllUsers } from '../repositories/user.repository'
import { CMSP03_COMPETENCY_UNITS } from '../../shared/utils/cmsp03-units'
import {
  PUBLIC_ASSESSMENT_STAGE,
  TECHNICAL_GATE_MESSAGES,
  type PublicAssessmentStatus,
  type TechnicalGate,
} from '../../shared/utils/public-assessment'
import type { TechnicalAssessmentInput } from '../utils/technical-assessment-input'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess, withStageSchedule } from './certification-stage.service'
import { getWrittenTestGate } from './written-test-gate.service'

/**
 * Penilaian CMSP-03 oleh Asesor Kepublikan (pola sama dengan penilaian CMSP-02 Asesor Teknis).
 *
 * - Asesor hanya melihat & menilai peserta yang ditugaskan kepadanya (`assessor_assignments.public_assessor_id`).
 * - Peserta tidak mengisi apa pun; asesor menilai K/BK per unit CMSP-03 + catatan + rekomendasi.
 * - Penilaian baru dapat diisi setelah Asesor Teknis MENGIRIM penilaian dengan rekomendasi
 *   `CONTINUE` (berurutan sesuai probis).
 * - Simpan draf & kirim hanya saat tahap ASSESSOR_ASSESSMENT dibuka; setelah dikirim terkunci.
 * - Super Admin dapat melihat semua, ikut mengisi (tercatat atas nama Asesor Kepublikan yang
 *   ditugaskan), dan membuka kunci penilaian terkirim.
 */

const UNIT_CODES = CMSP03_COMPETENCY_UNITS.map((unit) => unit.code)

function notFound(message = 'Data penilaian tidak ditemukan.'): never {
  throw createError({ statusCode: 404, statusMessage: message })
}

function conflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message })
}

const isSuperAdmin = (user: AuthenticatedUser) => user.role === 'SUPER_ADMIN'

/** Hasil Asesor Teknis yang menjadi syarat penilaian CMSP-03. */
/** `withdrawn`: peserta tidak mengerjakan tes tertulis sampai tahapnya berakhir (K-25). */
function technicalGateOf(technical: TechnicalAssessment | null | undefined, withdrawn = false): TechnicalGate {
  if (!technical || technical.status !== 'SUBMITTED') return withdrawn ? 'WITHDRAWN' : 'PENDING'
  return technical.recommendation === 'CONTINUE' ? 'CONTINUE' : 'NOT_CONTINUE'
}

function statusOf(assessment: PublicAssessment | null | undefined, gate: TechnicalGate): PublicAssessmentStatus {
  // Penilaian yang sudah ada tetap ditampilkan statusnya walau hasil Asesor Teknis kemudian dibuka kembali.
  if (assessment) return assessment.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'
  if (gate === 'PENDING') return 'WAITING'
  if (gate === 'NOT_CONTINUE') return 'STOPPED'
  if (gate === 'WITHDRAWN') return 'WITHDRAWN'
  return 'NOT_STARTED'
}

function countResults(assessment: PublicAssessment | null | undefined) {
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
 * Asesor Kepublikan: harus asesor yang ditugaskan. Super Admin: semua.
 */
async function requireAccess(user: AuthenticatedUser, applicationId: string) {
  const application = await findApplicationById(applicationId)
  if (!application || application.application_status !== 'accepted') notFound('Peserta tidak ditemukan.')

  const assignments = await findAssessorAssignmentsByPeriod(application.period_id)
  const assignment = assignments.find((item) => item.application_id === applicationId) ?? null

  if (!isSuperAdmin(user) && assignment?.public_assessor_id !== user.user_id) {
    // Disamarkan sebagai 404 agar keberadaan peserta lain tidak terungkap.
    notFound('Peserta tidak ditemukan atau tidak ditugaskan kepada Anda.')
  }

  return { application, assignment }
}

/* ------------------------------------------------------------------ */
/* Daftar periode & peserta                                            */
/* ------------------------------------------------------------------ */

/** Periode yang memiliki peserta yang ditugaskan kepada Asesor Kepublikan ini. */
export async function listPublicAssessorPeriods(user: AuthenticatedUser) {
  const [assignments, periods] = await Promise.all([
    findAssignmentsByPublicAssessor(user.user_id),
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

  return withStageSchedule(assigned, PUBLIC_ASSESSMENT_STAGE)
}

export async function listPublicAssessments(user: AuthenticatedUser, periodId: string) {
  const period = await findCertificationPeriodById(periodId)
  if (!period) notFound('Periode sertifikasi tidak ditemukan.')

  const [applications, submissions, assignments, assessments, technicals, stage, users] = await Promise.all([
    findApplicationsByPeriod(periodId),
    findCmsp01SubmissionsByPeriod(periodId),
    findAssessorAssignmentsByPeriod(periodId),
    findPublicAssessmentsByPeriod(periodId),
    findTechnicalAssessmentsByPeriod(periodId),
    getStageAccess(periodId, PUBLIC_ASSESSMENT_STAGE),
    findAllUsers(),
  ])
  const written = await getWrittenTestGate(periodId)

  const applicationById = new Map(applications.map((item) => [item.application_id, item]))
  const submissionByApplication = new Map(submissions.map((item) => [item.application_id, item]))
  const assessmentByApplication = new Map(assessments.map((item) => [item.application_id, item]))
  const technicalByApplication = new Map(technicals.map((item) => [item.application_id, item]))
  const userName = new Map(users.map((item) => [item.user_id, item.full_name]))

  const items = assignments
    .filter((assignment) => assignment.public_assessor_id)
    .filter((assignment) => isSuperAdmin(user) || assignment.public_assessor_id === user.user_id)
    .map((assignment) => {
      const application = applicationById.get(assignment.application_id)
      if (!application || application.application_status !== 'accepted') return null

      const cmsp01 = submissionByApplication.get(application.application_id)
      const assessment = assessmentByApplication.get(application.application_id)
      const gate = technicalGateOf(technicalByApplication.get(application.application_id), written.isWithdrawn(application.application_id))
      const counts = countResults(assessment)

      return {
        application_id: application.application_id,
        full_name: cmsp01?.full_name || application.full_name_snapshot,
        nip: cmsp01?.nip || application.nip_snapshot,
        institution_name: cmsp01?.institution_name || application.institution_name,
        assessor_name: userName.get(assignment.public_assessor_id) || '-',
        technical_gate: gate,
        status: statusOf(assessment, gate),
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

  const count = (status: PublicAssessmentStatus) => items.filter((item) => item.status === status).length

  return {
    period: { period_id: period.period_id, period_name: period.period_name, period_status: period.period_status },
    stage,
    total_units: UNIT_CODES.length,
    summary: {
      total: items.length,
      waiting: count('WAITING') + count('STOPPED'),
      withdrawn: count('WITHDRAWN'),
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

export async function getPublicAssessment(user: AuthenticatedUser, applicationId: string) {
  const { application, assignment } = await requireAccess(user, applicationId)

  const [cmsp01, assessment, technical, stage, period, users] = await Promise.all([
    findCmsp01ByApplicationId(application.application_id),
    findPublicAssessmentByApplicationId(application.application_id),
    findTechnicalAssessmentByApplicationId(application.application_id),
    getStageAccess(application.period_id, PUBLIC_ASSESSMENT_STAGE),
    findCertificationPeriodById(application.period_id),
    findAllUsers(),
  ])

  const userName = new Map(users.map((item) => [item.user_id, item.full_name]))
  const written = await getWrittenTestGate(application.period_id, (item) => item.application_id === application.application_id)
  const gate = technicalGateOf(technical, written.isWithdrawn(application.application_id))
  const status = statusOf(assessment, gate)
  const isSubmitted = status === 'SUBMITTED'
  const isAssignedAssessor = assignment?.public_assessor_id === user.user_id
  const canAccessForm = isAssignedAssessor || (isSuperAdmin(user) && Boolean(assignment?.public_assessor_id))

  return {
    participant: {
      application_id: application.application_id,
      full_name: cmsp01?.full_name || application.full_name_snapshot,
      nip: cmsp01?.nip || application.nip_snapshot,
      institution_name: cmsp01?.institution_name || application.institution_name,
    },
    period: { period_id: application.period_id, period_name: period?.period_name ?? '' },
    assessor_name: userName.get(assignment?.public_assessor_id ?? '') || '-',
    // Hanya hasil akhir Asesor Teknis (bukan rincian/catatannya) sebagai syarat penilaian.
    technical: {
      gate,
      submitted_at: technical?.status === 'SUBMITTED' ? technical.submitted_at : '',
      message: gate === 'CONTINUE' ? '' : TECHNICAL_GATE_MESSAGES[gate],
    },
    stage,
    units: CMSP03_COMPETENCY_UNITS,
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
    canEdit: canAccessForm && stage.open && gate === 'CONTINUE' && !isSubmitted,
    canReopen: isSuperAdmin(user) && isSubmitted,
  }
}

/* ------------------------------------------------------------------ */
/* Simpan draf / kirim                                                 */
/* ------------------------------------------------------------------ */

export async function savePublicAssessment(
  user: AuthenticatedUser,
  applicationId: string,
  input: TechnicalAssessmentInput,
) {
  const { application, assignment } = await requireAccess(user, applicationId)

  const assessorId = assignment?.public_assessor_id ?? ''
  if (!assessorId) conflict('Peserta belum memiliki Asesor Kepublikan.')
  if (!isSuperAdmin(user) && assessorId !== user.user_id) {
    conflict('Hanya Asesor Kepublikan yang ditugaskan yang dapat mengisi penilaian ini.')
  }

  const [stage, existing, technical] = await Promise.all([
    getStageAccess(application.period_id, PUBLIC_ASSESSMENT_STAGE),
    findPublicAssessmentByApplicationId(application.application_id),
    findTechnicalAssessmentByApplicationId(application.application_id),
  ])

  if (!stage.open) conflict(`Penilaian tidak dapat disimpan: ${stage.message}`)

  const gate = technicalGateOf(technical)
  if (gate !== 'CONTINUE') conflict(TECHNICAL_GATE_MESSAGES[gate])
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
  await upsertPublicAssessment({
    application_id: application.application_id,
    period_id: application.period_id,
    // Penilaian selalu tercatat atas nama Asesor Kepublikan yang ditugaskan, termasuk bila diisi Super Admin.
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
export async function reopenPublicAssessment(user: AuthenticatedUser, applicationId: string) {
  await requireAccess(user, applicationId)
  const existing = await findPublicAssessmentByApplicationId(applicationId)

  if (!existing || existing.status !== 'SUBMITTED') conflict('Penilaian belum dikirim sehingga tidak perlu dibuka.')
  await assertResultNotDecided(applicationId)

  const now = new Date().toISOString()
  await upsertPublicAssessment({
    ...existing,
    status: 'DRAFT',
    submitted_at: '',
    updated_at: now,
    reopened_by: user.user_id,
    reopened_at: now,
  })

  return { status: 'DRAFT' as const }
}
