import {
  defineEventHandler,
  getRouterParam,
  readBody,
} from 'h3'

import {
  updateApplicationVerificationNoteService,
} from '../../../services/application-verification-note.service'

export default defineEventHandler(
  async (event) => {
    const applicationId =
      getRouterParam(
        event,
        'applicationId',
      )

    if (!applicationId) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Application ID wajib diberikan.',
      })
    }

    const body = await readBody(event)

    const application =
      await updateApplicationVerificationNoteService(
        {
          applicationId,
          verificationNote:
            body?.verificationNote,
        },
      )

    return {
      success: true,
      message:
        'Catatan verifikator berhasil disimpan.',
      data: {
        application_id:
          application.application_id,
        verification_note:
          application.verification_note,
        updated_at:
          application.updated_at,
      },
    }
  },
)