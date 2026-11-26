import nodemailer from 'nodemailer'

/**
 * Email sistem (Gmail). Isi per kondisi pendaftaran mengikuti docs/08-keputusan-skenario.md (K-01, K-09):
 * - `sendAccountActivationEmail`        : belum punya akun / akun belum aktivasi → tautan aktivasi.
 * - `sendApplicationAcceptedEmail`      : sudah punya akun aktif → pendaftaran diterima, masuk dengan akun lama.
 * - `sendApplicationAcceptedNoticeEmail`: email pengajuan ≠ email akun (kasus 3) → pemberitahuan singkat
 *                                         TANPA tautan login/aktivasi.
 * - `sendApplicationRejectedEmail`      : pendaftaran tidak diterima (umum, tanpa catatan Verifikator).
 * - `sendLoginEmailChangedEmail`        : email login peserta diganti Super Admin (K-28).
 */

const SENDER_NAME = 'Sertifikasi Coaching dan Mentoring'

function getEmailConfig() {
  const gmailUser = process.env.GMAIL_USER?.trim()
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')
  const appBaseUrl = process.env.APP_BASE_URL?.trim()

  if (!gmailUser || !gmailAppPassword || !appBaseUrl) {
    throw new Error(
      'Konfigurasi email belum lengkap. Periksa GMAIL_USER, GMAIL_APP_PASSWORD, dan APP_BASE_URL.',
    )
  }

  return {
    gmailUser,
    gmailAppPassword,
    appBaseUrl: appBaseUrl.replace(/\/+$/, ''),
  }
}

function createEmailTransporter() {
  const { gmailUser, gmailAppPassword } = getEmailConfig()

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })
}

function normalizeRecipient(recipientEmail: string): string {
  const normalized = recipientEmail.trim().toLowerCase()

  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Alamat email penerima tidak valid.')
  }

  return normalized
}

/** Nilai dinamis (nama periode, email) di-escape sebelum masuk HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type EmailContent = {
  subject: string
  title: string
  /** Paragraf teks biasa (di-escape untuk HTML). */
  paragraphs: string[]
  button?: { label: string, url: string }
  /** Paragraf penutup sebelum salam. */
  footnotes?: string[]
}

async function sendSystemEmail(recipientEmail: string, content: EmailContent): Promise<void> {
  const { gmailUser } = getEmailConfig()
  const to = normalizeRecipient(recipientEmail)
  const footnotes = content.footnotes ?? []

  const text = [
    'Halo,',
    '',
    ...content.paragraphs.flatMap((paragraph) => [paragraph, '']),
    ...(content.button ? [`${content.button.label}: ${content.button.url}`, ''] : []),
    ...footnotes.flatMap((paragraph) => [paragraph, '']),
    'Salam,',
    'Tim Sertifikasi CMSP',
  ].join('\n')

  const paragraph = (value: string) => `<p>${escapeHtml(value)}</p>`
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: auto;">
      <h2 style="color: #1d4ed8;">${escapeHtml(content.title)}</h2>
      <p>Halo,</p>
      ${content.paragraphs.map(paragraph).join('\n')}
      ${content.button
        ? `<p style="margin: 28px 0;">
            <a href="${escapeHtml(content.button.url)}"
               style="display: inline-block; padding: 12px 22px; background: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px;">
              ${escapeHtml(content.button.label)}
            </a>
          </p>`
        : ''}
      ${footnotes.map((value) => `<p style="font-size: 13px; color: #475569;">${escapeHtml(value)}</p>`).join('\n')}
      <p>Salam,<br />Tim Sertifikasi CMSP</p>
    </div>
  `

  await createEmailTransporter().sendMail({
    from: `"${SENDER_NAME}" <${gmailUser}>`,
    to,
    subject: content.subject,
    text,
    html,
  })
}

const periodPhrase = (periodName?: string) => (periodName ? ` pada ${periodName}` : '')

/* ------------------------------------------------------------------ */

export async function sendAccountActivationEmail(
  recipientEmail: string,
  activationUrl: string,
  options: { periodName?: string, reason?: 'ACCEPTED' | 'RESEND' } = {},
): Promise<void> {
  const { appBaseUrl } = getEmailConfig()

  let parsedActivationUrl: URL

  try {
    parsedActivationUrl = new URL(activationUrl)
  } catch {
    throw new Error('Tautan aktivasi tidak valid.')
  }

  if (
    parsedActivationUrl.origin !== new URL(appBaseUrl).origin ||
    !parsedActivationUrl.pathname.startsWith('/aktivasi-akun')
  ) {
    throw new Error('Tautan aktivasi tidak sesuai dengan URL aplikasi.')
  }

  await sendSystemEmail(recipientEmail, {
    subject: 'Aktivasi Akun Sertifikasi CMSP',
    title: 'Aktivasi Akun Sertifikasi CMSP',
    paragraphs: [
      options.reason === 'RESEND'
        ? 'Berikut tautan aktivasi akun Sertifikasi CMSP Anda.'
        : `Pendaftaran sertifikasi Anda${periodPhrase(options.periodName)} telah diterima.`,
      'Silakan aktifkan akun dengan membuat kata sandi melalui tombol berikut. Akun ini digunakan untuk melanjutkan tahapan sertifikasi.',
      `Email untuk masuk: ${recipientEmail}`,
    ],
    button: { label: 'Aktifkan Akun', url: activationUrl },
    footnotes: [
      'Tautan ini bersifat pribadi dan berlaku 24 jam. Jika kedaluwarsa, minta tautan baru melalui "Lupa kata sandi?" di halaman masuk menggunakan email di atas.',
      'Jika Anda tidak merasa melakukan pendaftaran, abaikan email ini.',
    ],
  })
}

/** Lupa Kata Sandi (khusus peserta): tautan atur ulang berlaku 1 jam. */
export async function sendPasswordResetEmail(recipientEmail: string, resetUrl: string): Promise<void> {
  const { appBaseUrl } = getEmailConfig()

  let parsedResetUrl: URL

  try {
    parsedResetUrl = new URL(resetUrl)
  } catch {
    throw new Error('Tautan atur ulang kata sandi tidak valid.')
  }

  if (
    parsedResetUrl.origin !== new URL(appBaseUrl).origin ||
    !parsedResetUrl.pathname.startsWith('/atur-ulang-kata-sandi')
  ) {
    throw new Error('Tautan atur ulang kata sandi tidak sesuai dengan URL aplikasi.')
  }

  await sendSystemEmail(recipientEmail, {
    subject: 'Atur Ulang Kata Sandi Akun Sertifikasi CMSP',
    title: 'Atur Ulang Kata Sandi',
    paragraphs: [
      'Kami menerima permintaan untuk mengatur ulang kata sandi akun Sertifikasi CMSP Anda.',
      'Silakan buat kata sandi baru melalui tombol berikut.',
    ],
    button: { label: 'Atur Ulang Kata Sandi', url: resetUrl },
    footnotes: [
      'Tautan ini bersifat pribadi, hanya dapat dipakai satu kali, dan berlaku 1 jam.',
      'Jika Anda tidak meminta atur ulang kata sandi, abaikan email ini. Kata sandi Anda tidak akan berubah.',
    ],
  })
}

/** Sudah punya akun aktif: tidak ada akun baru, masuk dengan akun yang sama. */
export async function sendApplicationAcceptedEmail(
  recipientEmail: string,
  options: { loginEmail: string, periodName?: string },
): Promise<void> {
  const { appBaseUrl } = getEmailConfig()

  await sendSystemEmail(recipientEmail, {
    subject: 'Pendaftaran Sertifikasi CMSP Diterima',
    title: 'Pendaftaran Diterima',
    paragraphs: [
      `Pendaftaran sertifikasi Anda${periodPhrase(options.periodName)} telah diterima.`,
      `Anda sudah memiliki akun Sertifikasi CMSP. Silakan masuk menggunakan akun yang sama (${options.loginEmail}) dan kata sandi Anda untuk melanjutkan tahapan sertifikasi. Tidak ada akun baru yang dibuat.`,
    ],
    button: { label: 'Masuk ke Sertifikasi CMSP', url: `${appBaseUrl}/login` },
    footnotes: [
      'Jika Anda lupa kata sandi, gunakan tautan "Lupa kata sandi?" di halaman masuk. Jika tetap tidak dapat masuk, hubungi admin melalui menu Butuh Bantuan di aplikasi.',
    ],
  })
}

/**
 * Email pengajuan berbeda dari email akun (kasus 3). Hanya pemberitahuan — sengaja TANPA tautan
 * login/aktivasi dan tanpa menyebut email akun, karena alamat ini belum terverifikasi milik peserta.
 */
export async function sendApplicationAcceptedNoticeEmail(
  recipientEmail: string,
  options: { periodName?: string },
): Promise<void> {
  await sendSystemEmail(recipientEmail, {
    subject: 'Pendaftaran Sertifikasi CMSP Diterima',
    title: 'Pendaftaran Diterima',
    paragraphs: [
      `Pendaftaran sertifikasi Anda${periodPhrase(options.periodName)} telah diterima.`,
      'NIP Anda sudah terdaftar dengan akun Sertifikasi CMSP menggunakan email lain. Informasi masuk atau aktivasi akun telah dikirim ke email akun tersebut.',
    ],
    footnotes: [
      'Jika email akun tersebut sudah tidak dapat Anda akses, hubungi admin melalui menu Butuh Bantuan di aplikasi.',
    ],
  })
}

/**
 * Email login peserta diganti Super Admin (docs/08 K-28).
 * - Ke email BARU: informasi email masuk (tautan aktivasi dikirim terpisah bila akun belum aktif).
 * - Ke email LAMA: pemberitahuan keamanan, tanpa tautan.
 */
export async function sendLoginEmailChangedEmail(
  recipientEmail: string,
  options: { target: 'NEW' | 'OLD', newEmail: string, activationPending: boolean },
): Promise<void> {
  const { appBaseUrl } = getEmailConfig()

  if (options.target === 'OLD') {
    await sendSystemEmail(recipientEmail, {
      subject: 'Email Akun Sertifikasi CMSP Diubah',
      title: 'Email Akun Diubah',
      paragraphs: [
        'Email untuk masuk ke akun Sertifikasi CMSP Anda telah diubah oleh admin. Email ini tidak dapat digunakan lagi untuk masuk.',
      ],
      footnotes: [
        'Jika Anda tidak meminta perubahan ini, segera hubungi admin melalui kontak di aplikasi.',
      ],
    })
    return
  }

  await sendSystemEmail(recipientEmail, {
    subject: 'Email Akun Sertifikasi CMSP Diubah',
    title: 'Email Akun Diubah',
    paragraphs: [
      `Email untuk masuk ke akun Sertifikasi CMSP Anda telah diubah oleh admin menjadi ${options.newEmail}.`,
      options.activationPending
        ? 'Akun Anda belum aktif. Tautan aktivasi dikirim dalam email terpisah.'
        : 'Silakan masuk menggunakan email ini dan kata sandi Anda.',
    ],
    ...(options.activationPending ? {} : { button: { label: 'Masuk ke Sertifikasi CMSP', url: `${appBaseUrl}/login` } }),
    footnotes: [
      'Lupa kata sandi? Gunakan "Lupa kata sandi?" di halaman masuk.',
    ],
  })
}

/** Pendaftaran tidak diterima — isi umum, tanpa catatan Verifikator. */
export async function sendApplicationRejectedEmail(
  recipientEmail: string,
  options: { periodName?: string },
): Promise<void> {
  await sendSystemEmail(recipientEmail, {
    subject: 'Hasil Verifikasi Pendaftaran Sertifikasi CMSP',
    title: 'Hasil Verifikasi Pendaftaran',
    paragraphs: [
      `Terima kasih atas minat Anda mengikuti sertifikasi Coaching dan Mentoring Sektor Publik${periodPhrase(options.periodName)}.`,
      'Setelah melalui proses verifikasi, dengan berat hati kami sampaikan bahwa pendaftaran Anda belum dapat kami terima pada periode ini.',
      'Kami mengapresiasi partisipasi Anda dan berharap dapat bertemu kembali pada periode sertifikasi berikutnya.',
    ],
    footnotes: [
      'Bila ada pertanyaan, silakan hubungi penyelenggara melalui kontak yang tercantum di situs Sertifikasi CMSP.',
    ],
  })
}
