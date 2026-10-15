import {
  createApplicationDocumentService,
} from '../../services/application-document.service'

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event)

    const document =
      await createApplicationDocumentService({
        applicationId:
          body.applicationId,

        documentType:
          body.documentType,

        fileId:
          body.fileId,

        isRequired:
          body.isRequired,

        uploadedAt:
          body.uploadedAt,

        status:
          body.status,
      })

    return {
      success: true,
      message:
        'Dokumen application berhasil dibuat melalui service.',
      data: document,
    }
  },
)