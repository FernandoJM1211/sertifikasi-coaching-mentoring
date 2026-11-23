/**
 * Konstanta tes tertulis pilihan ganda (dipakai frontend & backend).
 * Lihat docs/01-gambaran-sistem.md bagian Tes Tertulis.
 */

/** Huruf opsi jawaban; satu soal memiliki 2–5 opsi berurutan mulai dari A. */
export const EVALUATION_OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'] as const
export type EvaluationOptionKey = (typeof EVALUATION_OPTION_KEYS)[number]

export const EVALUATION_MIN_OPTIONS = 2
export const EVALUATION_MAX_OPTIONS = 5

/** Pilihan durasi tes tertulis (menit). */
export const EVALUATION_DURATION_OPTIONS = [30, 45, 60, 90] as const

export const EVALUATION_LIMITS = {
  questionText: 2000,
  optionText: 500,
  topic: 100,
  packageName: 150,
  packageDescription: 500,
  /** Jumlah soal maksimum dalam satu paket. */
  packageQuestions: 1000,
} as const

export function isEvaluationOptionKey(value: unknown): value is EvaluationOptionKey {
  return typeof value === 'string' && (EVALUATION_OPTION_KEYS as readonly string[]).includes(value)
}
