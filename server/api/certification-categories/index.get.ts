import { findAllCertificationCategories } from '../../repositories/certification-category.repository'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  return {
    success: true,
    data: await findAllCertificationCategories(),
  }
})
