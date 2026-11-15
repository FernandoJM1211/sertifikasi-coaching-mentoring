/**
 * Konstanta data person/profil yang dipakai bersama oleh app/ dan server/.
 */

export const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'] as const

export type Gender = (typeof GENDER_OPTIONS)[number]

/** Menyeragamkan nilai jenis kelamin lama (mis. "Wanita") ke opsi baku. */
export function normalizeGender(value: string | null | undefined): Gender | '' {
  const normalized = (value ?? '').trim().toLowerCase()

  if (['laki-laki', 'laki laki', 'pria', 'l'].includes(normalized)) {
    return 'Laki-laki'
  }

  if (['perempuan', 'wanita', 'p'].includes(normalized)) {
    return 'Perempuan'
  }

  return ''
}

/** Batas panjang field profil (dipakai validasi client & server). */
export const PROFILE_FIELD_MAX_LENGTH = {
  full_name: 150,
  birth_place: 100,
  institution_name: 200,
  phone_number: 15,
} as const
