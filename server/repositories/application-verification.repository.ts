import {
  getSheetValues,
  appendSheetValues,
} from '../utils/google-sheets'

const SHEET_NAME =
  'application_verifications'

export interface ApplicationVerification {
  application_verification_id: string
  application_id: string
  verified_by: string
  verification_status: string
  verification_note: string
  verified_at: string
  created_at: string
  updated_at: string
}

export interface CreateApplicationVerificationInput {
  application_id: string
  verified_by: string
  verification_status: string
  verification_note?: string
  verified_at?: string
}

function generateApplicationVerificationId(
  rows: string[][],
): string {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const id = row[0]

    if (!id) {
      continue
    }

    const match = id.match(
      /^APP-VER-(\d+)$/,
    )

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `APP-VER-${String(
    maxNumber + 1,
  ).padStart(6, '0')}`
}

export async function createApplicationVerification(
  input: CreateApplicationVerificationInput,
): Promise<ApplicationVerification> {
  const rows =
    await getSheetValues(SHEET_NAME)

  const now =
    new Date().toISOString()

  const applicationVerificationId =
    generateApplicationVerificationId(rows)

  const verifiedAt =
    input.verified_at ?? now

  const verification: ApplicationVerification = {
    application_verification_id:
      applicationVerificationId,

    application_id:
      input.application_id,

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
      verification.application_verification_id,
      verification.application_id,
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

export async function findApplicationVerificationsByApplicationId(
  applicationId: string,
): Promise<ApplicationVerification[]> {
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
      application_verification_id:
        row[0] ?? '',

      application_id:
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