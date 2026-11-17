import { createPackage } from '../../../services/evaluation-admin.service'
import { parsePackageInput } from '../../../utils/evaluation-input'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const input = parsePackageInput(await readBody(event))

  return { success: true, message: 'Paket soal berhasil dibuat.', data: await createPackage(user, input) }
})
