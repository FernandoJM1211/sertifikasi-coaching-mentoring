import {
  getSheetValues,
  appendSheetValues,
} from '../utils/google-sheets'

const SHEET_NAME =
  'application_document_verifications'

export interface ApplicationDocumentVerification {
  verification_id: string
  application_document_id: string
  verified_by: string
  verification_status: string
  verification_note: string
  verified_at: string
  created_at: string
  updated_at: string
}

export interface CreateApplicationDocumentVerificationInput {
  application_document_id: string
  verified_by: string
  verification_status: string
  verification_note?: string
  verified_at?: string
}

function generateApplicationDocumentVerificationId(
  rows: string[][],
): string {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const id = row[0]

    if (!id) {
      continue
    }

    const match = id.match(
      /^VER-DOC-(\d+)$/,
    )

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `VER-DOC-${String(
    maxNumber + 1,
  ).padStart(6, '0')}`
}

export async function createApplicationDocumentVerification(
  input: CreateApplicationDocumentVerificationInput,
): Promise<ApplicationDocumentVerification> {
  const rows =
    await getSheetValues(SHEET_NAME)

  const now =
    new Date().toISOString()

  const verificationId =
    generateApplicationDocumentVerificationId(
      rows,
    )

  const verifiedAt =
    input.verified_at ?? now

  const verification: ApplicationDocumentVerification = {
    verification_id:
      verificationId,

    application_document_id:
      input.application_document_id,

    verified_by:
      input.verified_by,

    verification_status:
      input.verification_status,

    verification_note:
      input.verification_note ?? '',

    verified_at:
      verifiedAt,

    created_at:
      now,

    updated_at:
      now,
  }

  await appendSheetValues(
    SHEET_NAME,
    [
      verification.verification_id,
      verification.application_document_id,
      verification.verified_by,
      verification.verification_status,
      verification.verification_note,
      verification.verified_at,
      verification.created_at,
      verification.updated_at,
    ],
  )

  return verification
}

export async function findApplicationDocumentVerificationsByDocumentId(
  applicationDocumentId: string,
): Promise<ApplicationDocumentVerification[]> {
  const rows =
    await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return []
  }

  return rows
    .slice(1)
    .filter(
      (row) =>
        row[1] === applicationDocumentId,
    )
    .map((row) => ({
      verification_id:
        row[0] ?? '',

      application_document_id:
        row[1] ?? '',

      verified_by:
        row[2] ?? '',

      verification_status:
        row[3] ?? '',

      verification_note:
        row[4] ?? '',

      verified_at:
        row[5] ?? '',

      created_at:
        row[6] ?? '',

      updated_at:
        row[7] ?? '',
    }))
}