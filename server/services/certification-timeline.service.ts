
import {
  createCertificationTimeline as createCertificationTimelineRecord,
  updateCertificationTimeline as updateCertificationTimelineRecord,
  findCertificationTimelinesByPeriodId,
} from '../repositories/certification-timeline.repository'

import {
  findCertificationPeriodById,
} from '../repositories/certification-period.repository'

type TimelineStagePayload = {
  stageOrder?: number
  stageCode?: string
  stageName?: string
  startAt?: string
  endAt?: string
}

type CertificationTimelinePayload = {
  periodId?: string
  stages?: TimelineStagePayload[]
}

const REQUIRED_STAGES = [
  {
    stageOrder: 1,
    stageCode: 'REGISTRATION',
    stageName: 'Pendaftaran',
  },
  {
    stageOrder: 2,
    stageCode: 'DOCUMENT_VERIFICATION',
    stageName: 'Verifikasi Berkas',
  },
  {
    stageOrder: 3,
    stageCode: 'SELF_ASSESSMENT',
    stageName: 'Self Assessment',
  },
  {
    stageOrder: 4,
    stageCode: 'EVALUATION',
    stageName: 'Evaluasi',
  },
  {
    stageOrder: 5,
    stageCode: 'SELF_ASSESSMENT_VERIFICATION',
    stageName: 'Verifikasi Self Assessment',
  },
  {
    stageOrder: 6,
    stageCode: 'ASSESSOR_ASSESSMENT',
    stageName: 'Assessment oleh Assessor',
  },
  {
    stageOrder: 7,
    stageCode: 'ASSESSMENT_VERIFICATION',
    stageName: 'Verifikasi Penilaian',
  },
  {
    stageOrder: 8,
    stageCode: 'ANNOUNCEMENT',
    stageName: 'Pengumuman',
  },
]

function validatePayload(
  payload: CertificationTimelinePayload,
) {
  const errors: Record<string, string> = {}

  if (
    typeof payload.periodId !== 'string' ||
    !payload.periodId.trim()
  ) {
    errors.periodId =
      'Periode sertifikasi wajib dipilih.'
  }

  if (!Array.isArray(payload.stages)) {
    errors.stages =
      'Konfigurasi timeline wajib diisi.'

    return errors
  }

  if (payload.stages.length !== REQUIRED_STAGES.length) {
    errors.stages =
      'Timeline harus terdiri dari 8 tahap.'

    return errors
  }

  const seenStageCodes = new Set<string>()

  for (
    let index = 0;
    index < REQUIRED_STAGES.length;
    index++
  ) {

const stage = payload.stages[index]
const requiredStage = REQUIRED_STAGES[index]

if (!stage || !requiredStage) {
  errors[`stages.${index}`] =
    'Data tahapan tidak lengkap atau tidak valid.'

  continue
}


    if (
      stage.stageOrder !== requiredStage.stageOrder ||
      stage.stageCode !== requiredStage.stageCode ||
      stage.stageName !== requiredStage.stageName
    ) {
      errors[`stages.${index}.identity`] =
        `Tahapan ke-${index + 1} tidak sesuai dengan konfigurasi sistem.`
    }

    if (
      typeof stage.stageCode !== 'string' ||
      seenStageCodes.has(stage.stageCode)
    ) {
      errors[`stages.${index}.stageCode`] =
        'Kode tahapan tidak valid atau duplikat.'
    } else {
      seenStageCodes.add(stage.stageCode)
    }

    if (
      typeof stage.startAt !== 'string' ||
      !stage.startAt.trim()
    ) {
      errors[`stages.${index}.startAt`] =
        'Waktu mulai wajib diisi.'
    }

    if (
      typeof stage.endAt !== 'string' ||
      !stage.endAt.trim()
    ) {
      errors[`stages.${index}.endAt`] =
        'Waktu selesai wajib diisi.'
    }

    if (
      typeof stage.startAt !== 'string' ||
      typeof stage.endAt !== 'string' ||
      !stage.startAt.trim() ||
      !stage.endAt.trim()
    ) {
      continue
    }

    const startTime = new Date(stage.startAt)
    const endTime = new Date(stage.endAt)

    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime())
    ) {
      errors[`stages.${index}.datetime`] =
        'Format tanggal atau waktu tidak valid.'

      continue
    }

    if (endTime <= startTime) {
      errors[`stages.${index}.datetime`] =
        'Waktu selesai harus setelah waktu mulai.'
    }
  }

  for (
    let index = 1;
    index < payload.stages.length;
    index++
  ) {
    const previousStage = payload.stages[index - 1]
    const currentStage = payload.stages[index]

    if (
      !previousStage?.endAt ||
      !currentStage?.startAt
    ) {
      continue
    }

    const previousEnd = new Date(previousStage.endAt)
    const currentStart = new Date(currentStage.startAt)

    if (
      !Number.isNaN(previousEnd.getTime()) &&
      !Number.isNaN(currentStart.getTime()) &&
      currentStart < previousEnd
    ) {
      errors[`stages.${index}.datetime`] =
        `Tahap ${currentStage.stageOrder} tidak boleh dimulai sebelum tahap ${previousStage.stageOrder} selesai.`
    }
  }

  return errors
}

export async function createCertificationTimeline(
  payload: CertificationTimelinePayload,
) {
  const errors = validatePayload(payload)

  if (Object.keys(errors).length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Data timeline sertifikasi tidak valid.',
      data: { errors },
    })
  }

  const periodId = payload.periodId!.trim()

  const period =
    await findCertificationPeriodById(periodId)

  if (!period) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Periode sertifikasi tidak ditemukan.',
    })
  }

  const existingTimelines =
    await findCertificationTimelinesByPeriodId(
      periodId,
    )

  const savedTimelines = []

  for (const stage of payload.stages!) {
    const existingTimeline =
      existingTimelines.find(
        (timeline) =>
          timeline.stage_code === stage.stageCode,
      )

    const timelineData = {
      period_id: periodId,
      stage_order: String(stage.stageOrder),
      stage_code: stage.stageCode!,
      stage_name: stage.stageName!,
      start_at: stage.startAt!,
      end_at: stage.endAt!,
      is_override_open:
        existingTimeline?.is_override_open || 'FALSE',
      override_by:
        existingTimeline?.override_by || '',
      override_at:
        existingTimeline?.override_at || '',
    }

    if (existingTimeline) {
      const updatedTimeline =
        await updateCertificationTimelineRecord(
          existingTimeline.timeline_id,
          timelineData,
        )

      if (!updatedTimeline) {
        throw createError({
          statusCode: 500,
          statusMessage:
            `Gagal memperbarui timeline tahap ${stage.stageOrder}.`,
        })
      }

      savedTimelines.push(updatedTimeline)
    } else {
      const createdTimeline =
        await createCertificationTimelineRecord(
          timelineData,
        )

      savedTimelines.push(createdTimeline)
    }
  }

  return {
    success: true,
    message:
      existingTimelines.length > 0
        ? 'Timeline sertifikasi berhasil diperbarui.'
        : 'Timeline sertifikasi berhasil dibuat.',
    data: {
      period,
      timelines: savedTimelines,
    },
  }
}
