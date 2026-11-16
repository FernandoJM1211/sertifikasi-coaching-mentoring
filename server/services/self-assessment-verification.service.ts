import type { H3Event } from 'h3'

import {
  findApplicationById,
  findApplicationsByPeriod,
  type Application,
} from '../repositories/application.repository'
import { findCertificationPeriodById } from '../repositories/certification-period.repository'
import {
  createSelfAssessmentReview,
  findCmsp01ByApplicationId,
  findCmsp01SubmissionsByPeriod,
  findCmsp02ByApplicationId,
  findSelfAssessmentReviews,
  upsertCmsp01,
  upsertCmsp02,
} from '../repositories/self-assessment.repository'
import { findAllUsers } from '../repositories/user.repository'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess } from './certification-stage.service'
import {
  loadSelfAssessmentContent,
  sendLinkedSelfAssessmentFile,
} from './self-assessment.service'

/**
 * Verifikasi CMSP-01 & CMSP-02 oleh Verifikator (dan Super Admin).
 * Keputusan hanya dapat diambil saat tahap SELF_ASSESSMENT_VERIFICATION dibuka.
 */

const VERIFICATION_STAGE = 'SELF_ASSESSMENT_VERIFICATION'
export const SELF_ASSESSMENT_REVIEW_DECISIONS = ['VERIFIED', 'REVISION_REQUESTED'] as const
export type SelfAssessmentReviewDecision = (typeof SELF_ASSESSMENT_REVIEW_DECISIONS)[number]
export const REVIEW_NOTE_MAX_LENGTH = 2000

function notFound(): never {
  throw createError({ statusCode: 404, statusMessage: 'Pengajuan sertifikasi tidak ditemukan.' })
}

async function requireAcceptedApplication(applicationId: string): Promise<Application> {
  const application = await findApplicationById(applicationId)

  if (!application || application.application_status !== 'accepted') notFound()

  return application
}

/* ------------------------------------------------------------------ */
/* Daftar                                                              */
/* ------------------------------------------------------------------ */

export async function listSelfAssessmentVerifications(periodId: string) {
  const period = await findCertificationPeriodById(periodId)

  if (!period) {
    throw createError({ statusCode: 404, statusMessage: 'Periode sertifikasi tidak ditemukan.' })
  }

  const [applications, submissions, stage] = await Promise.all([
    findApplicationsByPeriod(period.period_id),
    findCmsp01SubmissionsByPeriod(period.period_id),
    getStageAccess(period.period_id, VERIFICATION_STAGE),
  ])

  const submissionByApplication = new Map(
    submissions.map((item) => [item.application_id, item]),
  )

  const items = applications
    .filter((application) => application.application_status === 'accepted')
    .map((application) => {
      const cmsp01 = submissionByApplication.get(application.application_id)

      return {
        application_id: application.application_id,
        full_name: cmsp01?.full_name || application.full_name_snapshot,
        nip: cmsp01?.nip || application.nip_snapshot,
        institution_name: cmsp01?.institution_name || application.institution_name,
        status: cmsp01?.status || 'NEW',
        submitted_at: cmsp01?.submitted_at ?? '',
        revision_count: Number(cmsp01?.revision_count) || 0,
      }
    })
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))

  const count = (statuses: string[]) => items.filter((item) => statuses.includes(item.status)).length

  return {
    period: {
      period_id: period.period_id,
      period_name: period.period_name,
      period_status: period.period_status,
    },
    stage,
    summary: {
      submitted: count(['SUBMITTED']),
      revision: count(['REVISION_REQUESTED']),
      verified: count(['VERIFIED']),
      notSubmitted: count(['NEW', 'DRAFT']),
    },
    items,
  }
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export async function getSelfAssessmentVerification(applicationId: string) {
  const application = await requireAcceptedApplication(applicationId)

  const [content, reviews, stage, users] = await Promise.all([
    loadSelfAssessmentContent(application),
    findSelfAssessmentReviews(application.application_id),
    getStageAccess(application.period_id, VERIFICATION_STAGE),
    findAllUsers(),
  ])

  const { hasCmsp01, ...rest } = content

  if (!hasCmsp01 || rest.status === 'DRAFT') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Peserta belum mengirim self assessment.',
    })
  }

  const userNames = new Map(users.map((user) => [user.user_id, user.full_name]))

  return {
    ...rest,
    stage,
    canReview: stage.open && rest.status === 'SUBMITTED',
    reviews: reviews.map((review) => ({
      review_id: review.review_id,
      decision: review.decision,
      cmsp01_note: review.cmsp01_note,
      cmsp02_note: review.cmsp02_note,
      reviewed_by_name: userNames.get(review.reviewed_by) || 'Verifikator',
      reviewed_at: review.reviewed_at,
    })),
  }
}

/* ------------------------------------------------------------------ */
/* Keputusan                                                           */
/* ------------------------------------------------------------------ */

export async function reviewSelfAssessment(
  user: AuthenticatedUser,
  applicationId: string,
  input: { decision: SelfAssessmentReviewDecision, cmsp01Note: string, cmsp02Note: string },
) {
  const application = await requireAcceptedApplication(applicationId)

  const access = await getStageAccess(application.period_id, VERIFICATION_STAGE)

  if (!access.open) {
    throw createError({
      statusCode: 409,
      statusMessage: `Verifikasi self assessment tidak dapat dilakukan: ${access.message}`,
    })
  }

  const [cmsp01, cmsp02] = await Promise.all([
    findCmsp01ByApplicationId(application.application_id),
    findCmsp02ByApplicationId(application.application_id),
  ])

  if (!cmsp01 || !cmsp02 || cmsp01.status !== 'SUBMITTED') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Self assessment ini tidak sedang menunggu verifikasi.',
    })
  }

  if (
    input.decision === 'REVISION_REQUESTED' &&
    !input.cmsp01Note && !input.cmsp02Note
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Isi catatan perbaikan untuk CMSP-01 atau CMSP-02.',
    })
  }

  const now = new Date().toISOString()

  // Riwayat keputusan dicatat lebih dulu; status diubah terakhir agar
  // jika gagal di tengah, status masih SUBMITTED dan dapat diulang.
  await createSelfAssessmentReview({
    application_id: application.application_id,
    decision: input.decision,
    cmsp01_note: input.cmsp01Note,
    cmsp02_note: input.cmsp02Note,
    reviewed_by: user.user_id,
    reviewed_at: now,
    created_at: now,
  })

  await upsertCmsp02({ application_id: application.application_id, status: input.decision, updated_at: now })
  await upsertCmsp01({ application_id: application.application_id, status: input.decision, updated_at: now })

  return { status: input.decision, reviewedAt: now }
}

/* ------------------------------------------------------------------ */
/* Berkas                                                              */
/* ------------------------------------------------------------------ */

export async function sendSelfAssessmentVerificationFile(
  event: H3Event,
  applicationId: string,
  fileId: string,
) {
  const application = await requireAcceptedApplication(applicationId)
  return sendLinkedSelfAssessmentFile(event, application, fileId)
}
