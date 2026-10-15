import {
  createFileService,
} from '../../services/file.service'

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event)

    const file =
      await createFileService({
        originalFileName:
          body.originalFileName,

        storageProvider:
          body.storageProvider,

        storageFileId:
          body.storageFileId,

        fileUrl:
          body.fileUrl,

        mimeType:
          body.mimeType,

        fileSizeBytes:
          body.fileSizeBytes,

        uploadedBy:
          body.uploadedBy,

        uploadedAt:
          body.uploadedAt,

        status:
          body.status,
      })

    return {
      success: true,
      message:
        'File metadata berhasil dibuat melalui service.',
      data: file,
    }
  },
)