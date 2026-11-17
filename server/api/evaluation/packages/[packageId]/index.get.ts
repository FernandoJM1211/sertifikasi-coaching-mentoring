import { getPackage } from '../../../../services/evaluation-admin.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['SUPER_ADMIN'])
  const packageId = requireRouterParam(event, 'packageId', 'ID paket')
  return { success: true, data: await getPackage(packageId) }
})
