import { createError } from 'h3'
import {
  EVALUATION_DURATION_OPTIONS,
  EVALUATION_LIMITS,
  EVALUATION_MAX_OPTIONS,
  EVALUATION_MIN_OPTIONS,
  EVALUATION_OPTION_KEYS,
  isEvaluationOptionKey,
  type EvaluationOptionKey,
} from '../../shared/utils/evaluation'

/**
 * Validasi input evaluasi dari `readBody` (bertipe unknown sampai dicek).
 * Dipakai lapisan `server/api` sebelum memanggil service.
 */

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) badRequest('Data tidak valid.')
  return body as Record<string, unknown>
}

function text(value: unknown, label: string, max: number, required: boolean): string {
  if (value === undefined || value === null) value = ''
  if (typeof value !== 'string') badRequest(`${label} tidak valid.`)

  const trimmed = value.trim()
  if (required && !trimmed) badRequest(`${label} wajib diisi.`)
  if (trimmed.length > max) badRequest(`${label} maksimal ${max} karakter.`)

  return trimmed
}

function integer(value: unknown, label: string, min: number, max: number): number {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value
  if (typeof number !== 'number' || !Number.isInteger(number) || number < min || number > max) {
    badRequest(`${label} harus berupa bilangan bulat ${min}–${max}.`)
  }
  return number
}

function id(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 50) badRequest(`${label} tidak valid.`)
  return value.trim()
}

/* ------------------------------------------------------------------ */

export type QuestionInput = {
  topic: string
  questionText: string
  /** 2–5 opsi berurutan (A, B, ...). */
  options: string[]
  correctOption: EvaluationOptionKey
}

export function parseQuestionInput(body: unknown): QuestionInput {
  const data = asObject(body)

  if (!Array.isArray(data.options)) badRequest('Opsi jawaban tidak valid.')

  const options = data.options.map((option, index) =>
    text(option, `Opsi ${EVALUATION_OPTION_KEYS[index] ?? index + 1}`, EVALUATION_LIMITS.optionText, true),
  )

  if (options.length < EVALUATION_MIN_OPTIONS || options.length > EVALUATION_MAX_OPTIONS) {
    badRequest(`Jumlah opsi jawaban harus ${EVALUATION_MIN_OPTIONS}–${EVALUATION_MAX_OPTIONS}.`)
  }

  const lowered = options.map((option) => option.toLowerCase())
  if (new Set(lowered).size !== lowered.length) badRequest('Isi opsi jawaban tidak boleh sama.')

  const correctOption = data.correctOption
  if (!isEvaluationOptionKey(correctOption) || EVALUATION_OPTION_KEYS.indexOf(correctOption) >= options.length) {
    badRequest('Jawaban benar wajib dipilih dari opsi yang tersedia.')
  }

  return {
    topic: text(data.topic, 'Topik', EVALUATION_LIMITS.topic, false),
    questionText: text(data.questionText, 'Teks soal', EVALUATION_LIMITS.questionText, true),
    options,
    correctOption,
  }
}

export type PackageInput = {
  packageName: string
  description: string
  questionIds: string[]
}

export function parsePackageInput(body: unknown): PackageInput {
  const data = asObject(body)

  if (!Array.isArray(data.questionIds) || data.questionIds.length > EVALUATION_LIMITS.packageQuestions) {
    badRequest(`Daftar soal tidak valid (maksimal ${EVALUATION_LIMITS.packageQuestions} soal).`)
  }

  const questionIds = [...new Set(data.questionIds.map((value) => id(value, 'ID soal')))]
  if (questionIds.length === 0) badRequest('Pilih minimal satu soal untuk paket.')

  return {
    packageName: text(data.packageName, 'Nama paket', EVALUATION_LIMITS.packageName, true),
    description: text(data.description, 'Deskripsi', EVALUATION_LIMITS.packageDescription, false),
    questionIds,
  }
}

export type PeriodEvaluationInput = {
  packageId: string
  questionCount: number
  durationMinutes: number
  passingGrade: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

export function parsePeriodEvaluationInput(body: unknown): PeriodEvaluationInput {
  const data = asObject(body)
  const durationMinutes = integer(data.durationMinutes, 'Durasi', 1, 600)

  if (!(EVALUATION_DURATION_OPTIONS as readonly number[]).includes(durationMinutes)) {
    badRequest(`Durasi harus salah satu dari ${EVALUATION_DURATION_OPTIONS.join(', ')} menit.`)
  }

  return {
    packageId: id(data.packageId, 'Paket soal'),
    questionCount: integer(data.questionCount, 'Jumlah soal', 1, EVALUATION_LIMITS.packageQuestions),
    durationMinutes,
    passingGrade: integer(data.passingGrade, 'Passing grade', 0, 100),
    shuffleQuestions: flag(data.shuffleQuestions, 'Pengaturan acak soal'),
    shuffleOptions: flag(data.shuffleOptions, 'Pengaturan acak opsi jawaban'),
  }
}

function flag(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') badRequest(`${label} tidak valid.`)
  return value
}

export function parseStatusInput(body: unknown): 'ACTIVE' | 'ARCHIVED' {
  const status = asObject(body).status
  if (status !== 'ACTIVE' && status !== 'ARCHIVED') badRequest('Status tidak valid.')
  return status
}

/** Jawaban peserta: array huruf opsi yang DITAMPILKAN (A–E) atau '' bila kosong. */
export function parseAnswersInput(body: unknown): string[] {
  const answers = asObject(body).answers

  if (!Array.isArray(answers) || answers.length > EVALUATION_LIMITS.packageQuestions) {
    badRequest('Jawaban tidak valid.')
  }

  return answers.map((answer) => {
    if (answer === null || answer === undefined || answer === '') return ''
    if (!isEvaluationOptionKey(answer)) badRequest('Jawaban tidak valid.')
    return answer
  })
}
