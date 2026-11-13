
import nodemailer from 'nodemailer'

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

export async function sendAccountActivationEmail(
  recipientEmail: string,
  activationUrl: string,
): Promise<void> {
  const { gmailUser, appBaseUrl } = getEmailConfig()

  let parsedActivationUrl: URL

  try {
    parsedActivationUrl = new URL(activationUrl)
  } catch {
    throw new Error('Tautan aktivasi tidak valid.')
  }

  const configuredBaseUrl = new URL(appBaseUrl)

  if (
    parsedActivationUrl.origin !== configuredBaseUrl.origin ||
    !parsedActivationUrl.pathname.startsWith('/aktivasi-akun')
  ) {
    throw new Error('Tautan aktivasi tidak sesuai dengan URL aplikasi.')
  }

  const normalizedRecipient = recipientEmail.trim().toLowerCase()

  if (
    !normalizedRecipient ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRecipient)
  ) {
    throw new Error('Alamat email penerima tidak valid.')
  }

  const transporter = createEmailTransporter()

  await transporter.sendMail({
    from: `"CMSP - Sertifikasi Coaching dan Mentoring" <${gmailUser}>`,
    to: normalizedRecipient,
    subject: 'Aktivasi Akun CMSP',
    text: [
      'Halo,',
      '',
      'Pendaftaran sertifikasi Anda telah diterima. Silakan aktifkan akun CMSP melalui tautan berikut:',
      '',
      activationUrl,
      '',
      'Tautan ini bersifat pribadi dan hanya dapat digunakan sesuai masa berlakunya.',
      'Jika Anda tidak merasa melakukan pendaftaran, abaikan email ini.',
      '',
      'Salam,',
      'Tim CMSP',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: auto;">
        <h2>Aktivasi Akun CMSP</h2>
        <p>Halo,</p>
        <p>
          Pendaftaran sertifikasi Anda telah diterima.
          Silakan klik tombol berikut untuk mengaktifkan akun CMSP.
        </p>
        <p style="margin: 28px 0;">
          <a
            href="${activationUrl}"
            style="display: inline-block; padding: 12px 22px; background: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px;"
          >
            Aktifkan Akun
          </a>
        </p>
        <p>
          Tautan ini bersifat pribadi dan hanya dapat digunakan sesuai masa berlakunya.
          Jika Anda tidak merasa melakukan pendaftaran, abaikan email ini.
        </p>
        <p>Salam,<br />Tim CMSP</p>
      </div>
    `,
  })
}
