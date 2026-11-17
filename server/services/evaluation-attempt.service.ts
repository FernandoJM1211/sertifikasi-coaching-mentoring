import { randomInt } from 'node:crypto'
import type { Application } from '../repositories/application.repository'
import { findCertificationPeriodById } from '../repositories/certification-period.repository'
import {
  evaluationAttempts,
  evaluationQuestions,
  evaluationSnapshotQuestions,
  periodEvaluations,
  type EvaluationAttempt,
  type EvaluationQuestion,
} from '../repositories/evaluation.repository'
import { findCmsp01ByApplicationId } from '../repositories/self-assessment.repository'
import { EVALUATION_OPTION_KEYS } from '../../shared/utils/evaluation'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess } from './certification-stage.service'
import { requireOwnedApplication } from './peserta-application.service'

/**
 * Pengerjaan evaluasi pilihan ganda oleh Peserta.
 *
 * - Syarat mulai: pengajuan diterima, self assessment VERIFIED, perencanaan evaluasi
 *   periode sudah diterapkan (punya snapshot soal), tahap EVALUATION dibuka, dan belum
 *   punya pengerjaan aktif (pengerjaan berstatus RESET diabaikan).
 * - Soal diambil dari SNAPSHOT perencanaan, bukan bank soal langsung; perubahan bank
 *   soal/paket baru berlaku setelah Super Admin menerapkan ulang perencanaan.
 * - Saat mulai, N soal (acak/urut sesuai pengaturan) dan urutan opsi disimpan agar tetap.
 * - Batas waktu = mulai + durasi, terpotong pada akhir tahap EVALUATION.
 * - Kunci jawaban & nilai TIDAK PERNAH dikirim ke peserta; nilai hanya untuk Super Admin.
 * - Pengerjaan yang melewati batas waktu otomatis dinilai dengan jawaban tersimpan.
 */

export const EVALUATION_STAGE = 'EVALUATION'

/** Toleransi keterlambatan jaringan saat menyimpan/submit mendekati batas waktu. */
const DEADLINE_GRACE_MS = 30_000
/** Sisa waktu tahap minimum untuk mulai mengerjakan. */
const MIN_START_WINDOW_MS = 60_000

/* ------------------------------------------------------------------ */
/* Utilitas                                                            */
/* ------------------------------------------------------------------ */

/** Isi soal yang dibutuhkan untuk tampilan & penilaian (bank soal maupun snapshot). */
export type QuestionContent = Pick<
  EvaluationQuestion,
  'question_id' | 'topic' | 'question_text' | 'option_a' | 'option_b' | 'option_c' | 'option_d' | 'option_e' | 'correct_option'
>

/** Mencari isi soal untuk satu pengerjaan (sesuai snapshot pengerjaan tersebut). */
export type QuestionResolver = (attempt: EvaluationAttempt, questionId: string) => QuestionContent | undefined

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const swap = randomInt(index + 1)
    ;[result[index], result[swap]] = [result[swap] as T, result[index] as T]
  }
  return result
}

/** Huruf opsi yang terisi pada soal (A, B, ...). */
export function questionOptionKeys(question: QuestionContent): string[] {
  const values = [question.option_a, question.option_b, question.option_c, question.option_d, question.option_e]
  return EVALUATION_OPTION_KEYS.filter((_, index) => (values[index] ?? '').trim() !== '')
}

export function questionOptionText(question: QuestionContent, key: string): string {
  const column = `option_${key.toLowerCase()}` as keyof QuestionContent
  return question[column] ?? ''
}

const splitList = (value: string, separator: string) => (value ? value.split(separator) : [])

/**
 * Menyiapkan pencari isi soal untuk sekumpulan pengerjaan: dari snapshot bila
 * pengerjaan punya `snapshot_id`, atau dari bank soal untuk data lama.
 */
export async function loadQuestionResolver(attempts: EvaluationAttempt[]): Promise<QuestionResolver> {
  const snapshotIds = new Set(attempts.map((item) => item.snapshot_id).filter(Boolean))
  const needsBank = attempts.some((item) => !item.snapshot_id)

  const [snapshotRows, bank] = await Promise.all([
    snapshotIds.size > 0 ? evaluationSnapshotQuestions.findWhere((row) => snapshotIds.has(row.snapshot_id)) : [],
    needsBank ? evaluationQuestions.findAll() : [],
  ])

  const bySnapshot = new Map(snapshotRows.map((row) => [`${row.snapshot_id}:${row.question_id}`, row]))
  const byBank = new Map(bank.map((question) => [question.question_id, question]))

  return (attempt, questionId) =>
    attempt.snapshot_id ? bySnapshot.get(`${attempt.snapshot_id}:${questionId}`) : byBank.get(questionId)
}

export function parseAttempt(attempt: EvaluationAttempt) {
  const questionIds = splitList(attempt.question_ids, ',')
  const optionOrders = splitList(attempt.option_orders, '|')
  const stored = splitList(attempt.answers, '|')
  const answers = questionIds.map((_, index) => stored[index] ?? '')

  return { questionIds, optionOrders, answers }
}

/** Menghitung nilai skala 0–100 (semua soal berbobot sama; kosong = salah). */
export function scoreAttempt(attempt: EvaluationAttempt, resolve: QuestionResolver) {
  const { questionIds, answers } = parseAttempt(attempt)
  const correct = questionIds.filter(
    (questionId, index) => answers[index] && resolve(attempt, questionId)?.correct_option === answers[index],
  ).length
  const total = questionIds.length
  const score = total === 0 ? 0 : Math.round((correct / total) * 10000) / 100

  return { correct, total, score }
}

function isExpired(attempt: EvaluationAttempt, graceMs = 0) {
  const deadline = Date.parse(attempt.deadline_at)
  return !Number.isNaN(deadline) && Date.now() > deadline + graceMs
}

/** Menilai & menutup pengerjaan. Dipakai saat submit dan saat waktu habis. */
export async function finalizeAttempt(
  attempt: EvaluationAttempt,
  submitType: 'MANUAL' | 'AUTO',
  resolve?: QuestionResolver,
): Promise<EvaluationAttempt> {
  const result = scoreAttempt(attempt, resolve ?? (await loadQuestionResolver([attempt])))
  const now = new Date().toISOString()

  // Submit otomatis dicatat pada batas waktu, bukan saat terdeteksi.
  const submittedAt = submitType === 'AUTO' && attempt.deadline_at ? attempt.deadline_at : now

  const updated = await evaluationAttempts.update(attempt.attempt_id, {
    answers: attempt.answers,
    status: 'SUBMITTED',
    submitted_at: submittedAt,
    submit_type: submitType,
    correct_count: String(result.correct),
    total_questions: String(result.total),
    score: String(result.score),
    updated_at: now,
  })

  return updated ?? attempt
}

/** Menutup otomatis pengerjaan yang sudah melewati batas waktu. */
export async function finalizeExpiredAttempts(attempts: EvaluationAttempt[]): Promise<EvaluationAttempt[]> {
  const expired = attempts.filter((item) => item.status === 'IN_PROGRESS' && isExpired(item, DEADLINE_GRACE_MS))
  if (expired.length === 0) return attempts

  const resolve = await loadQuestionResolver(expired)
  const result: EvaluationAttempt[] = []

  for (const attempt of attempts) {
    result.push(expired.includes(attempt) ? await finalizeAttempt(attempt, 'AUTO', resolve) : attempt)
  }

  return result
}

/** Pengerjaan aktif (bukan RESET) milik satu pengajuan. */
async function findAttempt(applicationId: string) {
  const attempts = await evaluationAttempts.findWhere(
    (item) => item.application_id === applicationId && item.status !== 'RESET',
  )
  // Bila (sangat jarang) tercipta ganda karena klik bersamaan, pakai yang pertama.
  return attempts.sort((a, b) => a.attempt_id.localeCompare(b.attempt_id))[0] ?? null
}

/* ------------------------------------------------------------------ */
/* Kelayakan                                                           */
/* ------------------------------------------------------------------ */

async function loadContext(application: Application) {
  const [period, config, cmsp01, stage, attempt] = await Promise.all([
    findCertificationPeriodById(application.period_id),
    periodEvaluations.findWhere((item) => item.period_id === application.period_id).then((items) => items[0] ?? null),
    findCmsp01ByApplicationId(application.application_id),
    getStageAccess(application.period_id, EVALUATION_STAGE),
    findAttempt(application.application_id),
  ])

  return { period, config, saVerified: cmsp01?.status === 'VERIFIED', stage, attempt }
}

type Context = Awaited<ReturnType<typeof loadContext>>

function startBlocker(application: Application, context: Context): string {
  if (context.attempt) return 'Anda sudah mengerjakan evaluasi ini.'
  if (application.application_status !== 'accepted') return 'Pengajuan sertifikasi Anda belum diterima.'
  if (!context.saVerified) return 'Self assessment Anda belum terverifikasi.'
  if (!context.config?.snapshot_id) return 'Evaluasi untuk periode ini belum disiapkan oleh penyelenggara.'
  if (!context.stage.open) return context.stage.message

  const end = Date.parse(context.stage.endAt)
  if (!Number.isNaN(end) && end > Date.now() && end - Date.now() < MIN_START_WINDOW_MS) {
    return 'Waktu tahap evaluasi hampir berakhir sehingga evaluasi tidak dapat dimulai.'
  }

  return ''
}

/**
 * Ringkasan evaluasi untuk beranda peserta (tanpa mengubah data):
 * - `NOT_STARTED` / `IN_PROGRESS` / `SUBMITTED` (pengerjaan kedaluwarsa dianggap selesai);
 * - `available`: evaluasi dapat dimulai atau dilanjutkan saat ini.
 */
export async function getEvaluationProgress(application: Application) {
  const context = await loadContext(application)
  const attempt = context.attempt

  if (attempt && (attempt.status !== 'IN_PROGRESS' || isExpired(attempt, DEADLINE_GRACE_MS))) {
    return { status: 'SUBMITTED' as const, available: false }
  }

  if (attempt) return { status: 'IN_PROGRESS' as const, available: true }

  return { status: 'NOT_STARTED' as const, available: !startBlocker(application, context) }
}

/** Batas waktu efektif: mulai + durasi, terpotong pada akhir tahap. */
function computeDeadline(durationMinutes: number, stageEndAt: string) {
  const byDuration = Date.now() + durationMinutes * 60_000
  const stageEnd = Date.parse(stageEndAt)

  return new Date(
    !Number.isNaN(stageEnd) && stageEnd > Date.now() ? Math.min(byDuration, stageEnd) : byDuration,
  )
}

/* ------------------------------------------------------------------ */
/* Respons untuk peserta (tanpa kunci & nilai)                         */
/* ------------------------------------------------------------------ */

async function toPesertaAttempt(attempt: EvaluationAttempt) {
  const base = {
    status: attempt.status,
    started_at: attempt.started_at,
    deadline_at: attempt.deadline_at,
    submitted_at: attempt.submitted_at,
    submit_type: attempt.submit_type,
    total_questions: splitList(attempt.question_ids, ',').length,
  }

  if (attempt.status !== 'IN_PROGRESS') return { ...base, questions: [], answers: [] }

  const { questionIds, optionOrders, answers } = parseAttempt(attempt)
  const resolve = await loadQuestionResolver([attempt])

  const questions = questionIds.map((questionId, index) => {
    const question = resolve(attempt, questionId)
    const order = splitList(optionOrders[index] ?? '', '')

    return {
      number: index + 1,
      text: question?.question_text ?? '(Soal tidak tersedia)',
      // Huruf yang ditampilkan berurutan A, B, ...; isi mengikuti urutan acak.
      options: order.map((originalKey, position) => ({
        key: EVALUATION_OPTION_KEYS[position] as string,
        text: question ? questionOptionText(question, originalKey) : '',
      })),
    }
  })

  // Jawaban tersimpan (huruf asli) diubah ke huruf yang ditampilkan.
  const displayedAnswers = answers.map((answer, index) => {
    const position = splitList(optionOrders[index] ?? '', '').indexOf(answer)
    return position >= 0 ? (EVALUATION_OPTION_KEYS[position] as string) : ''
  })

  return { ...base, questions, answers: displayedAnswers }
}

export async function getPesertaEvaluation(user: AuthenticatedUser, applicationId: string) {
  const application = await requireOwnedApplication(user, applicationId)
  const context = await loadContext(application)

  let attempt = context.attempt
  if (attempt?.status === 'IN_PROGRESS' && isExpired(attempt, DEADLINE_GRACE_MS)) {
    attempt = await finalizeAttempt(attempt, 'AUTO')
  }

  const blocker = startBlocker(application, { ...context, attempt })

  return {
    application: { application_id: application.application_id },
    period: { period_id: application.period_id, period_name: context.period?.period_name ?? '' },
    stage: context.stage,
    config: context.config?.snapshot_id
      ? {
          question_count: Number(context.config.question_count),
          duration_minutes: Number(context.config.duration_minutes),
        }
      : null,
    eligibility: { canStart: !blocker, message: blocker },
    server_now: new Date().toISOString(),
    attempt: attempt ? await toPesertaAttempt(attempt) : null,
  }
}

/* ------------------------------------------------------------------ */
/* Mulai, simpan jawaban, submit                                       */
/* ------------------------------------------------------------------ */

export async function startEvaluation(user: AuthenticatedUser, applicationId: string) {
  const application = await requireOwnedApplication(user, applicationId)
  const context = await loadContext(application)
  const blocker = startBlocker(application, context)

  if (blocker) throw createError({ statusCode: 409, statusMessage: blocker })

  const config = context.config!
  const snapshotRows = await evaluationSnapshotQuestions.findWhere((row) => row.snapshot_id === config.snapshot_id)
  const contentById = new Map(snapshotRows.map((row) => [row.question_id, row]))
  // Urutan baris snapshot = urutan soal di paket saat diterapkan.
  const pool = snapshotRows.map((row) => row.question_id)
  const questionCount = Number(config.question_count)

  if (pool.length < questionCount) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Evaluasi belum siap (soal tidak lengkap). Hubungi penyelenggara.',
    })
  }

  // Kolom kosong (data lama) dianggap acak aktif.
  const shuffleQuestions = config.shuffle_questions !== 'FALSE'
  const shuffleOptions = config.shuffle_options !== 'FALSE'

  // Acak soal nonaktif: N soal pertama sesuai urutan paket, urutan sama untuk semua peserta.
  const selected = (shuffleQuestions ? shuffle(pool) : pool).slice(0, questionCount)
  const optionOrders = selected.map((questionId) => {
    const keys = questionOptionKeys(contentById.get(questionId)!)
    return (shuffleOptions ? shuffle(keys) : keys).join('')
  })

  const now = new Date()
  const durationMinutes = Number(config.duration_minutes)

  await evaluationAttempts.create({
    application_id: application.application_id,
    period_id: application.period_id,
    package_id: config.package_id,
    question_ids: selected.join(','),
    option_orders: optionOrders.join('|'),
    answers: selected.map(() => '').join('|'),
    duration_minutes: String(durationMinutes),
    passing_grade: config.passing_grade,
    started_at: now.toISOString(),
    deadline_at: computeDeadline(durationMinutes, context.stage.endAt).toISOString(),
    submitted_at: '',
    submit_type: '',
    status: 'IN_PROGRESS',
    correct_count: '',
    total_questions: String(selected.length),
    score: '',
    updated_at: now.toISOString(),
    snapshot_id: config.snapshot_id,
    reset_by: '',
    reset_at: '',
    // Konfigurasi lama (sebelum ada nomor versi) dianggap ke-1.
    config_version: config.config_version || '1',
  })

  return getPesertaEvaluation(user, applicationId)
}

/** Pengerjaan yang sedang berjalan milik peserta (untuk simpan/submit). */
async function requireActiveAttempt(user: AuthenticatedUser, applicationId: string) {
  const application = await requireOwnedApplication(user, applicationId)
  const attempt = await findAttempt(application.application_id)

  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Evaluasi belum dimulai.' })
  if (attempt.status !== 'IN_PROGRESS') {
    throw createError({ statusCode: 409, statusMessage: 'Evaluasi sudah dikirim.' })
  }

  return attempt
}

/** Mengubah jawaban huruf tampilan → huruf asli. */
function toStoredAnswers(attempt: EvaluationAttempt, displayedAnswers: string[]) {
  const { questionIds, optionOrders } = parseAttempt(attempt)

  if (displayedAnswers.length !== questionIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'Jumlah jawaban tidak sesuai jumlah soal.' })
  }

  return displayedAnswers
    .map((answer, index) => {
      if (!answer) return ''
      const position = (EVALUATION_OPTION_KEYS as readonly string[]).indexOf(answer)
      const original = splitList(optionOrders[index] ?? '', '')[position]
      if (!original) throw createError({ statusCode: 400, statusMessage: `Jawaban soal ${index + 1} tidak valid.` })
      return original
    })
    .join('|')
}

export async function saveEvaluationAnswers(user: AuthenticatedUser, applicationId: string, answers: string[]) {
  const attempt = await requireActiveAttempt(user, applicationId)

  if (isExpired(attempt, DEADLINE_GRACE_MS)) {
    await finalizeAttempt(attempt, 'AUTO')
    throw createError({ statusCode: 409, statusMessage: 'Waktu evaluasi telah habis. Jawaban tersimpan sudah dikirim otomatis.' })
  }

  const now = new Date().toISOString()
  await evaluationAttempts.update(attempt.attempt_id, { answers: toStoredAnswers(attempt, answers), updated_at: now })

  return { saved_at: now }
}

export async function submitEvaluation(user: AuthenticatedUser, applicationId: string, answers: string[]) {
  const attempt = await requireActiveAttempt(user, applicationId)

  if (isExpired(attempt, DEADLINE_GRACE_MS)) {
    // Terlambat: nilai memakai jawaban terakhir yang tersimpan.
    await finalizeAttempt(attempt, 'AUTO')
    return { submit_type: 'AUTO' as const }
  }

  const updated = { ...attempt, answers: toStoredAnswers(attempt, answers) }
  // Batas waktu terlewati (dalam toleransi) dicatat sebagai submit otomatis.
  const submitType = isExpired(attempt) ? 'AUTO' : 'MANUAL'
  await finalizeAttempt(updated, submitType)

  return { submit_type: submitType }
}
