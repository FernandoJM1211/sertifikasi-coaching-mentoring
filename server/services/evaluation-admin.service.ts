import { randomBytes } from 'node:crypto'
import { findApplicationById, findApplicationsByPeriod } from '../repositories/application.repository'
import { findAllCertificationPeriods, findCertificationPeriodById } from '../repositories/certification-period.repository'
import {
  evaluationAttempts,
  evaluationPackages,
  evaluationQuestions,
  evaluationSnapshotQuestions,
  periodEvaluations,
  type EvaluationAttempt,
  type EvaluationPackage,
  type EvaluationQuestion,
} from '../repositories/evaluation.repository'
import { findCmsp01ByApplicationId, findCmsp01SubmissionsByPeriod } from '../repositories/self-assessment.repository'
import type { PackageInput, PeriodEvaluationInput, QuestionInput } from '../utils/evaluation-input'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess } from './certification-stage.service'
import {
  EVALUATION_STAGE,
  finalizeExpiredAttempts,
  loadQuestionResolver,
  parseAttempt,
  questionOptionKeys,
  questionOptionText,
  type QuestionContent,
} from './evaluation-attempt.service'
import { EVALUATION_OPTION_KEYS } from '../../shared/utils/evaluation'

/**
 * Pengelolaan evaluasi oleh Super Admin: bank soal, paket soal, dan
 * perencanaan evaluasi per periode (termasuk melihat nilai & mereset progres peserta).
 *
 * Model snapshot (tidak ada penguncian):
 * - bank soal & paket soal selalu dapat diubah; ditandai "sudah digunakan" bila pernah dipakai;
 * - "Simpan & Terapkan" pada perencanaan menyalin isi soal paket saat itu ke
 *   `evaluation_snapshot_questions`; peserta yang mulai sesudahnya memakai snapshot tersebut;
 * - perubahan bank soal/paket baru berlaku setelah perencanaan diterapkan ulang;
 * - setiap pengerjaan mencatat snapshot-nya sehingga nilai lama tidak pernah berubah.
 */

const splitIds = (value: string) => (value ? value.split(',').filter(Boolean) : [])

function notFound(message: string): never {
  throw createError({ statusCode: 404, statusMessage: message })
}

function conflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message })
}

/** ID soal & paket yang pernah dipakai pada pengerjaan peserta (termasuk yang direset). */
async function findUsage(attempts?: EvaluationAttempt[]) {
  const list = attempts ?? (await evaluationAttempts.findAll())

  return {
    questionIds: new Set(list.flatMap((item) => splitIds(item.question_ids))),
    packageIds: new Set(list.map((item) => item.package_id)),
  }
}

/* ------------------------------------------------------------------ */
/* Bank soal                                                           */
/* ------------------------------------------------------------------ */

function toQuestionResponse(question: EvaluationQuestion, used: boolean, packageCount: number) {
  return {
    question_id: question.question_id,
    topic: question.topic,
    question_text: question.question_text,
    options: questionOptionKeys(question).map((key) => ({
      key,
      text: question[`option_${key.toLowerCase()}` as keyof EvaluationQuestion],
    })),
    correct_option: question.correct_option,
    status: question.status,
    used,
    package_count: packageCount,
    updated_at: question.updated_at,
  }
}

export async function listQuestions() {
  const [questions, packages, usage] = await Promise.all([
    evaluationQuestions.findAll(),
    evaluationPackages.findAll(),
    findUsage(),
  ])

  const packageCount = new Map<string, number>()
  for (const pack of packages.filter((item) => item.status === 'ACTIVE')) {
    for (const questionId of splitIds(pack.question_ids)) {
      packageCount.set(questionId, (packageCount.get(questionId) ?? 0) + 1)
    }
  }

  return questions
    .map((question) =>
      toQuestionResponse(question, usage.questionIds.has(question.question_id), packageCount.get(question.question_id) ?? 0),
    )
    .reverse()
}

function questionColumns(input: QuestionInput) {
  const option = (index: number) => input.options[index] ?? ''

  return {
    topic: input.topic,
    question_text: input.questionText,
    option_a: option(0),
    option_b: option(1),
    option_c: option(2),
    option_d: option(3),
    option_e: option(4),
    correct_option: input.correctOption,
    shuffle_options: '', // kolom lama, tidak dipakai
  }
}

export async function createQuestion(user: AuthenticatedUser, input: QuestionInput) {
  const now = new Date().toISOString()

  const question = await evaluationQuestions.create({
    ...questionColumns(input),
    status: 'ACTIVE',
    created_by: user.user_id,
    created_at: now,
    updated_by: user.user_id,
    updated_at: now,
  })

  return toQuestionResponse(question, false, 0)
}

export async function updateQuestion(user: AuthenticatedUser, questionId: string, input: QuestionInput) {
  const updated = await evaluationQuestions.update(questionId, {
    ...questionColumns(input),
    updated_by: user.user_id,
    updated_at: new Date().toISOString(),
  })

  if (!updated) notFound('Soal tidak ditemukan.')

  return { question_id: updated.question_id }
}

export async function setQuestionStatus(user: AuthenticatedUser, questionId: string, status: 'ACTIVE' | 'ARCHIVED') {
  const updated = await evaluationQuestions.update(questionId, {
    status,
    updated_by: user.user_id,
    updated_at: new Date().toISOString(),
  })

  if (!updated) notFound('Soal tidak ditemukan.')

  return { question_id: questionId, status }
}

/* ------------------------------------------------------------------ */
/* Paket soal                                                          */
/* ------------------------------------------------------------------ */

async function loadPackageContext() {
  const [packages, questions, configs, attempts] = await Promise.all([
    evaluationPackages.findAll(),
    evaluationQuestions.findAll(),
    periodEvaluations.findAll(),
    evaluationAttempts.findAll(),
  ])

  const activeQuestionIds = new Set(questions.filter((item) => item.status === 'ACTIVE').map((item) => item.question_id))
  const usage = await findUsage(attempts)

  const summarize = (pack: EvaluationPackage) => {
    const questionIds = splitIds(pack.question_ids)
    const usedBy = configs.filter((config) => config.package_id === pack.package_id)

    return {
      package_id: pack.package_id,
      package_name: pack.package_name,
      description: pack.description,
      status: pack.status,
      question_ids: questionIds,
      question_count: questionIds.length,
      active_question_count: questionIds.filter((id) => activeQuestionIds.has(id)).length,
      period_ids: usedBy.map((config) => config.period_id),
      /** Jumlah soal terbesar yang diminta periode pengguna paket ini (informasi). */
      required_count: Math.max(0, ...usedBy.map((config) => Number(config.question_count) || 0)),
      used: usage.packageIds.has(pack.package_id),
      updated_at: pack.updated_at,
    }
  }

  return { packages, questions, activeQuestionIds, summarize }
}

export async function listPackages() {
  const { packages, summarize } = await loadPackageContext()
  return packages.map(summarize).reverse()
}

export async function getPackage(packageId: string) {
  const { packages, summarize } = await loadPackageContext()
  const pack = packages.find((item) => item.package_id === packageId)
  if (!pack) notFound('Paket soal tidak ditemukan.')

  const summary = summarize(pack)
  const periods = await findAllCertificationPeriods()
  const periodName = new Map(periods.map((period) => [period.period_id, period.period_name]))

  return {
    ...summary,
    periods: summary.period_ids.map((periodId) => ({
      period_id: periodId,
      period_name: periodName.get(periodId) || periodId,
    })),
  }
}

async function validatePackageQuestions(input: PackageInput, packageId?: string) {
  const context = await loadPackageContext()
  const known = new Set(context.questions.map((item) => item.question_id))
  const unknown = input.questionIds.filter((id) => !known.has(id))

  if (unknown.length > 0) conflict(`Soal ${unknown.slice(0, 3).join(', ')} tidak ditemukan.`)

  const inactive = input.questionIds.filter((id) => !context.activeQuestionIds.has(id))
  if (inactive.length > 0) conflict('Paket hanya dapat berisi soal yang berstatus aktif.')

  if (packageId && !context.packages.some((item) => item.package_id === packageId)) {
    notFound('Paket soal tidak ditemukan.')
  }
}

export async function createPackage(user: AuthenticatedUser, input: PackageInput) {
  await validatePackageQuestions(input)
  const now = new Date().toISOString()

  const pack = await evaluationPackages.create({
    package_name: input.packageName,
    description: input.description,
    question_ids: input.questionIds.join(','),
    status: 'ACTIVE',
    created_by: user.user_id,
    created_at: now,
    updated_by: user.user_id,
    updated_at: now,
  })

  return { package_id: pack.package_id }
}

export async function updatePackage(user: AuthenticatedUser, packageId: string, input: PackageInput) {
  await validatePackageQuestions(input, packageId)

  await evaluationPackages.update(packageId, {
    package_name: input.packageName,
    description: input.description,
    question_ids: input.questionIds.join(','),
    updated_by: user.user_id,
    updated_at: new Date().toISOString(),
  })

  return { package_id: packageId }
}

export async function setPackageStatus(user: AuthenticatedUser, packageId: string, status: 'ACTIVE' | 'ARCHIVED') {
  if (status === 'ARCHIVED') {
    const configs = await periodEvaluations.findWhere((item) => item.package_id === packageId)
    if (configs.length > 0) {
      conflict(`Paket masih dipakai pada periode ${configs.map((item) => item.period_id).join(', ')}.`)
    }
  }

  const updated = await evaluationPackages.update(packageId, {
    status,
    updated_by: user.user_id,
    updated_at: new Date().toISOString(),
  })

  if (!updated) notFound('Paket soal tidak ditemukan.')

  return { package_id: packageId, status }
}

/* ------------------------------------------------------------------ */
/* Perencanaan evaluasi per periode + hasil                            */
/* ------------------------------------------------------------------ */

async function requirePeriod(periodId: string) {
  const period = await findCertificationPeriodById(periodId)
  if (!period) notFound('Periode sertifikasi tidak ditemukan.')
  return period
}

/**
 * Nomor "Konfigurasi ke-N" yang sedang berlaku. Konfigurasi yang sudah diterapkan sebelum
 * kolom `config_version` ada dianggap ke-1; belum pernah diterapkan = 0.
 */
function configVersion(config: { config_version: string, snapshot_id: string } | null) {
  if (!config) return 0
  return Number(config.config_version) || (config.snapshot_id ? 1 : 0)
}

/** Isi soal yang dibandingkan untuk mendeteksi perubahan sejak snapshot. */
const CONTENT_FIELDS = [
  'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct_option',
] as const

/** Soal aktif paket sesuai urutan paket (bahan snapshot). */
function packageContent(pack: EvaluationPackage | undefined, questions: EvaluationQuestion[]): EvaluationQuestion[] {
  if (!pack) return []
  const activeById = new Map(questions.filter((item) => item.status === 'ACTIVE').map((item) => [item.question_id, item]))
  return splitIds(pack.question_ids).map((id) => activeById.get(id)).filter((item): item is EvaluationQuestion => Boolean(item))
}

/** Apakah isi paket saat ini berbeda dari snapshot yang sedang diterapkan. */
function isSnapshotOutdated(snapshot: QuestionContent[], current: QuestionContent[]) {
  if (snapshot.length !== current.length) return true
  return snapshot.some((item, index) => {
    const now = current[index]
    return !now || now.question_id !== item.question_id || CONTENT_FIELDS.some((field) => now[field] !== item[field])
  })
}

export async function getPeriodEvaluationPlan(periodId: string) {
  const period = await requirePeriod(periodId)

  const [configs, packageContext, applications, submissions, periodAttempts, stage] = await Promise.all([
    periodEvaluations.findWhere((item) => item.period_id === periodId),
    loadPackageContext(),
    findApplicationsByPeriod(periodId),
    findCmsp01SubmissionsByPeriod(periodId),
    evaluationAttempts.findWhere((item) => item.period_id === periodId && item.status !== 'RESET'),
    getStageAccess(periodId, EVALUATION_STAGE),
  ])

  const attempts = await finalizeExpiredAttempts(periodAttempts)
  const attemptByApplication = new Map<string, EvaluationAttempt>()
  for (const attempt of [...attempts].sort((a, b) => b.attempt_id.localeCompare(a.attempt_id))) {
    attemptByApplication.set(attempt.application_id, attempt)
  }

  const config = configs[0] ?? null
  const submissionByApplication = new Map(submissions.map((item) => [item.application_id, item]))
  const currentVersion = configVersion(config)

  // Status snapshot: belum diterapkan / ada perubahan paket atau soal sejak diterapkan.
  let applyState: 'NOT_APPLIED' | 'OUTDATED' | 'CURRENT' = 'NOT_APPLIED'
  if (config?.snapshot_id) {
    const snapshot = await evaluationSnapshotQuestions.findWhere((row) => row.snapshot_id === config.snapshot_id)
    const pack = packageContext.packages.find((item) => item.package_id === config.package_id)
    applyState = isSnapshotOutdated(snapshot, packageContent(pack, packageContext.questions)) ? 'OUTDATED' : 'CURRENT'
  }

  // Peserta yang berhak: pendaftaran diterima & self assessment terverifikasi.
  const items = applications
    .filter((application) => application.application_status === 'accepted')
    .filter((application) => submissionByApplication.get(application.application_id)?.status === 'VERIFIED')
    .map((application) => {
      const cmsp01 = submissionByApplication.get(application.application_id)
      const attempt = attemptByApplication.get(application.application_id)
      const submitted = attempt?.status === 'SUBMITTED'
      const score = submitted ? Number(attempt.score) : null
      const passingGrade = Number(attempt?.passing_grade || config?.passing_grade || 0)
      const workMs = submitted ? Date.parse(attempt.submitted_at) - Date.parse(attempt.started_at) : NaN

      return {
        application_id: application.application_id,
        attempt_id: attempt?.attempt_id ?? '',
        full_name: cmsp01?.full_name || application.full_name_snapshot,
        nip: cmsp01?.nip || application.nip_snapshot,
        institution_name: cmsp01?.institution_name || application.institution_name,
        status: attempt ? attempt.status : 'NOT_STARTED',
        submit_type: attempt?.submit_type ?? '',
        /** Nomor konfigurasi yang dipakai (0 = sebelum ada snapshot/versi). */
        config_version: attempt ? Number(attempt.config_version) || 0 : null,
        passing_grade: attempt ? Number(attempt.passing_grade || 0) : null,
        /** Lama mengerjakan (detik), hanya untuk yang sudah selesai. */
        work_seconds: Number.isNaN(workMs) ? null : Math.max(0, Math.round(workMs / 1000)),
        score,
        passed: score === null ? null : score >= passingGrade,
      }
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))

  const count = (status: string) => items.filter((item) => item.status === status).length

  return {
    period: { period_id: period.period_id, period_name: period.period_name, period_status: period.period_status },
    stage,
    config: config
      ? {
          package_id: config.package_id,
          question_count: Number(config.question_count),
          duration_minutes: Number(config.duration_minutes),
          passing_grade: Number(config.passing_grade),
          shuffle_questions: config.shuffle_questions !== 'FALSE',
          shuffle_options: config.shuffle_options !== 'FALSE',
          applied_at: config.applied_at,
          config_version: currentVersion,
          updated_at: config.updated_at,
        }
      : null,
    apply_state: applyState,
    /** Jumlah peserta yang sudah mulai/selesai (untuk konfirmasi terapkan ulang). */
    started_count: attempts.length,
    packages: packageContext.packages
      .map(packageContext.summarize)
      .filter((item) => item.status === 'ACTIVE' || item.package_id === config?.package_id)
      .map((item) => ({
        package_id: item.package_id,
        package_name: item.package_name,
        status: item.status,
        active_question_count: item.active_question_count,
      })),
    summary: {
      eligible: items.length,
      notStarted: count('NOT_STARTED'),
      inProgress: count('IN_PROGRESS'),
      submitted: count('SUBMITTED'),
      passed: items.filter((item) => item.passed === true).length,
      failed: items.filter((item) => item.passed === false).length,
    },
    items,
  }
}

/**
 * Menyimpan pengaturan sekaligus MENERAPKAN: isi soal aktif paket saat ini disalin
 * menjadi snapshot baru. Peserta yang sudah mulai/selesai tetap memakai snapshot lamanya.
 */
export async function savePeriodEvaluation(user: AuthenticatedUser, periodId: string, input: PeriodEvaluationInput) {
  await requirePeriod(periodId)

  const [configs, packageContext] = await Promise.all([
    periodEvaluations.findWhere((item) => item.period_id === periodId),
    loadPackageContext(),
  ])

  const pack = packageContext.packages.find((item) => item.package_id === input.packageId)
  if (!pack || pack.status !== 'ACTIVE') conflict('Paket soal tidak ditemukan atau sudah diarsipkan.')

  const content = packageContent(pack, packageContext.questions)
  if (input.questionCount > content.length) {
    conflict(`Jumlah soal melebihi soal aktif pada paket (${content.length} soal).`)
  }

  const now = new Date().toISOString()
  const snapshotId = `SNP-${randomBytes(6).toString('hex').toUpperCase()}`
  const nextVersion = configVersion(configs[0] ?? null) + 1

  await evaluationSnapshotQuestions.createMany(
    content.map((question) => ({
      snapshot_id: snapshotId,
      question_id: question.question_id,
      topic: question.topic,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      option_e: question.option_e,
      correct_option: question.correct_option,
      created_at: now,
    })),
  )

  const values = {
    period_id: periodId,
    package_id: input.packageId,
    question_count: String(input.questionCount),
    duration_minutes: String(input.durationMinutes),
    passing_grade: String(input.passingGrade),
    shuffle_questions: input.shuffleQuestions ? 'TRUE' : 'FALSE',
    shuffle_options: input.shuffleOptions ? 'TRUE' : 'FALSE',
    snapshot_id: snapshotId,
    applied_at: now,
    config_version: String(nextVersion),
    updated_by: user.user_id,
    updated_at: now,
  }

  const existing = configs[0]
  if (existing) {
    await periodEvaluations.update(existing.period_evaluation_id, values)
  } else {
    await periodEvaluations.create({ ...values, created_by: user.user_id, created_at: now })
  }

  return { period_id: periodId, snapshot_id: snapshotId, config_version: nextVersion }
}

/**
 * Mereset progres evaluasi satu peserta: pengerjaan ditandai RESET (tetap tersimpan
 * sebagai riwayat) sehingga peserta dapat mulai lagi selama tahap Evaluasi dibuka.
 */
export async function resetAttempt(user: AuthenticatedUser, attemptId: string) {
  const [attempt] = await evaluationAttempts.findWhere((item) => item.attempt_id === attemptId)
  if (!attempt) notFound('Data pengerjaan tidak ditemukan.')
  if (attempt.status === 'RESET') conflict('Progres peserta ini sudah direset.')

  const now = new Date().toISOString()
  await evaluationAttempts.update(attemptId, {
    status: 'RESET',
    reset_by: user.user_id,
    reset_at: now,
    updated_at: now,
  })

  return { attempt_id: attemptId, period_id: attempt.period_id }
}

/**
 * Detail hasil evaluasi satu pengerjaan (Super Admin): identitas peserta, waktu,
 * nilai, dan setiap soal beserta opsi (urutan seperti yang dilihat peserta),
 * jawaban peserta, kunci, serta benar/salah.
 */
export async function getAttemptDetail(attemptId: string) {
  const [found] = await evaluationAttempts.findWhere((item) => item.attempt_id === attemptId)
  if (!found) notFound('Data pengerjaan tidak ditemukan.')

  const [attempt] = await finalizeExpiredAttempts([found])
  const [application, cmsp01, period, resolve] = await Promise.all([
    findApplicationById(attempt!.application_id),
    findCmsp01ByApplicationId(attempt!.application_id),
    findCertificationPeriodById(attempt!.period_id),
    loadQuestionResolver([attempt!]),
  ])

  const current = attempt!
  const { questionIds, optionOrders, answers } = parseAttempt(current)
  const submitted = current.status === 'SUBMITTED'
  const score = submitted ? Number(current.score) : null
  const passingGrade = Number(current.passing_grade || 0)
  const workMs = submitted ? Date.parse(current.submitted_at) - Date.parse(current.started_at) : NaN

  const questions = questionIds.map((questionId, index) => {
    const question = resolve(current, questionId)
    const order = (optionOrders[index] ?? '').split('').filter(Boolean)
    const answer = answers[index] ?? ''
    const displayKey = (original: string) => {
      const position = order.indexOf(original)
      return position >= 0 ? (EVALUATION_OPTION_KEYS[position] as string) : ''
    }

    return {
      number: index + 1,
      topic: question?.topic ?? '',
      text: question?.question_text ?? '(Soal tidak tersedia)',
      // Huruf mengikuti tampilan yang dilihat peserta.
      options: order.map((original, position) => ({
        key: EVALUATION_OPTION_KEYS[position] as string,
        text: question ? questionOptionText(question, original) : '',
        is_correct: question?.correct_option === original,
        is_selected: answer === original,
      })),
      answer: answer ? displayKey(answer) : '',
      correct_answer: question ? displayKey(question.correct_option) : '',
      result: !answer ? 'UNANSWERED' : question?.correct_option === answer ? 'CORRECT' : 'WRONG',
    }
  })

  return {
    attempt: {
      attempt_id: current.attempt_id,
      period_id: current.period_id,
      period_name: period?.period_name ?? '',
      status: current.status,
      started_at: current.started_at,
      deadline_at: current.deadline_at,
      submitted_at: current.submitted_at,
      submit_type: current.submit_type,
      duration_minutes: Number(current.duration_minutes || 0),
      work_seconds: Number.isNaN(workMs) ? null : Math.max(0, Math.round(workMs / 1000)),
      passing_grade: passingGrade,
      config_version: Number(current.config_version) || 0,
      score,
      passed: score === null ? null : score >= passingGrade,
      reset_at: current.reset_at,
    },
    participant: {
      full_name: cmsp01?.full_name || application?.full_name_snapshot || '',
      nip: cmsp01?.nip || application?.nip_snapshot || '',
      institution_name: cmsp01?.institution_name || application?.institution_name || '',
    },
    summary: {
      total: questions.length,
      correct: questions.filter((item) => item.result === 'CORRECT').length,
      wrong: questions.filter((item) => item.result === 'WRONG').length,
      unanswered: questions.filter((item) => item.result === 'UNANSWERED').length,
    },
    questions,
  }
}
