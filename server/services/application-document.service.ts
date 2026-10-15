import {
  createApplicationDocument,
  type ApplicationDocument,
  type CreateApplicationDocumentInput,
} from '../repositories/application-document.repository'

export type CreateApplicationDocumentServiceInput = {
  applicationId: string
  documentType: string
  fileId: string
  isRequired: boolean
  uploadedAt?: string
  status?: string
}

export async function createApplicationDocumentService(
  input: CreateApplicationDocumentServiceInput,
): Promise<ApplicationDocument> {
  const applicationId =
    input.applicationId?.trim() ?? ''

  const documentType =
    input.documentType?.trim() ?? ''

  const fileId =
    input.fileId?.trim() ?? ''

  if (!applicationId) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'applicationId wajib diisi.',
    })
  }

  if (!documentType) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'documentType wajib diisi.',
    })
  }

  if (!fileId) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'fileId wajib diisi.',
    })
  }

  if (typeof input.isRequired !== 'boolean') {
    throw createError({
      statusCode: 400,
      statusMessage:
        'isRequired harus berupa boolean.',
    })
  }

  const payload: CreateApplicationDocumentInput = {
    application_id: applicationId,
    document_type: documentType,
    file_id: fileId,
    is_required: input.isRequired,
    uploaded_at: input.uploadedAt,
    status: input.status?.trim() || undefined,
  }

  return await createApplicationDocument(
    payload,
  )
}