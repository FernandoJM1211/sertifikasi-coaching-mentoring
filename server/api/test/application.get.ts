import { findApplicationById } from '../../repositories/application.repository'

export default defineEventHandler(async (event) => {
  const applicationId = getQuery(event).applicationId as string

  if (!applicationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'applicationId wajib diisi.',
    })
  }

  const application =
    await findApplicationById(applicationId)

  if (!application) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Application tidak ditemukan.',
    })
  }

  return {
    success: true,
    data: application,
  }
})