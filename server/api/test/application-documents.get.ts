import {
  findApplicationDocumentsByApplicationId,
} from '../../repositories/application-document.repository'

export default defineEventHandler(
  async (event) => {
    const query =
      getQuery(event)

    const applicationId =
      String(
        query.applicationId ?? '',
      ).trim()

    if (!applicationId) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'applicationId wajib diisi.',
      })
    }

    const documents =
      await findApplicationDocumentsByApplicationId(
        applicationId,
      )

    return {
      success: true,
      data: documents,
    }
  },
)