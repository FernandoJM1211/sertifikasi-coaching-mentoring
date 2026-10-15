import {
  getSheetValues,
  appendSheetValues,
} from '../utils/google-sheets'

const SHEET_NAME = 'files'

export interface FileRecord {
  file_id: string
  original_file_name: string
  storage_provider: string
  storage_file_id: string
  file_url: string
  mime_type: string
  file_size_bytes: string
  uploaded_by: string
  uploaded_at: string
  status: string
}

export interface CreateFileInput {
  original_file_name: string
  storage_provider: string
  storage_file_id: string
  file_url: string
  mime_type: string
  file_size_bytes: number
  uploaded_by: string
  uploaded_at?: string
  status?: string
}

function generateFileId(
  rows: string[][],
): string {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const id = row[0]

    if (!id) {
      continue
    }

    const match = id.match(
      /^FILE-(\d+)$/,
    )

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `FILE-${String(
    maxNumber + 1,
  ).padStart(6, '0')}`
}

export async function createFile(
  input: CreateFileInput,
): Promise<FileRecord> {
  const rows =
    await getSheetValues(SHEET_NAME)

  const now =
    new Date().toISOString()

  const fileId =
    generateFileId(rows)

  const uploadedAt =
    input.uploaded_at ?? now

  const status =
    input.status ?? 'active'

  const file: FileRecord = {
    file_id:
      fileId,

    original_file_name:
      input.original_file_name.trim(),

    storage_provider:
      input.storage_provider.trim(),

    storage_file_id:
      input.storage_file_id.trim(),

    file_url:
      input.file_url.trim(),

    mime_type:
      input.mime_type.trim(),

    file_size_bytes:
      String(input.file_size_bytes),

    uploaded_by:
      input.uploaded_by.trim(),

    uploaded_at:
      uploadedAt,

    status,
  }

  await appendSheetValues(
    SHEET_NAME,
    [
      file.file_id,
      file.original_file_name,
      file.storage_provider,
      file.storage_file_id,
      file.file_url,
      file.mime_type,
      file.file_size_bytes,
      file.uploaded_by,
      file.uploaded_at,
      file.status,
    ],
  )

  return file
}

export async function findFileById(
  fileId: string,
): Promise<FileRecord | null> {
  const rows =
    await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const row = rows
    .slice(1)
    .find(
      (item) =>
        item[0] === fileId,
    )

  if (!row) {
    return null
  }

  return {
    file_id:
      row[0] ?? '',

    original_file_name:
      row[1] ?? '',

    storage_provider:
      row[2] ?? '',

    storage_file_id:
      row[3] ?? '',

    file_url:
      row[4] ?? '',

    mime_type:
      row[5] ?? '',

    file_size_bytes:
      row[6] ?? '',

    uploaded_by:
      row[7] ?? '',

    uploaded_at:
      row[8] ?? '',

    status:
      row[9] ?? '',
  }
}