import {
  getSheetValues,
  appendSheetRowsWithIds,
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

export async function createApplicationDocument(
  input: CreateApplicationDocumentInput,
): Promise<ApplicationDocument> {
  const now =
    new Date().toISOString()


  const uploadedAt =
    input.uploaded_at ?? now

  const status =
    input.status ?? 'active'

  const document: ApplicationDocument = {
    application_document_id: '', // ditetapkan saat baris ditulis

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

  const [created] = await appendSheetRowsWithIds(
    SHEET_NAME,
    'APP-DOC',
    1,
    (id) => ({ ...document, application_document_id: id }),
    (document) => [
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

  return created!
}

/** ID berkas (dari daftar) yang sudah tertaut ke dokumen pengajuan mana pun. */
export async function findLinkedFileIds(
  fileIds: string[],
): Promise<Set<string>> {
  const wanted = new Set(fileIds.filter(Boolean))
  const linked = new Set<string>()
  if (wanted.size === 0) return linked

  const rows = await getSheetValues(SHEET_NAME)

  for (const row of rows.slice(1)) {
    const fileId = row[3] ?? ''
    if (wanted.has(fileId)) linked.add(fileId)
  }

  return linked
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
