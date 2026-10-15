import {
  createApplicationDocument,
} from '../../repositories/application-document.repository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const document =
    await createApplicationDocument({
      application_id:
        body.applicationId,

      document_type:
        body.documentType,

      file_id:
        body.fileId,

      is_required:
        body.isRequired,

      uploaded_at:
        body.uploadedAt,

      status:
        body.status,
    })

  return {
    success: true,
    message:
      'Dokumen application berhasil dibuat.',
    data: document,
  }
})