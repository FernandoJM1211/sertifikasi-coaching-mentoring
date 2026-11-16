import { listAssessorAssignments } from '../../../../services/assessor-assignment.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const periodId = requireRouterParam(event, 'periodId', 'ID periode')

  return {
    success: true,
    data: await listAssessorAssignments(periodId),
  }
})
