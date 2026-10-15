import {
  createCertificationPeriod as createCertificationPeriodRecord,
  updateCertificationPeriod as updateCertificationPeriodRecord,
  findCertificationPeriodById,
  findAllCertificationPeriods,
} from '../repositories/certification-period.repository'

import {
  findCertificationTimelinesByPeriodId,
} from '../repositories/certification-timeline.repository'

type CertificationPeriodPayload = {
  certificationTypeId?: string
  categoryId?: string
  periodName?: string
  periodStatus?: string
  createdBy?: string
}

function validatePayload(
  payload: CertificationPeriodPayload,
) {
  const errors: Record<string, string> = {}

  if (!payload.certificationTypeId?.trim()) {
    errors.certificationTypeId =
      'Jenis sertifikasi wajib dipilih.'
  }

  if (!payload.categoryId?.trim()) {
    errors.categoryId =
      'Kategori sertifikasi wajib dipilih.'
  }

  if (!payload.periodName?.trim()) {
    errors.periodName =
      'Nama periode wajib diisi.'
  }

  if (!payload.periodStatus?.trim()) {
    errors.periodStatus =
      'Status periode wajib diisi.'
  }

  if (!payload.createdBy?.trim()) {
    errors.createdBy =
      'Pembuat periode wajib diisi.'
  }

  return errors
}

export async function createCertificationPeriod(
  payload: CertificationPeriodPayload,
) {
  const errors = validatePayload(payload)

  if (Object.keys(errors).length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Data periode sertifikasi tidak valid.',
      data: { errors },
    })
  }

  const period =
    await createCertificationPeriodRecord({
      certification_type_id:
        payload.certificationTypeId!.trim(),
      category_id:
        payload.categoryId!.trim(),
      period_name:
        payload.periodName!.trim(),
      period_status:
        payload.periodStatus!.trim(),
      created_by:
        payload.createdBy!.trim(),
    })

  return {
    success: true,
    message:
      'Periode sertifikasi berhasil dibuat.',
    data: period,
  }
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['CLOSED'],
  CLOSED: ['ACTIVE', 'COMPLETED'],
  OPEN: [],
  COMPLETED: [],
}

const REQUIRED_STAGES = [
  'REGISTRATION',
  'DOCUMENT_VERIFICATION',
  'SELF_ASSESSMENT',
  'EVALUATION',
  'SELF_ASSESSMENT_VERIFICATION',
  'ASSESSOR_ASSESSMENT',
  'ASSESSMENT_VERIFICATION',
  'ANNOUNCEMENT',
]

function validateTimelineForActivation(
  timelines: Awaited<
    ReturnType<typeof findCertificationTimelinesByPeriodId>
  >,
): string | null {
  if (timelines.length !== REQUIRED_STAGES.length) {
    return 'Periode belum memiliki delapan tahapan timeline yang lengkap.'
  }

  const orderedTimelines = [...timelines].sort(
    (a, b) => Number(a.stage_order) - Number(b.stage_order),
  )

  for (let index = 0; index < REQUIRED_STAGES.length; index++) {
    const timeline = orderedTimelines[index]
    const requiredStageCode = REQUIRED_STAGES[index]

    if (
      !timeline ||
      timeline.stage_code !== requiredStageCode ||
      Number(timeline.stage_order) !== index + 1
    ) {
      return `Tahapan ke-${index + 1} belum lengkap atau urutannya tidak sesuai.`
    }

    if (!timeline.start_at || !timeline.end_at) {
      return `Jadwal mulai dan selesai tahap ${index + 1} wajib diisi.`
    }

    const start = new Date(timeline.start_at)
    const end = new Date(timeline.end_at)

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return `Format tanggal tahap ${index + 1} tidak valid.`
    }

    if (end <= start) {
      return `Waktu selesai tahap ${index + 1} harus setelah waktu mulai.`
    }

    if (index > 0) {
      const previousTimeline = orderedTimelines[index - 1]

      if (!previousTimeline) {
        return 'Data tahapan sebelumnya tidak ditemukan.'
      }

      const previousEnd = new Date(previousTimeline.end_at)

      if (start < previousEnd) {
        return `Tahap ${index + 1} tidak boleh dimulai sebelum tahap ${index} selesai.`
      }
    }
  }

  return null
}

export async function updateCertificationPeriodStatus(
  periodId: string,
  newStatus: string,
) {
  const normalizedPeriodId =
    typeof periodId === 'string' ? periodId.trim() : ''

  const normalizedStatus =
    typeof newStatus === 'string'
      ? newStatus.trim().toUpperCase()
      : ''

  if (!normalizedPeriodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID periode wajib diisi.',
    })
  }

  const period =
    await findCertificationPeriodById(normalizedPeriodId)

  if (!period) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Periode sertifikasi tidak ditemukan.',
    })
  }

  const currentStatus = period.period_status.trim().toUpperCase()
  const allowedStatuses =
    ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? []

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        `Perubahan status dari ${currentStatus} ke ${normalizedStatus} tidak diizinkan.`,
    })
  }

  // Aktivasi atau pembukaan kembali hanya diizinkan jika
  // tidak ada periode lain yang masih berjalan atau ditutup.
  if (normalizedStatus === 'ACTIVE') {
    const allPeriods = await findAllCertificationPeriods()

    const unfinishedPeriod = allPeriods.find((item) => {
      const itemStatus = item.period_status.trim().toUpperCase()

      return (
        item.period_id !== normalizedPeriodId &&
        ['ACTIVE', 'CLOSED'].includes(itemStatus)
      )
    })

    if (unfinishedPeriod) {
      const unfinishedStatus =
        unfinishedPeriod.period_status.trim().toUpperCase()

      const statusLabel =
        unfinishedStatus === 'ACTIVE' ? 'Aktif' : 'Ditutup'

      throw createError({
        statusCode: 409,
        statusMessage:
          `Periode "${unfinishedPeriod.period_name}" (${unfinishedPeriod.period_id}) masih berstatus ${statusLabel}. Selesaikan periode tersebut sebelum mengaktifkan atau membuka kembali periode lain.`,
      })
    }
  }

  // Periode harus memiliki delapan tahapan timeline yang valid
  // sebelum dapat diaktifkan atau dibuka kembali.
  if (normalizedStatus === 'ACTIVE') {
    const timelines =
      await findCertificationTimelinesByPeriodId(
        normalizedPeriodId,
      )

    const timelineError =
      validateTimelineForActivation(timelines)

    if (timelineError) {
      throw createError({
        statusCode: 400,
        statusMessage: timelineError,
      })
    }
  }

  const updatedPeriod =
    await updateCertificationPeriodRecord(
      normalizedPeriodId,
      {
        certification_type_id: period.certification_type_id,
        category_id: period.category_id,
        period_name: period.period_name,
        period_status: normalizedStatus,
        created_by: period.created_by,
      },
    )

  if (!updatedPeriod) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gagal memperbarui status periode.',
    })
  }

  return {
    success: true,
    message:
      `Status periode berhasil diubah menjadi ${normalizedStatus}.`,
    data: updatedPeriod,
  }
}