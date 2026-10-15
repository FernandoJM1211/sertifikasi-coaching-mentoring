import {
  getSheetValues,
  appendSheetValues,
} from '../utils/google-sheets'

const SHEET_NAME = 'application_documents'

export interface ApplicationDocument {
  application_document_id: string
  application_id: string
  document_type: string
  file_id: string
  is_required: string
  uploaded_at: string
  status: string
  created_at: string
  updated_at: string
}

export interface CreateApplicationDocumentInput {
  application_id: string
  document_type: string
  file_id: string
  is_required: boolean
  uploaded_at?: string
  status?: string
}

function generateApplicationDocumentId(
  rows: string[][],
): string {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const id = row[0]

    if (!id) {
      continue
    }

    const match = id.match(
      /^APP-DOC-(\d+)$/,
    )

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `APP-DOC-${String(
    maxNumber + 1,
  ).padStart(6, '0')}`
}

export async function createApplicationDocument(
  input: CreateApplicationDocumentInput,
): Promise<ApplicationDocument> {
  const rows =
    await getSheetValues(SHEET_NAME)

  const now =
    new Date().toISOString()

  const applicationDocumentId =
    generateApplicationDocumentId(rows)

  const uploadedAt =
    input.uploaded_at ?? now

  const status =
    input.status ?? 'active'

  const document: ApplicationDocument = {
    application_document_id:
      applicationDocumentId,

    application_id:
      input.application_id,

    document_type:
      input.document_type,

    file_id:
      input.file_id,

    is_required:
      input.is_required
        ? 'TRUE'
        : 'FALSE',

    uploaded_at:
      uploadedAt,

    status,

    created_at:
      now,

    updated_at:
      now,
  }

  await appendSheetValues(
    SHEET_NAME,
    [
      document.application_document_id,
      document.application_id,
      document.document_type,
      document.file_id,
      document.is_required,
      document.uploaded_at,
      document.status,
      document.created_at,
      document.updated_at,
    ],
  )

  return document
}

export async function findApplicationDocumentsByApplicationId(
  applicationId: string,
): Promise<ApplicationDocument[]> {
  const rows =
    await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return []
  }

  return rows
    .slice(1)
    .filter(
      (row) =>
        row[1] === applicationId,
    )
    .map((row) => ({
      application_document_id:
        row[0] ?? '',

      application_id:
        row[1] ?? '',

      document_type:
        row[2] ?? '',

      file_id:
        row[3] ?? '',

      is_required:
        row[4] ?? 'FALSE',

      uploaded_at:
        row[5] ?? '',

      status:
        row[6] ?? '',

      created_at:
        row[7] ?? '',

      updated_at:
        row[8] ?? '',
    }))
}

export async function findApplicationDocumentById(
  applicationDocumentId: string,
): Promise<ApplicationDocument | null> {
  const rows =
    await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const row = rows
    .slice(1)
    .find(
      (row) =>
        row[0] === applicationDocumentId,
    )

  if (!row) {
    return null
  }

  return {
    application_document_id:
      row[0] ?? '',

    application_id:
      row[1] ?? '',

    document_type:
      row[2] ?? '',

    file_id:
      row[3] ?? '',

    is_required:
      row[4] ?? 'FALSE',

    uploaded_at:
      row[5] ?? '',

    status:
      row[6] ?? '',

    created_at:
      row[7] ?? '',

    updated_at:
      row[8] ?? '',
  }
}
