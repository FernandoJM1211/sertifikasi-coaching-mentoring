
import {
  defineEventHandler,
  getRouterParam,
  readBody,
  getCookie,
  createError,
} from 'h3'

import {
  updateApplicationVerificationNoteService,
} from '../../../services/application-verification-note.service'

import {
  getAuthenticatedUser,
} from '../../../services/auth.service'

const SESSION_COOKIE_NAME = 'cmsp_session'

export default defineEventHandler(
  async (event) => {
    const sessionToken = getCookie(
      event,
      SESSION_COOKIE_NAME,
    )

    if (!sessionToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Silakan login terlebih dahulu.',
      })
    }

    const user = await getAuthenticatedUser(sessionToken)

    if (
  user.account_status !== 'ACTIVE' ||
  !['VERIFIER', 'SUPER_ADMIN'].includes(user.role)
) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Anda tidak memiliki akses untuk mengubah catatan verifikasi.',
      })
    }

    const applicationId =
      getRouterParam(event, 'applicationId')

    if (!applicationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Application ID wajib diberikan.',
      })
    }

    const body = await readBody(event)

    if (
      !body ||
      typeof body !== 'object' ||
      typeof body.verificationNote !== 'string'
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Catatan verifikasi tidak valid.',
      })
    }

    const application =
      await updateApplicationVerificationNoteService({
        applicationId,
        verificationNote: body.verificationNote,
      })

    return {
      success: true,
      message: 'Catatan verifikator berhasil disimpan.',
      data: {
        application_id: application.application_id,
        verification_note: application.verification_note,
        updated_at: application.updated_at,
      },
    }
  },
)
