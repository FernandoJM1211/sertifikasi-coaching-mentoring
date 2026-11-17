import { updatePackage } from '../../../../services/evaluation-admin.service'
import { parsePackageInput } from '../../../../utils/evaluation-input'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const packageId = requireRouterParam(event, 'packageId', 'ID paket')
  const input = parsePackageInput(await readBody(event))

  return { success: true, message: 'Paket soal berhasil diperbarui.', data: await updatePackage(user, packageId, input) }
})
