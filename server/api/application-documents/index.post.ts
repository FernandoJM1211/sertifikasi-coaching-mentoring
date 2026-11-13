
import {
  defineEventHandler,
  readBody,
  getCookie,
  createError,
} from 'h3'

import {
  createApplicationDocumentService,
} from '../../services/application-document.service'

import {
  getAuthenticatedUser,
} from '../../services/auth.service'

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
      user.role !== 'VERIFIER'
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Anda tidak memiliki akses untuk mengelola dokumen aplikasi.',
      })
    }

    const body = await readBody(event)

    if (!body || typeof body !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Data dokumen aplikasi tidak valid.',
      })
    }

    const document =
      await createApplicationDocumentService({
        applicationId: body.applicationId,
        documentType: body.documentType,
        fileId: body.fileId,
        isRequired: body.isRequired,
        uploadedAt: body.uploadedAt,
        status: body.status,
      })

    return {
      success: true,
      message: 'Dokumen application berhasil dibuat.',
      data: document,
    }
  },
)
