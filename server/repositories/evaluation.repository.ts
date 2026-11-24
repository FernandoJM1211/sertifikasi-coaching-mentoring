import { createTable, type SheetRecord } from './sheet-table'

/**
 * Sheet tes tertulis pilihan ganda (lihat docs/04-database.md). Urutan kolom HARUS
 * sama dengan header di Google Sheets.
 *
 * - `evaluation_questions` : bank soal.
 * - `evaluation_packages`  : paket soal (daftar ID soal dipisah koma).
 * - `period_evaluations`   : pengaturan tes tertulis per periode (satu baris per periode).
 * - `evaluation_snapshot_questions` : salinan soal saat perencanaan tes tertulis diterapkan.
 * - `evaluation_attempts`  : pengerjaan tes tertulis peserta (satu baris aktif per pengajuan).
 */

type Record_<C extends readonly string[]> = SheetRecord<C>

/* ------------------------------------------------------------------ */
/* Bank soal                                                           */
/* ------------------------------------------------------------------ */

/** Pengaturan acak opsi ada di `period_evaluations` (per periode), bukan per soal. */
const QUESTION_COLUMNS = [
  'question_id', 'topic', 'question_text',
  'option_a', 'option_b', 'option_c', 'option_d', 'option_e',
  'correct_option', 'status',
  'created_by', 'created_at', 'updated_by', 'updated_at',
] as const

export type EvaluationQuestion = Record_<typeof QUESTION_COLUMNS>
export const evaluationQuestions = createTable('evaluation_questions', QUESTION_COLUMNS, 'EVQ')

/* ------------------------------------------------------------------ */
/* Paket soal                                                          */
/* ------------------------------------------------------------------ */

const PACKAGE_COLUMNS = [
  'package_id', 'package_name', 'description', 'question_ids', 'status',
  'created_by', 'created_at', 'updated_by', 'updated_at',
] as const

export type EvaluationPackage = Record_<typeof PACKAGE_COLUMNS>
export const evaluationPackages = createTable('evaluation_packages', PACKAGE_COLUMNS, 'EVP')

/* ------------------------------------------------------------------ */
/* Pengaturan tes tertulis per periode                                     */
/* ------------------------------------------------------------------ */

const PERIOD_EVALUATION_COLUMNS = [
  'period_evaluation_id', 'period_id', 'package_id', 'question_count',
  'duration_minutes', 'passing_grade',
  'created_by', 'created_at', 'updated_by', 'updated_at',
  'shuffle_questions', 'shuffle_options', 'snapshot_id', 'applied_at', 'config_version',
] as const

export type PeriodEvaluation = Record_<typeof PERIOD_EVALUATION_COLUMNS>
export const periodEvaluations = createTable('period_evaluations', PERIOD_EVALUATION_COLUMNS, 'PEV')

/* ------------------------------------------------------------------ */
/* Snapshot soal                                                       */
/* ------------------------------------------------------------------ */

/**
 * Salinan isi soal (teks, opsi, kunci) saat perencanaan tes tertulis periode diterapkan.
 * Satu `snapshot_id` = satu kali "Simpan & Terapkan"; urutan baris = urutan soal di paket.
 * Bank soal & paket boleh diubah kapan saja tanpa memengaruhi snapshot/nilai yang sudah ada.
 */
const SNAPSHOT_QUESTION_COLUMNS = [
  'snapshot_question_id', 'snapshot_id', 'question_id', 'topic', 'question_text',
  'option_a', 'option_b', 'option_c', 'option_d', 'option_e',
  'correct_option', 'created_at',
] as const

export type EvaluationSnapshotQuestion = Record_<typeof SNAPSHOT_QUESTION_COLUMNS>
export const evaluationSnapshotQuestions = createTable('evaluation_snapshot_questions', SNAPSHOT_QUESTION_COLUMNS, 'ESQ')

/* ------------------------------------------------------------------ */
/* Pengerjaan tes tertulis                                                 */
/* ------------------------------------------------------------------ */

/**
 * - `question_ids`  : urutan soal untuk peserta ini (dipisah koma).
 * - `option_orders` : urutan opsi per soal dalam huruf ASLI, dipisah `|`
 *                     (mis. `CADB|BA|...`); posisi ke-n ditampilkan sebagai huruf ke-n.
 * - `answers`       : jawaban per soal dalam huruf ASLI, dipisah `|` (kosong = belum dijawab).
 * - Durasi & passing grade disalin saat mulai (snapshot).
 * - `snapshot_id`   : snapshot soal yang dipakai (kosong = data lama, memakai bank soal).
 * - `config_version`: nomor "Konfigurasi ke-N" perencanaan saat peserta mulai (kosong = data lama).
 * - `status` RESET  : progres direset Super Admin (`reset_by`, `reset_at`); baris tetap
 *                     disimpan sebagai riwayat, peserta dapat mulai lagi.
 */
const ATTEMPT_COLUMNS = [
  'attempt_id', 'application_id', 'period_id', 'package_id',
  'question_ids', 'option_orders', 'answers',
  'duration_minutes', 'passing_grade',
  'started_at', 'deadline_at', 'submitted_at', 'submit_type', 'status',
  'correct_count', 'total_questions', 'score', 'updated_at',
  'snapshot_id', 'reset_by', 'reset_at', 'config_version',
] as const

export type EvaluationAttempt = Record_<typeof ATTEMPT_COLUMNS>
export const evaluationAttempts = createTable('evaluation_attempts', ATTEMPT_COLUMNS, 'EVA')
