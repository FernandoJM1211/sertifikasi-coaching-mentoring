import { findApplicationsByPeriod } from '../repositories/application.repository'
import {
  findCertificationPeriodById,
  type CertificationPeriod,
} from '../repositories/certification-period.repository'
import {
  findActivePeriodAssessors,
  appendAssignmentLogs,
  assertAssignmentLogSheetReady,
  findAssessorAssignmentsByPeriod,
  setPeriodAssessors,
  upsertAssessorAssignments,
  type AssessorRole,
} from '../repositories/assessor-assignment.repository'
import { findCmsp01SubmissionsByPeriod } from '../repositories/self-assessment.repository'
import { findTechnicalAssessmentsByPeriod } from '../repositories/technical-assessment.repository'
import { findPublicAssessmentsByPeriod } from '../repositories/public-assessment.repository'
import { findAllUsers, type User } from '../repositories/user.repository'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess } from './certification-stage.service'

/**
 * Penugasan asesor oleh Verifikator / Super Admin.
 *
 * 1. Asesor periode: memilih Asesor Teknis & Kepublikan yang bertugas pada periode.
 * 2. Penugasan peserta: memasangkan peserta (SA VERIFIED) dengan asesor periode,
 *    satu per satu atau sekaligus.
 * Keduanya hanya dapat dilakukan saat tahap SELF_ASSESSMENT_VERIFICATION dibuka.
 *
 * Mitigasi pergantian asesor:
 * - mengganti asesor yang sudah ada wajib disertai alasan;
 * - setiap penugasan/pergantian dicatat di `assessor_assignment_logs`;
 * - ditolak bila tahap ASSESSOR_ASSESSMENT sudah dibuka (penilaian sedang berjalan).
 */

const ASSIGNMENT_STAGE = 'SELF_ASSESSMENT_VERIFICATION'
const ASSESSMENT_STAGE = 'ASSESSOR_ASSESSMENT'
export const MAX_CHANGE_REASON_LENGTH = 500
export const ASSESSOR_ROLES = ['TECHNICAL_ASSESSOR', 'PUBLIC_ASSESSOR'] as const
export const MAX_BULK_ASSIGN = 500
export const MAX_PERIOD_ASSESSORS = 100

const ROLE_LABEL: Record<AssessorRole, string> = {
  TECHNICAL_ASSESSOR: 'Asesor Teknis',
  PUBLIC_ASSESSOR: 'Asesor Kepublikan',
}

async function requirePeriod(periodId: string): Promise<CertificationPeriod> {
  const period = await findCertificationPeriodById(periodId)

  if (!period) {
    throw createError({ statusCode: 404, statusMessage: 'Periode sertifikasi tidak ditemukan.' })
  }

  return period
}

function isActiveAssessor(user: User | undefined, role: AssessorRole) {
  return Boolean(user && user.role === role && user.account_status === 'ACTIVE')
}

/** Aksi penugasan hanya saat tahap Verifikasi SA dibuka dan penilaian asesor belum dimulai. */
async function assertCanEdit(periodId: string, prefix: string) {
  const [access, assessment] = await Promise.all([
    getStageAccess(periodId, ASSIGNMENT_STAGE),
    getStageAccess(periodId, ASSESSMENT_STAGE),
  ])

  if (!access.open) {
    throw createError({ statusCode: 409, statusMessage: `${prefix}: ${access.message}` })
  }

  if (assessment.open) {
    throw createError({
      statusCode: 409,
      statusMessage: `${prefix}: tahap penilaian asesor sudah dibuka.`,
    })
  }
}

/* ------------------------------------------------------------------ */
/* Daftar                                                              */
/* ------------------------------------------------------------------ */

export async function listAssessorAssignments(periodId: string) {
  const period = await requirePeriod(periodId)

  const [applications, submissions, assignments, periodAssessors, users, stage, assessmentStage] = await Promise.all([
    findApplicationsByPeriod(period.period_id),
    findCmsp01SubmissionsByPeriod(period.period_id),
    findAssessorAssignmentsByPeriod(period.period_id),
    findActivePeriodAssessors(period.period_id),
    findAllUsers(),
    getStageAccess(period.period_id, ASSIGNMENT_STAGE),
    getStageAccess(period.period_id, ASSESSMENT_STAGE),
  ])

  const submissionByApplication = new Map(submissions.map((item) => [item.application_id, item]))
  const assignmentByApplication = new Map(assignments.map((item) => [item.application_id, item]))
  const userById = new Map(users.map((user) => [user.user_id, user]))

  const acceptedApplications = applications.filter(
    (application) => application.application_status === 'accepted',
  )

  const toAssessor = (userId: string) => {
    const user = userId ? userById.get(userId) : undefined
    return user ? { user_id: user.user_id, full_name: user.full_name } : null
  }

  const items = acceptedApplications
    .map((application) => {
      const cmsp01 = submissionByApplication.get(application.application_id)
      const assignment = assignmentByApplication.get(application.application_id)

      return {
        application_id: application.application_id,
        sa_verified: cmsp01?.status === 'VERIFIED',
        full_name: cmsp01?.full_name || application.full_name_snapshot,
        nip: cmsp01?.nip || application.nip_snapshot,
        institution_name: cmsp01?.institution_name || application.institution_name,
        technical_assessor: toAssessor(assignment?.technical_assessor_id ?? ''),
        public_assessor: toAssessor(assignment?.public_assessor_id ?? ''),
      }
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))

  // Jumlah peserta per asesor pada periode ini (membantu pemerataan).
  const workload = new Map<string, number>()
  for (const item of items) {
    for (const assessor of [item.technical_assessor, item.public_assessor]) {
      if (assessor) workload.set(assessor.user_id, (workload.get(assessor.user_id) ?? 0) + 1)
    }
  }

  const poolIds = (role: AssessorRole) =>
    new Set(periodAssessors.filter((item) => item.assessor_role === role).map((item) => item.user_id))

  /** Asesor periode (pilihan saat menugaskan) + seluruh asesor aktif (pilihan saat mengelola). */
  const buildRole = (role: AssessorRole) => {
    const ids = poolIds(role)
    const candidates = users
      .filter((user) => isActiveAssessor(user, role))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))
      .map((user) => ({
        user_id: user.user_id,
        full_name: user.full_name,
        assigned_count: workload.get(user.user_id) ?? 0,
        in_period: ids.has(user.user_id),
      }))

    return {
      period: candidates.filter((item) => item.in_period),
      candidates,
    }
  }

  const status = (item: (typeof items)[number]) => {
    if (!item.sa_verified) return 'NOT_VERIFIED'
    if (item.technical_assessor && item.public_assessor) return 'ASSIGNED'
    return item.technical_assessor || item.public_assessor ? 'PARTIAL' : 'UNASSIGNED'
  }

  const withStatus = items.map((item) => ({ ...item, status: status(item) }))
  const count = (statuses: string[]) => withStatus.filter((item) => statuses.includes(item.status)).length

  return {
    period: {
      period_id: period.period_id,
      period_name: period.period_name,
      period_status: period.period_status,
    },
    stage,
    // Semua aksi di halaman ini mengikuti tahap Verifikasi SA; dikunci bila penilaian asesor sudah dibuka.
    canEdit: stage.open && !assessmentStage.open,
    assessmentStarted: assessmentStage.open,
    summary: {
      total: withStatus.length,
      assigned: count(['ASSIGNED']),
      unassigned: count(['UNASSIGNED', 'PARTIAL']),
      notVerified: count(['NOT_VERIFIED']),
    },
    assessors: {
      technical: buildRole('TECHNICAL_ASSESSOR'),
      public: buildRole('PUBLIC_ASSESSOR'),
    },
    items: withStatus,
  }
}

/* ------------------------------------------------------------------ */
/* Asesor periode                                                      */
/* ------------------------------------------------------------------ */

export async function updatePeriodAssessors(
  user: AuthenticatedUser,
  periodId: string,
  role: AssessorRole,
  userIds: string[],
) {
  const period = await requirePeriod(periodId)

  await assertCanEdit(period.period_id, 'Asesor periode tidak dapat diatur')

  const uniqueIds = [...new Set(userIds)]
  const [users, assignments] = await Promise.all([
    findAllUsers(),
    findAssessorAssignmentsByPeriod(period.period_id),
  ])
  const userById = new Map(users.map((item) => [item.user_id, item]))

  const invalid = uniqueIds.filter((id) => !isActiveAssessor(userById.get(id), role))
  if (invalid.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Terdapat akun yang bukan ${ROLE_LABEL[role]} aktif.`,
    })
  }

  // Asesor yang masih memegang peserta tidak boleh dikeluarkan dari periode.
  const column = role === 'TECHNICAL_ASSESSOR' ? 'technical_assessor_id' : 'public_assessor_id'
  const stillAssigned = new Set(
    assignments.map((item) => item[column]).filter((id) => id && !uniqueIds.includes(id)),
  )

  if (stillAssigned.size > 0) {
    const names = [...stillAssigned].map((id) => userById.get(id)?.full_name || id).join(', ')
    throw createError({
      statusCode: 409,
      statusMessage: `Asesor berikut masih ditugaskan ke peserta, pindahkan pesertanya terlebih dahulu: ${names}.`,
    })
  }

  await setPeriodAssessors({
    periodId: period.period_id,
    role,
    userIds: uniqueIds,
    actorId: user.user_id,
  })

  return { role, count: uniqueIds.length }
}

/* ------------------------------------------------------------------ */
/* Penugasan peserta (satu atau banyak)                                */
/* ------------------------------------------------------------------ */

export async function assignAssessors(
  user: AuthenticatedUser,
  periodId: string,
  input: {
    applicationIds: string[]
    technicalAssessorId?: string
    publicAssessorId?: string
    reason: string
  },
) {
  const period = await requirePeriod(periodId)
  const applicationIds = [...new Set(input.applicationIds)]

  if (!input.technicalAssessorId && !input.publicAssessorId) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih minimal satu asesor.' })
  }

  await assertCanEdit(period.period_id, 'Penugasan asesor tidak dapat dilakukan')

  // Validasi seluruh data sebelum menulis apa pun.
  const [applications, submissions, periodAssessors, existingAssignments] = await Promise.all([
    findApplicationsByPeriod(period.period_id),
    findCmsp01SubmissionsByPeriod(period.period_id),
    findActivePeriodAssessors(period.period_id),
    findAssessorAssignmentsByPeriod(period.period_id),
  ])

  const acceptedIds = new Set(
    applications.filter((item) => item.application_status === 'accepted').map((item) => item.application_id),
  )
  const verifiedIds = new Set(
    submissions.filter((item) => item.status === 'VERIFIED').map((item) => item.application_id),
  )

  const notEligible = applicationIds.filter((id) => !acceptedIds.has(id) || !verifiedIds.has(id))

  if (notEligible.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `${notEligible.length} peserta belum dapat ditugaskan (self assessment belum terverifikasi atau bukan peserta periode ini).`,
    })
  }

  const users = await findAllUsers()
  const userById = new Map(users.map((item) => [item.user_id, item]))

  const assertPeriodAssessor = (userId: string | undefined, role: AssessorRole) => {
    if (!userId) return

    const inPeriod = periodAssessors.some((item) => item.user_id === userId && item.assessor_role === role)

    if (!inPeriod || !isActiveAssessor(userById.get(userId), role)) {
      throw createError({
        statusCode: 400,
        statusMessage: `${ROLE_LABEL[role]} yang dipilih tidak terdaftar pada periode ini atau tidak aktif.`,
      })
    }
  }

  assertPeriodAssessor(input.technicalAssessorId, 'TECHNICAL_ASSESSOR')
  assertPeriodAssessor(input.publicAssessorId, 'PUBLIC_ASSESSOR')

  // Mengganti asesor yang sudah ditugaskan wajib disertai alasan.
  const selected = new Set(applicationIds)

  // Asesor Teknis tidak boleh diganti bila penilaian CMSP-02 peserta tersebut sudah dimulai.
  if (input.technicalAssessorId) {
    const started = new Set(
      (await findTechnicalAssessmentsByPeriod(period.period_id).catch(() => [])).map((item) => item.application_id),
    )
    const blocked = existingAssignments.filter((item) =>
      selected.has(item.application_id) &&
      started.has(item.application_id) &&
      item.technical_assessor_id &&
      item.technical_assessor_id !== input.technicalAssessorId,
    )

    if (blocked.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `${blocked.length} peserta tidak dapat diganti Asesor Teknisnya karena penilaian CMSP-02 sudah dimulai.`,
      })
    }
  }

  // Asesor Kepublikan tidak boleh diganti bila penilaian CMSP-03 peserta tersebut sudah dimulai.
  if (input.publicAssessorId) {
    const started = new Set(
      (await findPublicAssessmentsByPeriod(period.period_id).catch(() => [])).map((item) => item.application_id),
    )
    const blocked = existingAssignments.filter((item) =>
      selected.has(item.application_id) &&
      started.has(item.application_id) &&
      item.public_assessor_id &&
      item.public_assessor_id !== input.publicAssessorId,
    )

    if (blocked.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `${blocked.length} peserta tidak dapat diganti Asesor Kepublikannya karena penilaian CMSP-03 sudah dimulai.`,
      })
    }
  }

  const replacing = existingAssignments.some((item) =>
    selected.has(item.application_id) && (
      (input.technicalAssessorId && item.technical_assessor_id && item.technical_assessor_id !== input.technicalAssessorId) ||
      (input.publicAssessorId && item.public_assessor_id && item.public_assessor_id !== input.publicAssessorId)
    ),
  )

  if (replacing && !input.reason) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Isi alasan pergantian asesor karena ada peserta yang asesornya akan diganti.',
    })
  }

  await assertAssignmentLogSheetReady()

  const changes = await upsertAssessorAssignments({
    periodId: period.period_id,
    applicationIds,
    technicalAssessorId: input.technicalAssessorId,
    publicAssessorId: input.publicAssessorId,
    actorId: user.user_id,
  })

  await appendAssignmentLogs({
    periodId: period.period_id,
    changes,
    reason: input.reason,
    actorId: user.user_id,
  })

  return { count: applicationIds.length, changed: changes.length }
}
