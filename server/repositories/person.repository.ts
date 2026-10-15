import {
  appendSheetValues,
  getSheetValues,
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
) {
  let maxNumber = 0

  for (const row of rows.slice(1)) {
    const personId = row[0] ?? ''

    const match = personId.match(
      /^PER-(\d+)$/,
    )

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
  const rows = await getSheetValues(SHEET_NAME)

  if (rows.length <= 1) {
    return null
  }

  const dataRows = rows.slice(1)

  const foundRow = dataRows.find(
    (row) => row[2] === nip,
  )

  if (!foundRow) {
    return null
  }

  return rowToPerson(foundRow)
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
    email: payload.email.trim(),
    phone_number: payload.phone_number.trim(),
    institution_name:
      payload.institution_name.trim(),
    region: payload.region.trim(),
    education_level:
      payload.education_level.trim(),
    position_name:
      payload.position_name.trim(),
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