import {
  findApplicationById,
  type Application,
} from '../repositories/application.repository'
import { findCertificationPeriodById } from '../repositories/certification-period.repository'
import { findAllCertificationCategories } from '../repositories/certification-category.repository'
import { findAllCertificationTypes } from '../repositories/certification-type.repository'
import type { ReadOptions } from '../utils/google-sheets'
import type { AuthenticatedUser } from './auth.service'

/**
 * Mengambil pengajuan milik peserta yang sedang login.
 * Pengajuan milik orang lain diperlakukan sebagai "tidak ditemukan"
 * agar keberadaannya tidak terungkap.
 */
export async function requireOwnedApplication(
  user: AuthenticatedUser,
  applicationId: string,
  readOptions?: ReadOptions,
): Promise<Application> {
  const application = await findApplicationById(applicationId, readOptions)

  const isOwner =
    application &&
    user.person_id &&
    application.person_id.trim().toUpperCase() ===
      user.person_id.trim().toUpperCase()

  if (!application || !isOwner) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Pengajuan sertifikasi tidak ditemukan.',
    })
  }

  return application
}

/** Nama jenis, kategori, dan periode sertifikasi sebuah pengajuan. */
export async function getCertificationInfo(application: Application) {
  const [period, categories, types] = await Promise.all([
    findCertificationPeriodById(application.period_id),
    findAllCertificationCategories(),
    findAllCertificationTypes(),
  ])

  const category = categories.find(
    (item) => item.category_id === application.category_id,
  )

  const certificationType = types.find(
    (item) =>
      item.certification_type_id ===
      (category?.certification_type_id ?? period?.certification_type_id),
  )

  return {
    type_name: certificationType?.type_name ?? '',
    category_name: category?.category_name ?? '',
    period_name: period?.period_name ?? '',
  }
}
