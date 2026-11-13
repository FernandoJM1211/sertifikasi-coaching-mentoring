
import {
  appendSheetValues,
  getSheetValues,
  updateSheetRow,
} from '../utils/google-sheets'

export type Person = {
  person_id: string
  full_name: string
  nip: string
  email: string
  phone_number: string
  institution_name: string
  region: string
  education_level: string
  position_name: string
  created_at: string
  updated_at: string
}

export type CreatePersonPayload = {
  full_name: string
  nip: string
  email: string
  phone_number: string
  institution_name: string
  region: string
  education_level: string
  position_name: string
}

export type UpdatePersonPayload = {
  full_name: string
  email: string
  phone_number: string
  institution_name: string
  region: string
  education_level: string
  position_name: string
}

const SHEET_NAME = 'persons'

function rowToPerson(row: string[]): Person {
  return {
    person_id: row[0] ?? '',
    full_name: row[1] ?? '',
    nip: row[2] ?? '',
    email: row[3] ?? '',
    phone_number: row[4] ?? '',
    institution_name: row[5] ?? '',
    region: row[6] ?? '',
    education_level: row[7] ?? '',
    position_name: row[8] ?? '',
    created_at: row[9] ?? '',
    updated_at: row[10] ?? '',
  }
}

function generateNextPersonId(
  rows: string[][],
): string {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const personId = row[0] ?? ''
    const match = personId.match(/^PER-(\d+)$/)

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (number > maxNumber) {
      maxNumber = number
    }
  }

  return `PER-${String(maxNumber + 1).padStart(6, '0')}`
}

export async function findPersonByNip(
  nip: string,
): Promise<Person | null> {
  const normalizedNip = nip.trim()

  if (!normalizedNip) {
    return null
  }

  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const foundRow = rows
    .slice(1)
    .find((row) => (row[2] ?? '').trim() === normalizedNip)

  return foundRow ? rowToPerson(foundRow) : null
}


export async function findPersonByEmail(
  email: string,
): Promise<Person | null> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const foundRow = rows
    .slice(1)
    .find(
      (row) =>
        (row[3] ?? '').trim().toLowerCase() ===
        normalizedEmail,
    )

  return foundRow ? rowToPerson(foundRow) : null
}

export async function findPersonById(
  personId: string,
): Promise<Person | null> {
  const normalizedPersonId = personId.trim().toUpperCase()

  if (!normalizedPersonId) {
    return null
  }

  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const foundRow = rows
    .slice(1)
    .find(
      (row) =>
        (row[0] ?? '').trim().toUpperCase() ===
        normalizedPersonId,
    )

  return foundRow ? rowToPerson(foundRow) : null
}

export async function createPerson(
  payload: CreatePersonPayload,
): Promise<Person> {
  const rows = await getSheetValues(SHEET_NAME)

  const personId = generateNextPersonId(rows)
  const now = new Date().toISOString()

  const person: Person = {
    person_id: personId,
    full_name: payload.full_name.trim(),
    nip: payload.nip.trim(),
    email: payload.email.trim().toLowerCase(),
    phone_number: payload.phone_number.trim(),
    institution_name: payload.institution_name.trim(),
    region: payload.region.trim(),
    education_level: payload.education_level.trim(),
    position_name: payload.position_name.trim(),
    created_at: now,
    updated_at: now,
  }

  await appendSheetValues(SHEET_NAME, [
    person.person_id,
    person.full_name,
    person.nip,
    person.email,
    person.phone_number,
    person.institution_name,
    person.region,
    person.education_level,
    person.position_name,
    person.created_at,
    person.updated_at,
  ])

  return person
}

export async function updatePerson(
  personId: string,
  payload: UpdatePersonPayload,
): Promise<Person | null> {
  const normalizedPersonId = personId.trim().toUpperCase()

  if (!normalizedPersonId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'person_id wajib diisi.',
    })
  }

  const email = payload.email.trim().toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format email tidak valid.',
    })
  }

  const rows = await getSheetValues(SHEET_NAME)

  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      (row[0] ?? '').trim().toUpperCase() ===
        normalizedPersonId,
  )

  if (rowIndex === -1) {
    return null
  }

  const row = rows[rowIndex]

  if (!row) {
    return null
  }

  const existingPerson = rowToPerson(row)

  const updatedPerson: Person = {
    ...existingPerson,
    full_name: payload.full_name.trim(),
    email,
    phone_number: payload.phone_number.trim(),
    institution_name: payload.institution_name.trim(),
    region: payload.region.trim(),
    education_level: payload.education_level.trim(),
    position_name: payload.position_name.trim(),
    updated_at: new Date().toISOString(),
  }

  await updateSheetRow(
    SHEET_NAME,
    rowIndex + 1,
    [
      updatedPerson.person_id,
      updatedPerson.full_name,
      updatedPerson.nip,
      updatedPerson.email,
      updatedPerson.phone_number,
      updatedPerson.institution_name,
      updatedPerson.region,
      updatedPerson.education_level,
      updatedPerson.position_name,
      updatedPerson.created_at,
      updatedPerson.updated_at,
    ],
  )

  return updatedPerson
}
