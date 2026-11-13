
import { getAuthenticatedUser } from '../../services/auth.service'
import { findApplicationsByPersonId } from '../../repositories/application.repository'
import { findCertificationPeriodById } from '../../repositories/certification-period.repository'
import { findCertificationTimelinesByPeriodId } from '../../repositories/certification-timeline.repository'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan login terlebih dahulu.',
    })
  }

  const user = await getAuthenticatedUser(sessionToken)

  if (user.role !== 'PARTICIPANT') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akses hanya tersedia untuk peserta sertifikasi.',
    })
  }

  const applications = await findApplicationsByPersonId(user.person_id)

  const dashboardApplications = await Promise.all(
    applications.map(async (application) => {
      const [period, timelines] = await Promise.all([
        findCertificationPeriodById(application.period_id),
        findCertificationTimelinesByPeriodId(application.period_id),
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
