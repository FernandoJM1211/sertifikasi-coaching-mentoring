import { listPackages } from '../../../services/evaluation-admin.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])
  return { success: true, data: await listPackages() }
})
