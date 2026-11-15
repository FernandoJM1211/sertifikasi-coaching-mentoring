import { updateApplicationVerificationNoteService } from '../../../services/application-verification-note.service'

const MAX_NOTE_LENGTH = 5000

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const body = await readBody<{ verificationNote?: unknown }>(event)

  if (
    typeof body?.verificationNote !== 'string' ||
    body.verificationNote.length > MAX_NOTE_LENGTH
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: `Catatan verifikasi tidak valid (maksimal ${MAX_NOTE_LENGTH} karakter).`,
    })
  }

  const application = await updateApplicationVerificationNoteService({
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
})
