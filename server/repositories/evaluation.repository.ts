import { createError } from 'h3'
import {
  appendSheetRows,
  getSheetValues,
  updateSheetRows,
} from '../utils/google-sheets'

/**
 * Sheet evaluasi pilihan ganda (lihat docs/04-database.md). Urutan kolom HARUS
 * sama dengan header di Google Sheets.
 *
 * - `evaluation_questions` : bank soal.
 * - `evaluation_packages`  : paket soal (daftar ID soal dipisah koma).
 * - `period_evaluations`   : pengaturan evaluasi per periode (satu baris per periode).
 * - `evaluation_snapshot_questions` : salinan soal saat perencanaan evaluasi diterapkan.
 * - `evaluation_attempts`  : pengerjaan evaluasi peserta (satu baris aktif per pengajuan).
 */

type Record_<C extends readonly string[]> = { [K in C[number]]: string }

/** Pembaca/penulis generik satu sheet dengan kolom ID di kolom A. */
function createTable<C extends readonly string[]>(sheetName: string, columns: C, idPrefix: string) {
  type Row = Record_<C>

  const toRecord = (row: string[]): Row =>
    Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ''])) as Row

  const toRow = (record: Row): string[] =>
    columns.map((column) => (record as Record<string, string>)[column] ?? '')

  async function readAll() {
    let rows: string[][]

    try {
      rows = await getSheetValues(sheetName)
    } catch {
      throw createError({
        statusCode: 500,
        statusMessage: `Sheet ${sheetName} belum tersedia. Hubungi Super Admin.`,
      })
    }

    return {
      rows,
      records: rows
        .map((row, index) => ({ rowNumber: index + 1, record: toRecord(row) }))
        .slice(1)
        .filter((item) => item.record[columns[0] as C[number]]),
    }
  }

  function nextIdGenerator(rows: string[][]) {
    let maxNumber = 0
    const pattern = new RegExp(`^${idPrefix}-(\\d+)$`)

    for (const row of rows.slice(1)) {
      const match = (row[0] ?? '').match(pattern)
      if (match) maxNumber = Math.max(maxNumber, Number(match[1]))
    }

    return () => `${idPrefix}-${String(++maxNumber).padStart(6, '0')}`
  }

  return {
    async findAll(): Promise<Row[]> {
      return (await readAll()).records.map((item) => item.record)
    },

    async findWhere(predicate: (record: Row) => boolean): Promise<Row[]> {
      return (await readAll()).records.map((item) => item.record).filter(predicate)
    },

    /** Menambah satu baris; ID dibuat otomatis. */
    async create(record: Omit<Row, C[0]>): Promise<Row> {
      const { rows } = await readAll()
      const created = { ...record, [columns[0] as string]: nextIdGenerator(rows)() } as Row

      await appendSheetRows(sheetName, [toRow(created)])

      return created
    },

    /** Menambah banyak baris sekaligus (satu kali tulis); ID dibuat otomatis. */
    async createMany(records: Omit<Row, C[0]>[]): Promise<Row[]> {
      if (records.length === 0) return []

      const { rows } = await readAll()
      const nextId = nextIdGenerator(rows)
      const created = records.map((record) => ({ ...record, [columns[0] as string]: nextId() }) as Row)

      await appendSheetRows(sheetName, created.map(toRow))

      return created
    },

    /** Memperbarui baris berdasarkan ID (kolom A). Mengembalikan null bila tidak ada. */
    async update(id: string, patch: Partial<Row>): Promise<Row | null> {
      const { records } = await readAll()
      const found = records.find((item) => item.record[columns[0] as C[number]] === id)
      if (!found) return null

      const updated = { ...found.record, ...patch, [columns[0] as string]: id } as Row
      await updateSheetRows(sheetName, [{ rowNumber: found.rowNumber, values: toRow(updated) }])

      return updated
    },
  }
}

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
/* Pengaturan evaluasi per periode                                     */
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
 * Salinan isi soal (teks, opsi, kunci) saat perencanaan evaluasi periode diterapkan.
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
/* Pengerjaan evaluasi                                                 */
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
