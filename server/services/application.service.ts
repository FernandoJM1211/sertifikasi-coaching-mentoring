import {
  createApplication as createApplicationRecord,
} from '../repositories/application.repository'

import {
  createPerson,
  findPersonByNip,
} from '../repositories/person.repository'

import {
  findAllCertificationPeriods,
} from '../repositories/certification-period.repository'

import {
  findCertificationTimelinesByPeriodId,
} from '../repositories/certification-timeline.repository'

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

function validatePayload(payload: ApplicationPayload) {
  const errors: Record<string, string> = {}

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

async function findOrCreatePerson(payload: ApplicationPayload) {
  const nip = payload.nip!.trim()
  const existingPerson = await findPersonByNip(nip)

  if (existingPerson) {
    return {
      person: existingPerson,
      created: false,
    }
  }

  const newPerson = await createPerson({
    full_name: payload.fullName!.trim(),
    nip,
    email: payload.email!.trim(),
    phone_number: payload.whatsapp!.trim(),
    institution_name: payload.institution!.trim(),
    region: payload.region!.trim(),
    education_level: payload.education!.trim(),
    position_name: payload.position!.trim(),
  })

  return {
    person: newPerson,
    created: true,
  }
}

async function getOpenRegistrationPeriod() {
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
      statusMessage:
        'Periode sertifikasi aktif tidak ditemukan.',
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

  if (
    registrationTimeline.is_override_open.trim().toUpperCase() ===
    'TRUE'
  ) {
    return period
  }

  if (!registrationTimeline.start_at || !registrationTimeline.end_at) {
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
      statusMessage:
        'Masa pendaftaran telah berakhir.',
    })
  }

  return period
}

export async function createApplication(payload: ApplicationPayload) {
  const errors = validatePayload(payload)

  if (Object.keys(errors).length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data pendaftaran tidak valid.',
      data: { errors },
    })
  }

  // Periksa periode dan jadwal sebelum membuat Person atau Application.
  const activePeriod = await getOpenRegistrationPeriod()

  const {
    person,
    created: personCreated,
  } = await findOrCreatePerson(payload)

  const submittedAt = new Date().toISOString()

  const application = await createApplicationRecord({
    person_id: person.person_id,
    period_id: activePeriod.period_id,
    category_id: activePeriod.category_id,

    full_name_snapshot: payload.fullName!.trim(),
    nip_snapshot: payload.nip!.trim(),
    institution_name: payload.institution!.trim(),
    region: payload.region!.trim(),
    email_snapshot: payload.email!.trim(),
    phone_snapshot: payload.whatsapp!.trim(),
    last_education: payload.education!.trim(),
    position: payload.position!.trim(),

    application_status: 'pending_verification',
    submitted_at: submittedAt,
  })

  return {
    success: true,
    message: 'Pendaftaran berhasil diproses.',
    data: {
      application,
      person: {
        personId: person.person_id,
        fullName: person.full_name,
        nip: person.nip,
      },
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