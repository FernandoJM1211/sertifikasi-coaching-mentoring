import { findAllCertificationPeriods } from '../../repositories/certification-period.repository'
import { withStageSchedule } from '../../services/certification-stage.service'

/**
 * Daftar periode sertifikasi.
 * Query opsional `stage` (kode tahap, mis. `EVALUATION`, atau `PERIOD` untuk rentang seluruh timeline)
 * menambahkan `stage_start_at` & `stage_end_at` pada setiap periode untuk ditampilkan di kartu.
 */
export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const { stage } = getQuery(event)
  const periods = await findAllCertificationPeriods()

  if (stage === undefined || stage === '') {
    return { success: true, data: periods }
  }

  if (typeof stage !== 'string' || !/^[A-Z_]{1,40}$/.test(stage)) {
    throw createError({ statusCode: 400, statusMessage: 'Kode tahap tidak valid.' })
  }

  return { success: true, data: await withStageSchedule(periods, stage) }
})
