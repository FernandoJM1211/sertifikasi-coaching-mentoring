import {
  EVALUATION_LIMITS,
  EVALUATION_MIN_OPTIONS,
  EVALUATION_OPTION_KEYS,
  type EvaluationOptionKey,
} from './evaluation'

/**
 * Import soal dari Excel (Bank Soal). Dipakai frontend (pratinjau) dan backend (batas jumlah).
 * Template: public/templates/template-import-soal.xlsx — sheet "Soal" dengan kolom di bawah.
 * Validasi akhir tetap dilakukan server dengan `parseQuestionInput`.
 */

export const QUESTION_IMPORT_TEMPLATE_URL = '/templates/template-import-soal.xlsx'
export const QUESTION_IMPORT_SHEET = 'Soal'
export const QUESTION_IMPORT_MAX_ROWS = 200
export const QUESTION_IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024

export const QUESTION_IMPORT_COLUMNS = {
  topic: 'Topik',
  questionText: 'Pertanyaan',
  optionA: 'Opsi A',
  optionB: 'Opsi B',
  optionC: 'Opsi C',
  optionD: 'Opsi D',
  optionE: 'Opsi E',
  correctOption: 'Kunci Jawaban',
} as const

const OPTION_COLUMNS = ['optionA', 'optionB', 'optionC', 'optionD', 'optionE'] as const
const REQUIRED_COLUMNS = ['questionText', 'optionA', 'optionB', 'correctOption'] as const

type ColumnKey = keyof typeof QUESTION_IMPORT_COLUMNS
/** Nilai sel dari pembaca Excel (string/angka/boolean/tanggal/null). */
type Cell = unknown

export type ImportedQuestion = {
  topic: string
  questionText: string
  options: string[]
  correctOption: EvaluationOptionKey
}

export type ImportRow = {
  /** Nomor baris di Excel (1 = header). */
  rowNumber: number
  question: ImportedQuestion | null
  errors: string[]
}

const normalizeHeader = (value: Cell) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

function cellText(value: Cell): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

/** Cari baris header & posisi kolom. Mengembalikan pesan galat bila kolom wajib tidak ada. */
function locateColumns(data: Cell[][]) {
  const wanted = Object.entries(QUESTION_IMPORT_COLUMNS) as [ColumnKey, string][]

  for (let rowIndex = 0; rowIndex < Math.min(data.length, 10); rowIndex++) {
    const headers = (data[rowIndex] ?? []).map(normalizeHeader)
    const positions = {} as Partial<Record<ColumnKey, number>>

    for (const [key, title] of wanted) {
      const index = headers.indexOf(title.toLowerCase())
      if (index >= 0) positions[key] = index
    }

    if (REQUIRED_COLUMNS.every((key) => positions[key] !== undefined)) {
      return { headerIndex: rowIndex, positions }
    }
  }

  return null
}

/** Ubah isi sheet menjadi daftar baris soal beserta galatnya (baris kosong dilewati). */
export function parseQuestionImportSheet(data: Cell[][]): { rows: ImportRow[], error?: string } {
  const located = locateColumns(data)

  if (!located) {
    const names = REQUIRED_COLUMNS.map((key) => `"${QUESTION_IMPORT_COLUMNS[key]}"`).join(', ')
    return { rows: [], error: `Kolom wajib tidak ditemukan. Pastikan memakai template (kolom ${names}).` }
  }

  const { headerIndex, positions } = located
  const read = (row: Cell[], key: ColumnKey) => {
    const index = positions[key]
    return index === undefined ? '' : cellText(row[index])
  }

  const rows: ImportRow[] = []

  for (let index = headerIndex + 1; index < data.length; index++) {
    const row = data[index] ?? []
    const values = (Object.keys(QUESTION_IMPORT_COLUMNS) as ColumnKey[]).map((key) => read(row, key))
    if (values.every((value) => !value)) continue

    const errors: string[] = []
    const topic = read(row, 'topic')
    const questionText = read(row, 'questionText')
    const rawOptions = OPTION_COLUMNS.map((key) => read(row, key))
    const correctOption = read(row, 'correctOption').toUpperCase()

    // Opsi harus berurutan mulai A tanpa loncatan.
    let optionCount = rawOptions.length
    while (optionCount > 0 && !rawOptions[optionCount - 1]) optionCount--
    const options = rawOptions.slice(0, optionCount)

    if (!questionText) errors.push('Pertanyaan wajib diisi.')
    if (questionText.length > EVALUATION_LIMITS.questionText) {
      errors.push(`Pertanyaan maksimal ${EVALUATION_LIMITS.questionText} karakter.`)
    }
    if (topic.length > EVALUATION_LIMITS.topic) errors.push(`Topik maksimal ${EVALUATION_LIMITS.topic} karakter.`)

    const gap = options.findIndex((option) => !option)
    if (gap >= 0) errors.push(`Opsi ${EVALUATION_OPTION_KEYS[gap]} kosong padahal opsi sesudahnya terisi.`)
    if (options.length < EVALUATION_MIN_OPTIONS) errors.push(`Minimal ${EVALUATION_MIN_OPTIONS} opsi (Opsi A dan Opsi B).`)

    options.forEach((option, optionIndex) => {
      if (option.length > EVALUATION_LIMITS.optionText) {
        errors.push(`Opsi ${EVALUATION_OPTION_KEYS[optionIndex]} maksimal ${EVALUATION_LIMITS.optionText} karakter.`)
      }
    })

    const lowered = options.filter(Boolean).map((option) => option.toLowerCase())
    if (new Set(lowered).size !== lowered.length) errors.push('Isi opsi jawaban tidak boleh sama.')

    const keyIndex = EVALUATION_OPTION_KEYS.indexOf(correctOption as EvaluationOptionKey)
    if (!correctOption) errors.push('Kunci Jawaban wajib diisi (A–E).')
    else if (keyIndex < 0) errors.push(`Kunci Jawaban "${correctOption}" tidak valid (gunakan A–E).`)
    else if (!options[keyIndex]) errors.push(`Kunci Jawaban ${correctOption} tetapi Opsi ${correctOption} kosong.`)

    rows.push({
      rowNumber: index + 1,
      question: errors.length
        ? null
        : { topic, questionText, options, correctOption: correctOption as EvaluationOptionKey },
      errors,
    })
  }

  if (rows.length === 0) return { rows, error: 'Tidak ada baris soal yang terisi pada file.' }

  return { rows }
}

/** Kunci pembanding untuk mendeteksi pertanyaan yang sama. */
export const questionDuplicateKey = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')
