import { createError } from 'h3'
import { CMSP02_COMPETENCY_UNITS } from '../../shared/utils/cmsp02-units'
import {
  TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH,
  isTechnicalRecommendation,
  isUnitResult,
  type TechnicalRecommendation,
  type UnitResult,
} from '../../shared/utils/technical-assessment'

/** Validasi body simpan/kirim penilaian Asesor Teknis. */

export type TechnicalAssessmentInput = {
  /** Hanya unit yang sudah dinilai; kunci = kode unit CMSP-02. */
  unitResults: Record<string, UnitResult>
  note: string
  recommendation: TechnicalRecommendation | ''
  /** true = kirim final (dikunci), false = simpan draf. */
  submit: boolean
}

const UNIT_CODES = new Set(CMSP02_COMPETENCY_UNITS.map((unit) => unit.code))

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

export function parseTechnicalAssessmentInput(body: unknown): TechnicalAssessmentInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) badRequest('Data penilaian tidak valid.')
  const data = body as Record<string, unknown>

  const rawResults = data.unitResults
  if (!rawResults || typeof rawResults !== 'object' || Array.isArray(rawResults)) {
    badRequest('Hasil penilaian unit tidak valid.')
  }

  const unitResults: Record<string, UnitResult> = {}
  for (const [code, result] of Object.entries(rawResults as Record<string, unknown>)) {
    if (!UNIT_CODES.has(code)) badRequest(`Unit ${code} tidak dikenal.`)
    if (result === '' || result === null) continue
    if (!isUnitResult(result)) badRequest(`Hasil unit ${code} harus K atau BK.`)
    unitResults[code] = result
  }

  if (typeof data.note !== 'string' && data.note !== undefined) badRequest('Catatan tidak valid.')
  const note = (typeof data.note === 'string' ? data.note : '').trim()
  if (note.length > TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH) {
    badRequest(`Catatan maksimal ${TECHNICAL_ASSESSMENT_NOTE_MAX_LENGTH} karakter.`)
  }

  const recommendation = data.recommendation ?? ''
  if (recommendation !== '' && !isTechnicalRecommendation(recommendation)) badRequest('Rekomendasi asesmen tidak valid.')

  if (typeof data.submit !== 'boolean') badRequest('Jenis penyimpanan tidak valid.')

  return {
    unitResults,
    note,
    recommendation: recommendation as TechnicalRecommendation | '',
    submit: data.submit,
  }
}
