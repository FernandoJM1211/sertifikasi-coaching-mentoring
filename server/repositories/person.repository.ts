
import { createError } from 'h3'
import {
  appendSheetRowsWithIds,
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
  gender: string
  birth_place: string
  /** Format YYYY-MM-DD */
  birth_date: string
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

/** Field yang boleh diperbarui; field yang tidak dikirim dibiarkan. */
export type UpdatePersonPayload = Partial<{
  full_name: string
  email: string
  phone_number: string
  institution_name: string
  region: string
  education_level: string
  position_name: string
  gender: string
  birth_place: string
  birth_date: string
}>

const SHEET_NAME = 'persons'

const UPDATABLE_PERSON_FIELDS = [
  'full_name',
  'phone_number',
  'institution_name',
  'region',
  'education_level',
  'position_name',
  'gender',
  'birth_place',
  'birth_date',
] as const satisfies readonly (keyof UpdatePersonPayload)[]

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
    gender: row[11] ?? '',
    birth_place: row[12] ?? '',
    birth_date: row[13] ?? '',
  }
}

// Kolom L-N (gender, birth_place, birth_date) ditambahkan setelah
// kolom awal agar data lama tidak bergeser.
function personToRow(person: Person): string[] {
  return [
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
    person.gender,
    person.birth_place,
    person.birth_date,
  ]
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
  const now = new Date().toISOString()

  const person: Person = {
    person_id: '', // ditetapkan saat baris ditulis
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
    gender: '',
    birth_place: '',
    birth_date: '',
  }

  const [created] = await appendSheetRowsWithIds(
    SHEET_NAME,
    'PER',
    1,
    (id) => ({ ...person, person_id: id }),
    (person) => personToRow(person),
  )

  return created!
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

  const email = payload.email?.trim().toLowerCase()

  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

  // Hanya field yang terdaftar yang boleh berubah; person_id, nip,
  // created_at tidak pernah ikut diperbarui.
  const updates: Partial<Person> = {}

  for (const field of UPDATABLE_PERSON_FIELDS) {
    const value = payload[field]

    if (typeof value === 'string') {
      updates[field] = value.trim()
    }
  }

  const updatedPerson: Person = {
    ...existingPerson,
    ...updates,
    ...(email !== undefined ? { email } : {}),
    updated_at: new Date().toISOString(),
  }

  await updateSheetRow(
    SHEET_NAME,
    rowIndex + 1,
    personToRow(updatedPerson),
  )

  return updatedPerson
}
