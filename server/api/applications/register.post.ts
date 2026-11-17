import { processRegistration } from '../../services/registration.service'

/**
 * Publik: kirim pendaftaran (langkah 2). Body JSON berisi data pemohon dan
 * `documents` = { diploma, appointment, trainingCertificate, practiceEvidence } → upload_token
 * hasil `POST /api/applications/uploads`.
 */

const REGISTRATION_WINDOW_MS = 60 * 60 * 1000
const REGISTRATION_LIMIT_PER_IP = 10
const TEXT_FIELDS = ['fullName', 'nip', 'institution', 'region', 'email', 'whatsapp', 'education', 'position'] as const

export default defineEventHandler(async (event) => {
  // Endpoint publik: batasi jumlah pendaftaran per IP.
  assertRateLimit(
    `registration:ip:${getClientIp(event)}`,
    REGISTRATION_LIMIT_PER_IP,
    REGISTRATION_WINDOW_MS,
    'Terlalu banyak pengajuan pendaftaran. Silakan coba lagi nanti.',
  )

  const body = await readBody<unknown>(event)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Data pendaftaran tidak ditemukan.' })
  }

  const input = body as Record<string, unknown>
  const text = (name: (typeof TEXT_FIELDS)[number]) => (typeof input[name] === 'string' ? input[name] as string : '')

  const documents: Record<string, string> = {}
  if (input.documents && typeof input.documents === 'object' && !Array.isArray(input.documents)) {
    for (const [key, value] of Object.entries(input.documents as Record<string, unknown>)) {
      if (typeof value === 'string') documents[key] = value
    }
  }

  return await processRegistration({
    fullName: text('fullName'),
    nip: text('nip'),
    institution: text('institution'),
    region: text('region'),
    email: text('email'),
    whatsapp: text('whatsapp'),
    education: text('education'),
    position: text('position'),
    documents,
  })
})
