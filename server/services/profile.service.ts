import {
  findPersonById,
  updatePerson,
  type Person,
} from '../repositories/person.repository'
import { updateUserFullName } from '../repositories/user.repository'
import type { AuthenticatedUser } from './auth.service'
import {
  GENDER_OPTIONS,
  normalizeGender,
  PROFILE_FIELD_MAX_LENGTH,
} from '../../shared/utils/person'

/** Data profil yang aman dikirim ke frontend. */
export function toPublicProfile(person: Person) {
  return {
    full_name: person.full_name,
    nip: person.nip,
    email: person.email,
    gender: normalizeGender(person.gender),
    birth_place: person.birth_place,
    birth_date: person.birth_date,
    institution_name: person.institution_name,
    phone_number: person.phone_number,
    education_level: person.education_level,
    position_name: person.position_name,
  }
}

/**
 * Profil pengguna yang sedang login.
 * Akun pegawai (tanpa data person) hanya memiliki nama & email akun.
 */
export async function getProfile(user: AuthenticatedUser) {
  const person = user.person_id ? await findPersonById(user.person_id) : null

  return {
    account: {
      full_name: user.full_name,
      email: user.username_email,
      role: user.role,
    },
    profile: person ? toPublicProfile(person) : null,
  }
}

export type ProfileUpdateInput = {
  full_name?: unknown
  gender?: unknown
  birth_place?: unknown
  birth_date?: unknown
  institution_name?: unknown
  phone_number?: unknown
}

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

function readText(
  value: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') badRequest(`${label} tidak valid.`)

  const text = value.trim()

  if (text.length > maxLength) {
    badRequest(`${label} maksimal ${maxLength} karakter.`)
  }

  return text
}

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value) &&
    date.getTime() < Date.now() &&
    date.getUTCFullYear() >= 1900
  )
}

/**
 * Memperbarui profil. NIP dan email tidak dapat diubah dari sini karena
 * merupakan identitas akun (NIP mencegah pendaftaran ganda, email dipakai
 * untuk login). Field kosong diperbolehkan; profil boleh belum lengkap.
 */
export async function updateProfile(
  user: AuthenticatedUser,
  input: ProfileUpdateInput,
) {
  const fullName = readText(input.full_name, 'Nama lengkap', PROFILE_FIELD_MAX_LENGTH.full_name)

  if (fullName !== undefined && !fullName) {
    badRequest('Nama lengkap wajib diisi.')
  }

  // Akun pegawai: hanya nama yang dapat diubah.
  if (!user.person_id) {
    if (fullName && fullName !== user.full_name) {
      await updateUserFullName(user.user_id, fullName)
    }

    return getProfile({ ...user, full_name: fullName ?? user.full_name })
  }

  const birthPlace = readText(input.birth_place, 'Tempat lahir', PROFILE_FIELD_MAX_LENGTH.birth_place)
  const institutionName = readText(input.institution_name, 'Instansi', PROFILE_FIELD_MAX_LENGTH.institution_name)

  const phoneNumber = readText(input.phone_number, 'Nomor telepon', 20)
  const normalizedPhone = phoneNumber?.replace(/[\s()-]/g, '')

  if (normalizedPhone && !/^\+?\d{8,15}$/.test(normalizedPhone)) {
    badRequest('Nomor telepon harus berupa 8–15 digit angka.')
  }

  const genderText = readText(input.gender, 'Jenis kelamin', 20)

  if (genderText && !(GENDER_OPTIONS as readonly string[]).includes(genderText)) {
    badRequest('Jenis kelamin tidak valid.')
  }

  const birthDate = readText(input.birth_date, 'Tanggal lahir', 10)

  if (birthDate && !isValidBirthDate(birthDate)) {
    badRequest('Tanggal lahir tidak valid.')
  }

  const updatedPerson = await updatePerson(user.person_id, {
    full_name: fullName,
    gender: genderText,
    birth_place: birthPlace,
    birth_date: birthDate,
    institution_name: institutionName,
    phone_number: normalizedPhone,
  })

  if (!updatedPerson) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data profil tidak ditemukan.',
    })
  }

  // Nama di akun disamakan dengan nama di profil.
  if (fullName && fullName !== user.full_name) {
    await updateUserFullName(user.user_id, fullName)
  }

  return {
    account: {
      full_name: updatedPerson.full_name,
      email: user.username_email,
      role: user.role,
    },
    profile: toPublicProfile(updatedPerson),
  }
}
