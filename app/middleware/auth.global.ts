import type { UserRole } from '~~/shared/utils/roles'

/**
 * Halaman yang memerlukan login beserta role yang diizinkan.
 *
 * Catatan: ini hanya untuk pengalaman pengguna (redirect).
 * Otorisasi sesungguhnya tetap ditegakkan di setiap endpoint API.
 */
const PROTECTED_ROUTES: { prefix: string, roles: UserRole[] }[] = [
  { prefix: '/super-admin', roles: ['SUPER_ADMIN'] },
  { prefix: '/verifikator', roles: ['VERIFIKATOR', 'SUPER_ADMIN'] },
  { prefix: '/peserta', roles: ['PESERTA'] },
]

export default defineNuxtRouteMiddleware(async (to) => {
  const matchedRoute = PROTECTED_ROUTES.find(
    (route) =>
      to.path === route.prefix ||
      to.path.startsWith(`${route.prefix}/`),
  )

  // Halaman publik tidak memerlukan pemeriksaan.
  if (!matchedRoute) return

  let role: UserRole | ''

  try {
    const response = await useRequestFetch()<{
      user: { role: string, account_status: string }
    }>('/api/auth/me')

    if (response.user.account_status !== 'ACTIVE') {
      return navigateTo('/login', { replace: true, external: true })
    }

    role = normalizeUserRole(response.user.role)
  } catch {
    // Sesi tidak tersedia atau tidak valid.
    return navigateTo('/login', { replace: true, external: true })
  }

  if (!role || !matchedRoute.roles.includes(role)) {
    // Sudah login tetapi role tidak sesuai: arahkan ke halaman miliknya.
    return navigateTo(
      (role && ROLE_HOME_PATHS[role]) || '/login',
      { replace: true },
    )
  }
})
