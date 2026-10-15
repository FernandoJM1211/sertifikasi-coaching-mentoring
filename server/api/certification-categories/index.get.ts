
import {
  findAllCertificationCategories,
} from '../../repositories/certification-category.repository'

export default defineEventHandler(async () => {
  const categories =
    await findAllCertificationCategories()

  return {
    success: true,
    data: categories,
  }
})
