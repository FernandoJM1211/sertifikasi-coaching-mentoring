
import { randomBytes } from 'node:crypto'
import {
  findPersonById,
  updatePerson,
} from '../repositories/person.repository'
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUsersByPersonId,
} from '../repositories/user.repository'
import {
  createAccountActivationToken,
  revokeActiveTokensForUser,
} from '../repositories/account-activation-token.repository'
import { generateAuthToken, hashAuthToken } from '../utils/auth-token'
import { hashPassword } from '../utils/password'
import { sendAccountActivationEmail } from '../utils/email'

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
    }
  | {
      accountStatus: 'PENDING_ACTIVATION'
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

  const accountByEmail = await findUserByEmail(email)

  if (
    accountByEmail &&
    accountByEmail.person_id.trim().toUpperCase() !== personId
  ) {
    conflict('Email pengajuan sudah digunakan oleh akun lain.')
  }

  const existingAccount = accounts[0]

  if (existingAccount && existingAccount.role !== 'PESERTA') {
    conflict(
      'Peserta sudah memiliki akun petugas. Perlu pemeriksaan manual; peran akun tidak akan diubah otomatis.',
    )
  }

  if (
    existingAccount &&
    existingAccount.username_email.trim().toLowerCase() !== email
  ) {
    conflict(
      'Email pengajuan berbeda dari email akun peserta yang sudah ada. Perlu penyelarasan email secara manual.',
    )
  }

  // Perbarui data induk hanya setelah pemeriksaan identitas dan email.
  await updatePerson(personId, {
    full_name: application.full_name_snapshot.trim(),
    email,
    phone_number: application.phone_snapshot.trim(),
    institution_name: application.institution_name.trim(),
    region: application.region.trim(),
    education_level: application.last_education.trim(),
    position_name: application.position.trim(),
  })

  // Akun aktif dipertahankan tanpa mengubah password atau statusnya.
  if (existingAccount?.account_status === 'ACTIVE') {
    return { accountStatus: 'ACTIVE' }
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
    activationEmail: {
      recipientEmail: email,
      activationUrl: await issueActivationUrl(userId),
    },
  }
}

/**
 * Menerbitkan token aktivasi baru (token lama dicabut) dan mengembalikan tautannya.
 * Tautan selalu memakai APP_BASE_URL — di hosting harus berisi URL publik, bukan localhost.
 */
async function issueActivationUrl(userId: string): Promise<string> {
  const appBaseUrl = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '')

  if (!appBaseUrl) {
    throw new Error('APP_BASE_URL belum dikonfigurasi.')
  }

  // Token sebelumnya dicabut sebelum token baru diterbitkan.
  await revokeActiveTokensForUser(userId)

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
  await sendAccountActivationEmail(recipientEmail, activationUrl)

  return { recipientEmail }
}

export async function sendPesertaActivationEmail(
  prepared: PreparedPesertaAccount,
): Promise<void> {
  if (prepared.accountStatus !== 'PENDING_ACTIVATION') {
    return
  }

  await sendAccountActivationEmail(
    prepared.activationEmail.recipientEmail,
    prepared.activationEmail.activationUrl,
  )
}
