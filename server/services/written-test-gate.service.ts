import { evaluationAttempts } from '../repositories/evaluation.repository'
import { hasStageEnded } from './certification-stage.service'
import { EVALUATION_STAGE, finalizeExpiredAttempts } from './evaluation-attempt.service'

/**
 * Status tes tertulis peserta satu periode, dipakai sebagai syarat urutan penilaian (K-22) dan
 * penentuan peserta "Tidak Melanjutkan" (K-25).
 *
 * - `submitted`   : peserta yang tes tertulisnya sudah terkirim (termasuk otomatis karena waktu habis).
 * - `isWithdrawn` : tahap Tes Tertulis sudah berakhir dan peserta tidak mengerjakannya sama sekali
 *                   → tidak dinilai asesor & tidak menahan Penetapan Hasil Asesmen.
 */
export async function getWrittenTestGate(
  periodId: string,
  filter?: (attempt: { application_id: string }) => boolean,
) {
  const [attempts, ended] = await Promise.all([
    evaluationAttempts.findWhere((item) => item.period_id === periodId && item.status !== 'RESET' && (!filter || filter(item))),
    hasStageEnded(periodId, EVALUATION_STAGE),
  ])

  const finalized = await finalizeExpiredAttempts(attempts)
  const submitted = new Set(finalized.filter((item) => item.status === 'SUBMITTED').map((item) => item.application_id))
  // Masih mengerjakan saat tahap berakhir → tunggu waktu pengerjaannya habis (terkirim otomatis).
  const inProgress = new Set(finalized.filter((item) => item.status === 'IN_PROGRESS').map((item) => item.application_id))

  return {
    submitted,
    ended,
    isWithdrawn: (applicationId: string) => ended && !submitted.has(applicationId) && !inProgress.has(applicationId),
  }
}
