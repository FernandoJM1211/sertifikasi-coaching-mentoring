import { findApplicationsByPersonId } from '../../repositories/application.repository'
import { findCertificationPeriodById } from '../../repositories/certification-period.repository'
import { findCertificationTimelinesByPeriodId } from '../../repositories/certification-timeline.repository'
import { getEvaluationProgress } from '../../services/evaluation-attempt.service'
import { getSelfAssessmentProgress } from '../../services/self-assessment.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])

  const applications = await findApplicationsByPersonId(user.person_id)

  const dashboardApplications = await Promise.all(
    applications.map(async (application) => {
      const accepted = application.application_status === 'accepted'
      const [period, timelines, selfAssessment, evaluation] = await Promise.all([
        findCertificationPeriodById(application.period_id),
        findCertificationTimelinesByPeriodId(application.period_id),
        // Progres pekerjaan peserta untuk tombol dinamis di beranda.
        accepted ? getSelfAssessmentProgress(application) : null,
        accepted ? getEvaluationProgress(application) : null,
      ])

      return {
        application: {
          application_id: application.application_id,
          period_id: application.period_id,
          category_id: application.category_id,
          full_name_snapshot: application.full_name_snapshot,
          institution_name: application.institution_name,
          region: application.region,
          application_status: application.application_status,
          submitted_at: application.submitted_at,
          updated_at: application.updated_at,
        },
        period,
        timelines: timelines.sort(
          (a, b) => Number(a.stage_order) - Number(b.stage_order),
        ),
        progress: { self_assessment: selfAssessment, evaluation },
      }
    }),
  )

  return {
    success: true,
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      username_email: user.username_email,
    },
    applications: dashboardApplications,
  }
})
