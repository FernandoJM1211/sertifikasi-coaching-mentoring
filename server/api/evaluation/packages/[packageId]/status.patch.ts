import { setPackageStatus } from '../../../../services/evaluation-admin.service'
import { parseStatusInput } from '../../../../utils/evaluation-input'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const packageId = requireRouterParam(event, 'packageId', 'ID paket')
  const status = parseStatusInput(await readBody(event))

  return {
    success: true,
    message: status === 'ARCHIVED' ? 'Paket soal diarsipkan.' : 'Paket soal diaktifkan kembali.',
    data: await setPackageStatus(user, packageId, status),
  }
})
