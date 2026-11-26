import { getActivationLinkStatus } from '../services/account-activation.service'

/**
 * Status tautan aktivasi untuk halaman /aktivasi-akun (publik, tanpa login).
 * Token berasal dari tautan email; tanpa token yang benar tidak ada data akun yang dikembalikan.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = typeof query.token === 'string' ? query.token.trim() : ''

  if (!token || token.length > 200) {
    return { status: 'INVALID', email: '' }
  }

  assertRateLimit(
    `activation-status:ip:${getClientIp(event)}`,
    60,
    15 * 60 * 1000,
  )

  return await getActivationLinkStatus(token)
})
