import {
  createFile,
} from '../../repositories/file.repository'

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event)

    const file =
      await createFile({
        original_file_name:
          body.originalFileName,

        storage_provider:
          body.storageProvider,

        storage_file_id:
          body.storageFileId,

        file_url:
          body.fileUrl,

        mime_type:
          body.mimeType,

        file_size_bytes:
          body.fileSizeBytes,

        uploaded_by:
          body.uploadedBy,

        uploaded_at:
          body.uploadedAt,

        status:
          body.status,
      })

    return {
      success: true,
      message:
        'File metadata berhasil dibuat.',
      data: file,
    }
  },
)