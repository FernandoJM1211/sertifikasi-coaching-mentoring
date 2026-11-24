import {
  findAssignmentsByPublicAssessor,
  findAssignmentsByTechnicalAssessor,
} from '../repositories/assessor-assignment.repository'
import { findAllCertificationPeriods } from '../repositories/certification-period.repository'
import { findAllCertificationTimelines } from '../repositories/certification-timeline.repository'
import type { HomeInsight, HomeStageAccess } from '../../shared/utils/home-insight'
import { ASSESSMENT_RESULT_STAGE } from '../../shared/utils/assessment-result'
import { getApplicationVerificationSummaryByPeriod } from './application-verification-list.service'
import { getPeriodAssessmentResults } from './assessment-result.service'
import { listAssessorAssignments } from './assessor-assignment.service'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess, type StageAccess } from './certification-stage.service'
import { getPeriodEvaluationPlan } from './evaluation-admin.service'
import { listPublicAssessments } from './public-assessment.service'
import { listSelfAssessmentVerifications } from './self-assessment-verification.service'
import { listTechnicalAssessments } from './technical-assessment.service'

const toAccess = (stage: StageAccess): HomeStageAccess => ({ open: stage.open, manual: Boolean(stage.manual) })

/**
 * Ringkasan pekerjaan role pada satu periode untuk tombol dinamis beranda.
 * Memakai ulang logika halaman daftar masing-masing agar angka di beranda sama persis.
 */
async function buildInsight(user: AuthenticatedUser, periodId: string): Promise<HomeInsight | null> {
  switch (user.role) {
    case 'TECHNICAL_ASSESSOR': {
      const list = await listTechnicalAssessments(user, periodId)
      const { summary } = list
      return {
        kind: 'TECHNICAL_ASSESSOR',
        stage: toAccess(list.stage),
        counts: {
          total: summary.total,
          // summary.notStarted sudah mencakup yang menunggu tes tertulis.
          todo: summary.notStarted - summary.waiting + summary.draft,
          draft: summary.draft,
          waiting: summary.waiting,
          submitted: summary.submitted,
          withdrawn: summary.withdrawn,
        },
      }
    }

    case 'PUBLIC_ASSESSOR': {
      const list = await listPublicAssessments(user, periodId)
      const count = (status: string) => list.items.filter((item) => item.status === status).length
      return {
        kind: 'PUBLIC_ASSESSOR',
        stage: toAccess(list.stage),
        counts: {
          total: list.items.length,
          todo: count('NOT_STARTED') + count('DRAFT'),
          draft: count('DRAFT'),
          waiting: count('WAITING'),
          stopped: count('STOPPED'),
          submitted: count('SUBMITTED'),
          withdrawn: count('WITHDRAWN'),
        },
      }
    }

    case 'VERIFIKATOR': {
      const [applicants, selfAssessment, assignment] = await Promise.all([
        getApplicationVerificationSummaryByPeriod(periodId),
        listSelfAssessmentVerifications(periodId),
        listAssessorAssignments(periodId),
      ])
      return {
        kind: 'VERIFIKATOR',
        applicants: { pending: applicants.pendingVerification },
        selfAssessment: { stage: toAccess(selfAssessment.stage), ...selfAssessment.summary },
        assignment: {
          canEdit: assignment.canEdit,
          unassigned: assignment.summary.unassigned,
          assigned: assignment.summary.assigned,
        },
      }
    }

    case 'SUPER_ADMIN': {
      const resultStage = await getStageAccess(periodId, ASSESSMENT_RESULT_STAGE)
      // Data penetapan cukup berat; hanya dibaca saat tahapnya dibuka.
      const [plan, result] = await Promise.all([
        getPeriodEvaluationPlan(periodId),
        resultStage.open ? getPeriodAssessmentResults(periodId) : Promise.resolve(null),
      ])
      return {
        kind: 'SUPER_ADMIN',
        evaluation: {
          stage: toAccess(plan.stage),
          applyState: plan.apply_state,
          eligible: plan.summary.eligible,
          submitted: plan.summary.submitted,
        },
        result: result
          ? {
              stage: toAccess(result.stage),
              decided: result.decision.decided,
              canDecide: result.decision.canDecide,
              total: result.summary.total,
              incomplete: result.summary.incomplete,
              passed: result.summary.passed,
              remedial: result.summary.remedial,
              withdrawn: result.summary.withdrawn,
            }
          : null,
      }
    }

    default:
      return null
  }
}

/**
 * Beranda staf (Super Admin, Verifikator, Asesor): periode AKTIF beserta timeline-nya
 * dan ringkasan pekerjaan role (`insight`) untuk tombol dinamis.
 * - Super Admin & Verifikator: semua periode aktif.
 * - Asesor Teknis / Kepublikan: hanya periode aktif yang memiliki peserta yang ditugaskan kepadanya.
 */
export async function listHomePeriods(user: AuthenticatedUser) {
  const [periods, timelines, assignments] = await Promise.all([
    findAllCertificationPeriods(),
    findAllCertificationTimelines(),
    user.role === 'TECHNICAL_ASSESSOR'
      ? findAssignmentsByTechnicalAssessor(user.user_id)
      : user.role === 'PUBLIC_ASSESSOR'
        ? findAssignmentsByPublicAssessor(user.user_id)
        : Promise.resolve(null),
  ])

  const assignedPeriodIds = assignments ? new Set(assignments.map((item) => item.period_id)) : null

  const activePeriods = periods
    .filter((period) => period.period_status.trim().toUpperCase() === 'ACTIVE')
    .filter((period) => !assignedPeriodIds || assignedPeriodIds.has(period.period_id))

  return Promise.all(activePeriods.map(async (period) => ({
    period_id: period.period_id,
    period_name: period.period_name,
    timelines: timelines
      .filter((item) => item.period_id === period.period_id)
      .sort((a, b) => Number(a.stage_order) - Number(b.stage_order))
      .map((item) => ({
        stage_order: item.stage_order,
        stage_code: item.stage_code,
        stage_name: item.stage_name,
        start_at: item.start_at,
        end_at: item.end_at,
      })),
    // Ringkasan gagal dimuat → beranda tetap tampil dengan tombol berdasarkan jadwal saja.
    insight: await buildInsight(user, period.period_id).catch((error) => {
      console.error('[home] Ringkasan beranda gagal dihitung:', period.period_id, error)
      return null
    }),
  })))
}
