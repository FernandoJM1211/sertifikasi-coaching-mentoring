import {
  createCertificationTimeline,
} from '../../repositories/certification-timeline.repository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const timeline =
    await createCertificationTimeline({
      period_id: body.period_id,
      stage_order: body.stage_order,
      stage_code: body.stage_code,
      stage_name: body.stage_name,
      start_at: body.start_at,
      end_at: body.end_at,
      is_override_open:
        body.is_override_open,
      override_by: body.override_by,
      override_at: body.override_at,
    })

  return {
    success: true,
    message:
      'Timeline berhasil dibuat.',
    data: timeline,
  }
})