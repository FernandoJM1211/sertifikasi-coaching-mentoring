import { findApplicationsByPeriod } from '../repositories/application.repository'
import {
  assessmentResults,
  findActiveResultByApplication,
  findActiveResultsByPeriod,
  type AssessmentResult,
} from '../repositories/assessment-result.repository'
import { findCertificationPeriodById } from '../repositories/certification-period.repository'
import { evaluationAttempts, periodEvaluations, type EvaluationAttempt } from '../repositories/evaluation.repository'
import { findPublicAssessmentsByPeriod } from '../repositories/public-assessment.repository'
import { findCmsp01SubmissionsByPeriod } from '../repositories/self-assessment.repository'
import { findTechnicalAssessmentsByPeriod } from '../repositories/technical-assessment.repository'
import { findAllUsers } from '../repositories/user.repository'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess, hasStageEnded } from './certification-stage.service'
import { EVALUATION_STAGE, finalizeExpiredAttempts } from './evaluation-attempt.service'
import {
  ASSESSMENT_RESULT_STAGE,
  type AssessmentOutcome,
  type RemedialReason,
} from '../../shared/utils/assessment-result'

/**
 * Penetapan Hasil Asesmen (tahap 7) — khusus Super Admin (docs/08 K-21).
 *
 * Hasil tiap peserta ditentukan OTOMATIS dari tiga penilaian:
 *   Lulus    = nilai tes tertulis ≥ passing grade, Asesor Teknis "dapat dilanjutkan",
 *              dan Asesor Kepublikan "dapat dilanjutkan";
 *   Remedial = salah satunya tidak terpenuhi (Asesor Kepublikan tidak menilai bila
 *              Asesor Teknis "tidak dapat dilanjutkan" — langsung Remedial).
 * Super Admin tidak mengubah hasil; hanya menetapkan sekaligus untuk satu periode setelah
 * semua hasil lengkap, dan dapat membatalkan selama tahap masih dibuka.
 */

function notFound(message: string): never {
  throw createError({ statusCode: 404, statusMessage: message })
}

function conflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message })
}

type WrittenStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED'
/** NOT_REQUIRED = peserta Tidak Melanjutkan (tidak mengerjakan tes tertulis, K-25). */
type TechnicalStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'NOT_REQUIRED'
/**
 * NOT_REQUIRED = Asesor Teknis "tidak dapat dilanjutkan" atau peserta Tidak Melanjutkan;
 * WAITING = Asesor Teknis belum mengirim.
 */
type PublicStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'NOT_REQUIRED' | 'WAITING'
type Recommendation = 'CONTINUE' | 'NOT_CONTINUE' | ''

async function requirePeriod(periodId: string) {
  const period = await findCertificationPeriodById(periodId)
  if (!period) notFound('Periode sertifikasi tidak ditemukan.')
  return period
}

const asRecommendation = (value: string): Recommendation =>
  value === 'CONTINUE' || value === 'NOT_CONTINUE' ? value : ''

/** Menyusun hasil seluruh peserta satu periode dari data penilaian terkini. */
async function buildPeriodResults(periodId: string) {
  const [applications, submissions, periodAttempts, configs, technicals, publics, activeResults, writtenEnded] = await Promise.all([
    findApplicationsByPeriod(periodId),
    findCmsp01SubmissionsByPeriod(periodId),
    evaluationAttempts.findWhere((item) => item.period_id === periodId && item.status !== 'RESET'),
    periodEvaluations.findWhere((item) => item.period_id === periodId),
    findTechnicalAssessmentsByPeriod(periodId),
    findPublicAssessmentsByPeriod(periodId),
    findActiveResultsByPeriod(periodId),
    hasStageEnded(periodId, EVALUATION_STAGE),
  ])

  // Pengerjaan yang lewat batas waktu ditutup otomatis dulu agar nilainya terhitung.
  const attempts = await finalizeExpiredAttempts(periodAttempts)
  const attemptByApplication = new Map<string, EvaluationAttempt>()
  for (const attempt of [...attempts].sort((a, b) => b.attempt_id.localeCompare(a.attempt_id))) {
    attemptByApplication.set(attempt.application_id, attempt)
  }

  const submissionByApplication = new Map(submissions.map((item) => [item.application_id, item]))
  const technicalByApplication = new Map(technicals.map((item) => [item.application_id, item]))
  const publicByApplication = new Map(publics.map((item) => [item.application_id, item]))
  const resultByApplication = new Map(activeResults.map((item) => [item.application_id, item]))
  const configPassingGrade = Number(configs[0]?.passing_grade || 0)

  // Peserta yang berhak (sama dengan Tes Tertulis): pendaftaran diterima & self assessment terverifikasi.
  const items = applications
    .filter((application) => application.application_status === 'accepted')
    .filter((application) => submissionByApplication.get(application.application_id)?.status === 'VERIFIED')
    .map((application) => {
      const id = application.application_id
      const cmsp01 = submissionByApplication.get(id)
      const attempt = attemptByApplication.get(id)
      const technical = technicalByApplication.get(id)
      const publicAssessment = publicByApplication.get(id)

      // Tes tertulis
      const writtenStatus: WrittenStatus = attempt?.status === 'SUBMITTED' ? 'SUBMITTED' : attempt ? 'IN_PROGRESS' : 'NOT_STARTED'
      const passingGrade = Number(attempt?.passing_grade || configPassingGrade)
      const score = writtenStatus === 'SUBMITTED' ? Number(attempt!.score) : null
      const writtenPassed = score === null ? null : score >= passingGrade

      // Tidak Melanjutkan (K-25): tahap Tes Tertulis berakhir & peserta tidak mengerjakannya.
      // Tidak dinilai asesor, tidak lulus, tidak berhak remedial, dan tidak menahan penetapan.
      const withdrawn = writtenEnded && writtenStatus === 'NOT_STARTED' && technical?.status !== 'SUBMITTED'

      // Asesor Teknis
      const technicalStatus: TechnicalStatus = withdrawn
        ? 'NOT_REQUIRED'
        : technical?.status === 'SUBMITTED' ? 'SUBMITTED' : technical ? 'DRAFT' : 'NOT_STARTED'
      const technicalRecommendation = technicalStatus === 'SUBMITTED' ? asRecommendation(technical!.recommendation) : ''

      // Asesor Kepublikan (hanya dinilai bila Asesor Teknis "dapat dilanjutkan")
      let publicStatus: PublicStatus
      if (withdrawn) publicStatus = 'NOT_REQUIRED'
      else if (technicalStatus !== 'SUBMITTED') publicStatus = 'WAITING'
      else if (technicalRecommendation === 'NOT_CONTINUE') publicStatus = 'NOT_REQUIRED'
      else publicStatus = publicAssessment?.status === 'SUBMITTED' ? 'SUBMITTED' : publicAssessment ? 'DRAFT' : 'NOT_STARTED'
      const publicRecommendation = publicStatus === 'SUBMITTED' ? asRecommendation(publicAssessment!.recommendation) : ''

      // Kelengkapan: tes tertulis terkirim, Asesor Teknis terkirim, Asesor Kepublikan terkirim (bila diperlukan).
      const missing: string[] = []
      if (writtenStatus !== 'SUBMITTED' && !withdrawn) missing.push('Tes tertulis')
      if (technicalStatus !== 'SUBMITTED' && !withdrawn) missing.push('Asesor Teknis')
      if (publicStatus !== 'SUBMITTED' && publicStatus !== 'NOT_REQUIRED') missing.push('Asesor Kepublikan')
      const complete = missing.length === 0

      const reasons: RemedialReason[] = []
      if (withdrawn) {
        reasons.push('WRITTEN_NOT_TAKEN')
      } else if (complete) {
        if (!writtenPassed) reasons.push('WRITTEN_BELOW_PASSING_GRADE')
        if (technicalRecommendation !== 'CONTINUE') reasons.push('TECHNICAL_NOT_CONTINUE')
        if (publicStatus === 'SUBMITTED' && publicRecommendation !== 'CONTINUE') reasons.push('PUBLIC_NOT_CONTINUE')
      }
      const outcome: AssessmentOutcome | null = withdrawn
        ? 'WITHDRAWN'
        : complete ? (reasons.length === 0 ? 'PASSED' : 'REMEDIAL') : null

      return {
        application_id: id,
        full_name: cmsp01?.full_name || application.full_name_snapshot,
        nip: cmsp01?.nip || application.nip_snapshot,
        institution_name: cmsp01?.institution_name || application.institution_name,
        written: {
          status: writtenStatus,
          attempt_id: attempt?.attempt_id ?? '',
          score,
          passing_grade: passingGrade,
          passed: writtenPassed,
        },
        technical: { status: technicalStatus, recommendation: technicalRecommendation },
        public: { status: publicStatus, recommendation: publicRecommendation },
        complete,
        missing,
        outcome,
        reasons,
        decided: resultByApplication.get(id) ?? null,
      }
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))

  return { items, activeResults }
}

export async function getPeriodAssessmentResults(periodId: string) {
  const period = await requirePeriod(periodId)
  const [{ items, activeResults }, stage, users] = await Promise.all([
    buildPeriodResults(periodId),
    getStageAccess(periodId, ASSESSMENT_RESULT_STAGE),
    findAllUsers(),
  ])

  const decided = activeResults.length > 0
  const latest = [...activeResults].sort((a, b) => b.decided_at.localeCompare(a.decided_at))[0]
  const decidedByName = latest ? users.find((item) => item.user_id === latest.decided_by)?.full_name || latest.decided_by : ''

  // Setelah ditetapkan, yang ditampilkan adalah hasil yang tersimpan (potret saat penetapan).
  const view = items.map((item) => {
    const saved = item.decided
    return {
      ...item,
      decided: undefined,
      outcome: saved ? (saved.outcome as AssessmentOutcome) : item.outcome,
      reasons: saved ? (saved.reasons ? (saved.reasons.split(',') as RemedialReason[]) : []) : item.reasons,
      is_decided: Boolean(saved),
    }
  })

  const incomplete = view.filter((item) => !item.complete).length

  return {
    period: { period_id: period.period_id, period_name: period.period_name, period_status: period.period_status },
    stage,
    decision: {
      decided,
      decided_at: latest?.decided_at ?? '',
      decided_by_name: decidedByName,
      canDecide: stage.open && !decided && view.length > 0 && incomplete === 0,
      canCancel: stage.open && decided,
    },
    summary: {
      total: view.length,
      incomplete,
      passed: view.filter((item) => item.outcome === 'PASSED').length,
      remedial: view.filter((item) => item.outcome === 'REMEDIAL').length,
      withdrawn: view.filter((item) => item.outcome === 'WITHDRAWN').length,
    },
    items: view,
  }
}

/** Menetapkan hasil seluruh peserta satu periode (sekali tulis). */
export async function decidePeriodAssessmentResults(user: AuthenticatedUser, periodId: string) {
  await requirePeriod(periodId)
  const stage = await getStageAccess(periodId, ASSESSMENT_RESULT_STAGE)
  if (!stage.open) conflict(stage.message || 'Tahap Penetapan Hasil Asesmen sedang tidak dibuka.')

  const { items, activeResults } = await buildPeriodResults(periodId)
  if (activeResults.length > 0) conflict('Hasil asesmen periode ini sudah ditetapkan.')
  if (items.length === 0) conflict('Belum ada peserta pada periode ini.')

  const incomplete = items.filter((item) => !item.complete)
  if (incomplete.length > 0) {
    conflict(`Masih ada ${incomplete.length} peserta yang hasil penilaiannya belum lengkap.`)
  }

  const now = new Date().toISOString()
  const created = await assessmentResults.createMany(items.map((item) => ({
    application_id: item.application_id,
    period_id: periodId,
    round: '1',
    outcome: item.outcome!,
    written_score: String(item.written.score ?? ''),
    written_passing_grade: String(item.written.passing_grade),
    technical_recommendation: item.technical.status === 'NOT_REQUIRED' ? 'NOT_REQUIRED' : item.technical.recommendation,
    public_recommendation: item.public.status === 'NOT_REQUIRED' ? 'NOT_REQUIRED' : item.public.recommendation,
    reasons: item.reasons.join(','),
    status: 'ACTIVE',
    decided_by: user.user_id,
    decided_at: now,
    cancelled_by: '',
    cancelled_at: '',
  })))

  return {
    total: created.length,
    passed: created.filter((item) => item.outcome === 'PASSED').length,
    remedial: created.filter((item) => item.outcome === 'REMEDIAL').length,
    withdrawn: created.filter((item) => item.outcome === 'WITHDRAWN').length,
  }
}

/** Membatalkan penetapan (baris ditandai CANCELLED, tidak dihapus) selama tahap masih dibuka. */
export async function cancelPeriodAssessmentResults(user: AuthenticatedUser, periodId: string) {
  await requirePeriod(periodId)
  const stage = await getStageAccess(periodId, ASSESSMENT_RESULT_STAGE)
  if (!stage.open) conflict(stage.message || 'Tahap Penetapan Hasil Asesmen sedang tidak dibuka.')

  const active = await findActiveResultsByPeriod(periodId)
  if (active.length === 0) conflict('Hasil asesmen periode ini belum ditetapkan.')

  const now = new Date().toISOString()
  await assessmentResults.updateMany(active.map((item: AssessmentResult) => ({
    id: item.result_id,
    patch: { status: 'CANCELLED', cancelled_by: user.user_id, cancelled_at: now },
  })))

  return { cancelled: active.length }
}

/**
 * Pengaman untuk buka kunci penilaian asesor & reset tes tertulis: hasil yang sudah ditetapkan
 * tidak boleh berubah diam-diam. Bila sheet `assessment_results` belum dibuat, dianggap belum ditetapkan.
 */
export async function assertResultNotDecided(applicationId: string) {
  let result: AssessmentResult | null = null

  try {
    result = await findActiveResultByApplication(applicationId)
  } catch {
    return
  }

  if (result) {
    conflict('Hasil asesmen peserta ini sudah ditetapkan. Batalkan penetapan pada menu Penetapan Hasil Asesmen terlebih dahulu.')
  }
}
