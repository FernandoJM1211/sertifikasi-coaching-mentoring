
import {
  createApplication as createApplicationRecord,
  findAcceptedApplicationByNipAndPeriod,
} from '../repositories/application.repository'

import {
  createPerson,
  findPersonByNip,
  findPersonByEmail,
} from '../repositories/person.repository'

import {
  findAllCertificationPeriods,
} from '../repositories/certification-period.repository'

import {
  findCertificationTimelinesByPeriodId,
} from '../repositories/certification-timeline.repository'

import { findUsersByPersonId } from '../repositories/user.repository'

/** `budi.santoso@gmail.com` → `bu***@gmail.com` (untuk informasi publik). */
function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  return `${local.slice(0, 2)}***@${domain}`
}

type ApplicationPayload = {
  fullName?: string
  nip?: string
  institution?: string
  region?: string
  email?: string
  whatsapp?: string
  education?: string
  position?: string
}

const MAX_TEXT_LENGTH = 200

/**
 * Validasi data pendaftaran. Melempar 400 beserta daftar error per field.
 */
export function assertValidApplicationPayload(payload: ApplicationPayload) {
  const errors = validatePayload(payload)

  if (Object.keys(errors).length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data pendaftaran tidak valid.',
      data: { errors },
    })
  }
}

function validatePayload(payload: ApplicationPayload) {
  const errors: Record<string, string> = {}

  for (const [field, value] of Object.entries(payload)) {
    if (typeof value === 'string' && value.length > MAX_TEXT_LENGTH) {
      errors[field] = `Maksimal ${MAX_TEXT_LENGTH} karakter.`
    }
  }

  if (!payload.fullName?.trim()) {
    errors.fullName = 'Nama lengkap wajib diisi.'
  }

  if (!payload.nip?.trim()) {
    errors.nip = 'NIP wajib diisi.'
  } else if (!/^\d{18}$/.test(payload.nip.trim())) {
    errors.nip = 'NIP harus terdiri dari 18 digit.'
  }

  if (!payload.institution?.trim()) {
    errors.institution = 'Nama instansi wajib diisi.'
  }

  if (!payload.region?.trim()) {
    errors.region = 'Asal daerah wajib diisi.'
  }

  if (!payload.email?.trim()) {
    errors.email = 'Email wajib diisi.'
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())
  ) {
    errors.email = 'Format email tidak valid.'
  }

  if (!payload.whatsapp?.trim()) {
    errors.whatsapp = 'Nomor WhatsApp wajib diisi.'
  } else if (!/^\d{8,15}$/.test(payload.whatsapp.trim())) {
    errors.whatsapp =
      'Nomor WhatsApp harus berupa 8–15 digit angka.'
  }

  if (!payload.education?.trim()) {
    errors.education = 'Pendidikan terakhir wajib diisi.'
  }

  if (!payload.position?.trim()) {
    errors.position = 'Jabatan wajib diisi.'
  }

  return errors
}

export async function getOpenRegistrationPeriod() {
  const periods = await findAllCertificationPeriods()

  const activePeriods = periods.filter(
    (period) =>
      period.period_status.trim().toUpperCase() === 'ACTIVE',
  )

  if (activePeriods.length === 0) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Saat ini belum ada periode sertifikasi yang aktif untuk pendaftaran.',
    })
  }

  if (activePeriods.length > 1) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Terdapat lebih dari satu periode sertifikasi aktif. Silakan hubungi Verifikator.',
    })
  }

  const period = activePeriods[0]

  if (!period) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Periode sertifikasi aktif tidak ditemukan.',
    })
  }

  if (!period.category_id.trim()) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Kategori sertifikasi pada periode aktif belum ditentukan.',
    })
  }

  const timelines =
    await findCertificationTimelinesByPeriodId(period.period_id)

  const registrationTimeline = timelines.find(
    (timeline) =>
      timeline.stage_code.trim().toUpperCase() === 'REGISTRATION',
  )

  if (!registrationTimeline) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Jadwal pendaftaran untuk periode aktif belum tersedia.',
    })
  }

  const overrideMode = (
    registrationTimeline.is_override_open || ''
  ).trim().toUpperCase()

  if (overrideMode === 'OPEN' || overrideMode === 'TRUE') {
    return period
  }

  if (overrideMode === 'CLOSED') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Pendaftaran sedang ditutup secara manual oleh Super Admin.',
    })
  }

  if (
    !registrationTimeline.start_at ||
    !registrationTimeline.end_at
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Jadwal mulai dan selesai pendaftaran belum lengkap.',
    })
  }

  const startAt = new Date(registrationTimeline.start_at)
  const endAt = new Date(registrationTimeline.end_at)
  const now = Date.now()

  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime())
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Format jadwal pendaftaran tidak valid. Silakan hubungi Verifikator.',
    })
  }

  if (endAt <= startAt) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Jadwal pendaftaran tidak valid karena waktu selesai harus setelah waktu mulai.',
    })
  }

  if (now < startAt.getTime()) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Pendaftaran belum dibuka. Silakan mendaftar sesuai jadwal yang ditentukan.',
    })
  }

  if (now > endAt.getTime()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Masa pendaftaran telah berakhir.',
    })
  }

  return period
}

export async function createApplication(payload: ApplicationPayload) {
  assertValidApplicationPayload(payload)

  const nip = payload.nip!.trim()
  const email = payload.email!.trim().toLowerCase()

  // Periksa periode dan jadwal sebelum membuat data.
  const activePeriod = await getOpenRegistrationPeriod()

  // Cegah pengajuan baru jika NIP sudah diterima pada periode ini.
  const acceptedApplication =
    await findAcceptedApplicationByNipAndPeriod(
      nip,
      activePeriod.period_id,
    )

  if (acceptedApplication) {
    throw createError({
      statusCode: 409,
      // Tidak menyebut status akun (aktif/belum) — docs/08 K-10.
      statusMessage:
        'Pendaftaran dengan NIP ini sudah diterima pada periode ini, sehingga tidak perlu mendaftar ulang. ' +
        'Informasi akun telah dikirim ke email yang terdaftar; periksa juga folder Spam/Promosi. ' +
        'Jika tidak menemukannya, hubungi admin melalui kontak di bagian bawah halaman.',
    })
  }

  // Periksa konflik identitas sebelum membuat atau menghubungkan profil.
  const [personByNip, personByEmail] = await Promise.all([
    findPersonByNip(nip),
    findPersonByEmail(email),
  ])

  /*
   * Aturan identitas (lihat docs/08-keputusan-skenario.md):
   * - NIP = identitas orang (satu NIP = satu person = satu akun); email = akun login.
   * - NIP & email cocok satu person      → pakai person lama.
   * - NIP lama + email baru              → tetap diterima, ditautkan lewat NIP; email akun TIDAK diganti.
   * - Email sudah dipakai person lain    → ditolak.
   * - NIP milik A & email milik B        → ditolak.
   */
  if (
    personByNip &&
    personByEmail &&
    personByNip.person_id !== personByEmail.person_id
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'NIP dan email terdaftar atas dua peserta yang berbeda. Periksa kembali NIP dan email Anda, atau hubungi admin.',
    })
  }

  if (!personByNip && personByEmail) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Email sudah terdaftar untuk peserta lain. Gunakan email lain.',
    })
  }

  // NIP sudah terdaftar dengan email berbeda: pengajuan tetap masuk & ditautkan ke person lama.
  let notice = ''

  if (personByNip && personByNip.email.trim().toLowerCase() !== email) {
    const accounts = await findUsersByPersonId(personByNip.person_id)
    const accountEmail = accounts[0]?.username_email.trim().toLowerCase() ?? ''

    if (accountEmail) {
      notice =
        `NIP Anda sudah terdaftar dengan email lain (${maskEmail(accountEmail)}). ` +
        'Setelah pendaftaran diterima, masuk menggunakan akun tersebut. ' +
        'Bila email itu sudah tidak dapat diakses, hubungi admin.'
    }
  }

  // Gunakan profil yang cocok; buat profil baru hanya jika NIP belum terdaftar.
  let person = personByNip
  let personCreated = false

  if (!person) {
    person = await createPerson({
      full_name: payload.fullName!.trim(),
      nip,
      email,
      phone_number: payload.whatsapp!.trim(),
      institution_name: payload.institution!.trim(),
      region: payload.region!.trim(),
      education_level: payload.education!.trim(),
      position_name: payload.position!.trim(),
    })

    personCreated = true
  }

  const submittedAt = new Date().toISOString()

  const application = await createApplicationRecord({
    person_id: person.person_id,
    period_id: activePeriod.period_id,
    category_id: activePeriod.category_id,
    full_name_snapshot: payload.fullName!.trim(),
    nip_snapshot: nip,
    institution_name: payload.institution!.trim(),
    region: payload.region!.trim(),
    email_snapshot: email,
    phone_snapshot: payload.whatsapp!.trim(),
    last_education: payload.education!.trim(),
    position: payload.position!.trim(),
    application_status: 'pending_verification',
    submitted_at: submittedAt,
  })

  return {
    success: true,
    message: 'Pendaftaran berhasil diproses.',
    // Endpoint publik: jangan kirim data person yang tersimpan (nama/email pemilik NIP).
    notice,
    data: {
      application_id: application.application_id,
      personCreated,
      period: {
        periodId: activePeriod.period_id,
        periodName: activePeriod.period_name,
      },
      category: {
        categoryId: activePeriod.category_id,
      },
    },
  }
}
