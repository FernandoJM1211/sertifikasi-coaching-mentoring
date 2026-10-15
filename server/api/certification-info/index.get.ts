
import { findAllCertificationPeriods } from '../../repositories/certification-period.repository'
import { findAllCertificationTypes } from '../../repositories/certification-type.repository'
import { findAllCertificationCategories } from '../../repositories/certification-category.repository'

export default defineEventHandler(async () => {
  const [periods, types, categories] = await Promise.all([
    findAllCertificationPeriods(),
    findAllCertificationTypes(),
    findAllCertificationCategories(),
  ])

  const activePeriods = periods.filter(
    (period) =>
      period.period_status.trim().toUpperCase() === 'ACTIVE',
  )

  const activePeriod = activePeriods[0] ?? null

  if (!activePeriod) {
    return {
      success: true,
      data: null,
      message: 'Belum ada periode sertifikasi aktif.',
    }
  }

  const certificationType = types.find(
    (type) =>
      type.certification_type_id ===
      activePeriod.certification_type_id,
  )

  const category = categories.find(
    (item) =>
      item.category_id === activePeriod.category_id &&
      item.certification_type_id ===
        activePeriod.certification_type_id,
  )

  return {
    success: true,
    data: {
      period_id: activePeriod.period_id,
      period_name: activePeriod.period_name,
      period_status: activePeriod.period_status,
      certification_type_id: activePeriod.certification_type_id,
      certification_name: certificationType?.type_name ?? '',
      category_id: activePeriod.category_id,
      category_name: category?.category_name ?? '',
    },
  }
})
