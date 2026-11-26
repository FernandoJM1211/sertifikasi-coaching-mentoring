
import { randomBytes } from 'node:crypto'
import {
  findPersonByEmail,
  findPersonById,
  updatePerson,
} from '../repositories/person.repository'
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUsersByPersonId,
  updateUserEmail,
  updateUserFullName,
} from '../repositories/user.repository'
import { revokeAllUserSessions } from '../repositories/session.repository'
import {
  createAccountActivationToken,
  revokeActiveTokensForUser,
} from '../repositories/account-activation-token.repository'
import { generateAuthToken, hashAuthToken } from '../utils/auth-token'
import { hashPassword } from '../utils/password'
import {
  sendAccountActivationEmail,
  sendApplicationAcceptedEmail,
  sendApplicationAcceptedNoticeEmail,
  sendLoginEmailChangedEmail,
} from '../utils/email'

const ACTIVATION_TOKEN_DURATION_MS = 24 * 60 * 60 * 1000

type AcceptedApplicationData = {
  person_id: string
  full_name_snapshot: string
  nip_snapshot: string
  institution_name: string
  region: string
  email_snapshot: string
  phone_snapshot: string
  last_education: string
  position: string
}

export type PreparedPesertaAccount =
  | {
      accountStatus: 'ACTIVE'
      /** Email login akun (bisa berbeda dari email pengajuan — kasus 3). */
      loginEmail: string
    }
  | {
      accountStatus: 'PENDING_ACTIVATION'
      loginEmail: string
      activationEmail: {
        recipientEmail: string
        activationUrl: string
      }
    }

function conflict(message: string): never {
  throw createError({
    statusCode: 409,
    statusMessage: message,
  })
}

export async function preparePesertaAccount(
  application: AcceptedApplicationData,
): Promise<PreparedPesertaAccount> {
  const personId = application.person_id.trim().toUpperCase()
  const email = application.email_snapshot.trim().toLowerCase()
  const nip = application.nip_snapshot.trim()

  if (!personId || !email || !nip) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data identitas pengajuan belum lengkap.',
    })
  }

  const person = await findPersonById(personId)

  if (!person || person.nip.trim() !== nip) {
    conflict(
      'Identitas peserta tidak cocok dengan data induk. Periksa data peserta secara manual.',
    )
  }

  const accounts = await findUsersByPersonId(personId)

  if (accounts.length > 1) {
    conflict(
      'Ditemukan lebih dari satu akun untuk peserta ini. Perlu pemeriksaan manual.',
    )
  }

  const existingAccount = accounts[0]

  if (existingAccount && existingAccount.role !== 'PESERTA') {
    conflict(
      'Peserta sudah memiliki akun petugas. Perlu pemeriksaan manual; peran akun tidak akan diubah otomatis.',
    )
  }

  /*
   * Satu NIP = satu akun (docs/08-keputusan-skenario.md).
   * - Sudah punya akun: akun lama tetap dipakai; email akun & email person TIDAK diganti
   *   walau email pengajuan berbeda (email pengajuan hanya tersimpan di pengajuan).
   * - Belum punya akun: akun dibuat dengan email pengajuan, asalkan belum dipakai akun lain.
   */
  const accountEmail = existingAccount
    ? existingAccount.username_email.trim().toLowerCase()
    : email

  if (!existingAccount) {
    const accountByEmail = await findUserByEmail(email)

    if (accountByEmail) {
      conflict('Email pengajuan sudah digunakan oleh akun lain.')
    }
  }

  // Perbarui data induk hanya setelah pemeriksaan identitas dan email.
  await updatePerson(personId, {
    full_name: application.full_name_snapshot.trim(),
    email: accountEmail,
    phone_number: application.phone_snapshot.trim(),
    institution_name: application.institution_name.trim(),
    region: application.region.trim(),
    education_level: application.last_education.trim(),
    position_name: application.position.trim(),
  })

  // Nama akun disamakan dengan nama terbaru di pengajuan yang diterima (seperti Edit Profil).
  const latestName = application.full_name_snapshot.trim()

  if (existingAccount && latestName && existingAccount.full_name !== latestName) {
    await updateUserFullName(existingAccount.user_id, latestName)
  }

  // Akun aktif dipertahankan tanpa mengubah password atau statusnya.
  if (existingAccount?.account_status === 'ACTIVE') {
    return { accountStatus: 'ACTIVE', loginEmail: accountEmail }
  }

  if (
    existingAccount &&
    existingAccount.account_status !== 'PENDING_ACTIVATION'
  ) {
    conflict('Status akun peserta tidak memungkinkan aktivasi otomatis.')
  }

  let userId: string

  if (existingAccount) {
    userId = existingAccount.user_id
  } else {
    const temporarySecret = randomBytes(32).toString('base64url')
    const passwordHash = await hashPassword(temporarySecret)

    const newUser = await createUser({
      person_id: personId,
      full_name: application.full_name_snapshot.trim(),
      username_email: email,
      password_hash: passwordHash,
      role: 'PESERTA',
      account_status: 'PENDING_ACTIVATION',
    })

    userId = newUser.user_id
  }

  // Email belum dikirim di tahap ini.
  return {
    accountStatus: 'PENDING_ACTIVATION',
    loginEmail: accountEmail,
    activationEmail: {
      // Ke email akun (akun lama: email lama), bukan email pengajuan.
      recipientEmail: accountEmail,
      activationUrl: await issueActivationUrl(userId),
    },
  }
}

/**
 * Menerbitkan token aktivasi baru dan mengembalikan tautannya.
 * Token lama TIDAK dicabut (docs/08 K-28): semua tautan yang masih berlaku 24 jam tetap bisa dipakai,
 * sehingga peserta yang membuka email lama tidak gagal. Setelah aktivasi berhasil, token lain dicabut.
 * Tautan selalu memakai APP_BASE_URL — di hosting harus berisi URL publik, bukan localhost.
 */
async function issueActivationUrl(userId: string): Promise<string> {
  const appBaseUrl = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '')

  if (!appBaseUrl) {
    throw new Error('APP_BASE_URL belum dikonfigurasi.')
  }

  const rawToken = generateAuthToken()
  const expiresAt = new Date(
    Date.now() + ACTIVATION_TOKEN_DURATION_MS,
  ).toISOString()

  await createAccountActivationToken({
    user_id: userId,
    token_hash: hashAuthToken(rawToken),
    expires_at: expiresAt,
  })

  const activationUrl = new URL('/aktivasi-akun', appBaseUrl)
  activationUrl.searchParams.set('token', rawToken)

  return activationUrl.toString()
}

/**
 * Kirim ulang tautan aktivasi untuk akun peserta yang belum aktif
 * (mis. email tidak masuk, terhapus, atau tautan sudah kedaluwarsa).
 * Tautan lama otomatis tidak berlaku lagi.
 */
export async function resendPesertaActivation(userId: string): Promise<{ recipientEmail: string }> {
  const user = await findUserById(userId)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Akun tidak ditemukan.' })
  }

  if (user.role !== 'PESERTA') {
    conflict('Tautan aktivasi hanya untuk akun peserta.')
  }

  if (user.account_status !== 'PENDING_ACTIVATION') {
    conflict('Akun ini sudah aktif atau tidak berstatus menunggu aktivasi.')
  }

  const recipientEmail = user.username_email.trim().toLowerCase()

  if (!recipientEmail) {
    conflict('Email akun belum tersedia.')
  }

  const activationUrl = await issueActivationUrl(user.user_id)
  await sendAccountActivationEmail(recipientEmail, activationUrl, { reason: 'RESEND' })

  return { recipientEmail }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Super Admin mengganti email login akun peserta (docs/08 K-28), mis. email lama sudah tidak
 * dapat diakses. Identitas peserta diperiksa panitia di luar sistem sebelum perubahan.
 * - Email baru tidak boleh dipakai akun lain atau data peserta lain.
 * - Email akun & email data induk (person) diganti; sesi & tautan aktivasi lama dicabut.
 * - Akun belum aktif → tautan aktivasi baru ke email baru. Pemberitahuan juga ke email lama.
 */
export async function changePesertaLoginEmail(userId: string, rawEmail: string): Promise<{
  email: string
  activationSent: boolean
}> {
  const email = rawEmail.trim().toLowerCase()

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Format email tidak valid.' })
  }

  const user = await findUserById(userId)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Akun tidak ditemukan.' })
  }

  if (user.role !== 'PESERTA') {
    conflict('Ubah email hanya untuk akun peserta.')
  }

  const oldEmail = user.username_email.trim().toLowerCase()

  if (email === oldEmail) {
    conflict('Email baru sama dengan email saat ini.')
  }

  const [accountByEmail, personByEmail] = await Promise.all([
    findUserByEmail(email),
    findPersonByEmail(email),
  ])

  if (accountByEmail || (personByEmail && personByEmail.person_id !== user.person_id)) {
    conflict('Email tersebut sudah digunakan akun atau peserta lain.')
  }

  await updateUserEmail(user.user_id, email)

  if (user.person_id.trim()) {
    await updatePerson(user.person_id, { email })
  }

  // Akses lewat email lama ditutup: sesi login & tautan aktivasi lama dicabut.
  await revokeAllUserSessions(user.user_id)
  await revokeActiveTokensForUser(user.user_id)

  const activationPending = user.account_status === 'PENDING_ACTIVATION'

  if (activationPending) {
    const activationUrl = await issueActivationUrl(user.user_id)
    await sendAccountActivationEmail(email, activationUrl, { reason: 'RESEND' })
  }

  // Email informasi: kegagalan hanya dicatat agar perubahan tetap tersimpan.
  await sendLoginEmailChangedEmail(email, { target: 'NEW', newEmail: email, activationPending })
    .catch((error) => console.error('Gagal mengirim info email baru:', error))

  if (oldEmail) {
    await sendLoginEmailChangedEmail(oldEmail, { target: 'OLD', newEmail: email, activationPending })
      .catch((error) => console.error('Gagal mengirim pemberitahuan ke email lama:', error))
  }

  return { email, activationSent: activationPending }
}

export async function sendPesertaActivationEmail(
  prepared: PreparedPesertaAccount,
  context: { applicationEmail: string, periodName?: string },
): Promise<void> {
  /*
   * Email saat pendaftaran diterima (docs/08 K-09):
   * - Akun belum aktif → tautan aktivasi ke email AKUN (gagal kirim = error, agar dapat diulang).
   * - Akun sudah aktif → "pendaftaran diterima, masuk dengan akun Anda" ke email akun.
   * - Email pengajuan ≠ email akun (kasus 3) → pemberitahuan singkat tanpa tautan ke email pengajuan.
   * Email informatif yang gagal hanya dicatat di log agar keputusan tetap tersimpan.
   */
  if (prepared.accountStatus === 'PENDING_ACTIVATION') {
    await sendAccountActivationEmail(
      prepared.activationEmail.recipientEmail,
      prepared.activationEmail.activationUrl,
      { periodName: context.periodName },
    )
  } else {
    await sendApplicationAcceptedEmail(prepared.loginEmail, {
      loginEmail: prepared.loginEmail,
      periodName: context.periodName,
    }).catch((error) => console.error('Gagal mengirim email pendaftaran diterima:', error))
  }

  const applicationEmail = context.applicationEmail.trim().toLowerCase()

  if (applicationEmail && applicationEmail !== prepared.loginEmail) {
    await sendApplicationAcceptedNoticeEmail(applicationEmail, { periodName: context.periodName })
      .catch((error) => console.error('Gagal mengirim pemberitahuan ke email pengajuan:', error))
  }
}
