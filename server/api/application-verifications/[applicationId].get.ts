import {
  defineEventHandler,
  getRouterParam,
  createError,
} from 'h3'

import { getApplicationVerificationDetail } from '../../services/application-verification-detail.service'

export default defineEventHandler(async (event) => {
  const applicationId = getRouterParam(event, 'applicationId')

  if (!applicationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Application ID wajib diberikan.',
    })
  }

  const detail = await getApplicationVerificationDetail(applicationId)

  return {
    success: true,
    data: detail,
  }
})