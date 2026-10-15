import {
  createCertificationTimeline,
} from '../../services/certification-timeline.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return await createCertificationTimeline({
    periodId: body.periodId,
    stages: body.stages,
  })
})