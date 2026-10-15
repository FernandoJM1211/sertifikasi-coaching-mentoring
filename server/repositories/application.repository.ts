import {
  appendSheetValues,
  getSheetValues,
  updateSheetRow,
} from '../utils/google-sheets'

export type Application = {
  application_id: string
  person_id: string
  period_id: string
  category_id: string
  full_name_snapshot: string
  nip_snapshot: string
  institution_name: string
  region: string
  email_snapshot: string
  phone_snapshot: string
  last_education: string
  position: string
  application_status: string
  verification_note: string
  submitted_at: string
  created_at: string
  updated_at: string
}

export type CreateApplicationPayload = {
  person_id: string
  period_id: string
  category_id: string
  full_name_snapshot: string
  nip_snapshot: string
  institution_name: string
  region: string
  email_snapshot: string
  phone_snapshot: string
  last_education: string
  position: string
  application_status: string
  submitted_at: string
}

const SHEET_NAME = 'applications'

function rowToApplication(row: string[]): Application {
  return {
    application_id: row[0] ?? '',
    person_id: row[1] ?? '',
    period_id: row[2] ?? '',
    category_id: row[3] ?? '',
    full_name_snapshot: row[4] ?? '',
    nip_snapshot: row[5] ?? '',
    institution_name: row[6] ?? '',
    region: row[7] ?? '',
    email_snapshot: row[8] ?? '',
    phone_snapshot: row[9] ?? '',
    last_education: row[10] ?? '',
    position: row[11] ?? '',
    application_status: row[12] ?? '',
    verification_note: row[13] ?? '',
    submitted_at: row[14] ?? '',
    created_at: row[15] ?? '',
    updated_at: row[16] ?? '',
  }
}

function generateNextApplicationId(
  rows: string[][],
) {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const applicationId = row[0] ?? ''

    const match = applicationId.match(
      /^APP-(\d+)$/,
    )

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `APP-${String(maxNumber + 1).padStart(6, '0')}`
}

export async function createApplication(
  payload: CreateApplicationPayload,
): Promise<Application> {
  const rows = await getSheetValues(SHEET_NAME)

  const applicationId =
    generateNextApplicationId(rows)

  const now = new Date().toISOString()

  const application: Application = {
    application_id: applicationId,
    person_id: payload.person_id.trim(),
    period_id: payload.period_id.trim(),
    category_id: payload.category_id.trim(),
    full_name_snapshot:
      payload.full_name_snapshot.trim(),
    nip_snapshot: payload.nip_snapshot.trim(),
    institution_name:
      payload.institution_name.trim(),
    region: payload.region.trim(),
    email_snapshot:
      payload.email_snapshot.trim(),
    phone_snapshot:
      payload.phone_snapshot.trim(),
    last_education:
      payload.last_education.trim(),
    position: payload.position.trim(),
    application_status:
      payload.application_status.trim(),
    verification_note: '',
    submitted_at: payload.submitted_at,
    created_at: now,
    updated_at: now,
  }

  await appendSheetValues(SHEET_NAME, [
    application.application_id,
    application.person_id,
    application.period_id,
    application.category_id,
    application.full_name_snapshot,
    application.nip_snapshot,
    application.institution_name,
    application.region,
    application.email_snapshot,
    application.phone_snapshot,
    application.last_education,
    application.position,
    application.application_status,
    application.verification_note,
    application.submitted_at,
    application.created_at,
    application.updated_at,
  ])

  return application
}

export async function findApplicationsByStatus(
  status: string,
): Promise<Application[]> {
  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return []
  }

  // Hanya mengambil application dengan status yang diminta.
  // Digunakan oleh Verifikator untuk melihat antrean pengajuan
  // yang masih membutuhkan tindakan pada tahap tertentu.
  return rows
    .slice(1)
    .map(rowToApplication)
    .filter(
      (application) =>
        application.application_status === status,
    )
}

export async function findApplicationsByPeriod(
  periodId: string,
): Promise<Application[]> {
  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return []
  }

  const normalizedPeriodId = periodId.trim()

  if (!normalizedPeriodId) {
    return []
  }

  // Ambil seluruh pengajuan pada periode terpilih.
  // Urutkan berdasarkan waktu pengajuan terbaru ke terlama.
  return rows
    .slice(1)
    .map(rowToApplication)
    .filter(
      (application) =>
        application.period_id === normalizedPeriodId,
    )
    .sort((a, b) => {
      const dateA = new Date(a.submitted_at).getTime()
      const dateB = new Date(b.submitted_at).getTime()

      return (
        (Number.isFinite(dateB) ? dateB : 0) -
        (Number.isFinite(dateA) ? dateA : 0)
      )
    })
}

export async function findApplicationById(
  applicationId: string,
): Promise<Application | null> {
  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const row = rows
    .slice(1)
    .find(
      (row) =>
        row[0] === applicationId,
    )

  if (!row) {
    return null
  }

  return rowToApplication(row)
}

export async function updateApplicationVerificationNote(
  applicationId: string,
  verificationNote: string,
): Promise<Application | null> {
  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      row[0] === applicationId,
  )

  if (rowIndex === -1) {
    return null
  }

  const row = rows[rowIndex]

  if (!row) {
    return null
  }

  row[13] = verificationNote.trim()
  row[16] = new Date().toISOString()

  await updateSheetRow(
    SHEET_NAME,
    rowIndex + 1,
    row,
  )

  return rowToApplication(row)
}

export async function updateApplicationStatus(
  applicationId: string,
  applicationStatus: string,
): Promise<Application | null> {
  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      row[0] === applicationId,
  )

  if (rowIndex === -1) {
    return null
  }

  const row = rows[rowIndex]

  if (!row) {
    return null
  }

  row[12] = applicationStatus.trim()
  row[16] = new Date().toISOString()

  await updateSheetRow(
    SHEET_NAME,
    rowIndex + 1,
    row,
  )

  return rowToApplication(row)
}


/**
 * Mencari pengajuan yang sudah diterima untuk NIP
 * dan periode yang sama.
 *
 * Pengajuan yang ditolak atau masih pending tidak
 * menghalangi Guest mengajukan kembali.
 */
export async function findAcceptedApplicationByNipAndPeriod(
  nip: string,
  periodId: string,
  excludeApplicationId?: string,
): Promise<Application | null> {
  const normalizedNip = nip.trim()
  const normalizedPeriodId = periodId.trim()
  const normalizedExcludeId =
    excludeApplicationId?.trim() ?? ''

  if (!normalizedNip || !normalizedPeriodId) {
    return null
  }

  const applications =
    await findApplicationsByPeriod(normalizedPeriodId)

  return (
    applications.find(
      (application) =>
        application.nip_snapshot.trim() === normalizedNip &&
        application.application_status === 'accepted' &&
        application.application_id !== normalizedExcludeId,
    ) ?? null
  )
}


/**
 * Menandai pengajuan lain yang masih pending sebagai
 * superseded ketika pengajuan dengan NIP dan periode
 * yang sama sudah diterima.
 *
 * Pengajuan tetap disimpan agar riwayatnya tidak hilang.
 */
export async function supersedePendingApplicationsByNipAndPeriod(
  nip: string,
  periodId: string,
  acceptedApplicationId: string,
): Promise<Application[]> {
  const normalizedNip = nip.trim()
  const normalizedPeriodId = periodId.trim()
  const normalizedAcceptedId = acceptedApplicationId.trim()

  if (
    !normalizedNip ||
    !normalizedPeriodId ||
    !normalizedAcceptedId
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'NIP, periodId, dan acceptedApplicationId wajib diisi.',
    })
  }

  const applications =
    await findApplicationsByPeriod(normalizedPeriodId)

  const supersededApplications: Application[] = []

  for (const application of applications) {
    if (
      application.nip_snapshot.trim() !== normalizedNip ||
      application.application_status !== 'pending_verification' ||
      application.application_id === normalizedAcceptedId
    ) {
      continue
    }

    const updatedApplication =
      await updateApplicationStatus(
        application.application_id,
        'superseded',
      )

    if (updatedApplication) {
      supersededApplications.push(updatedApplication)
    }
  }

  return supersededApplications
}
