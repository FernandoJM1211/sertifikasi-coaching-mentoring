
export default defineNuxtRouteMiddleware(async (to) => {
  // Halaman yang memerlukan autentikasi beserta role yang diizinkan.
  const protectedRoutes: {
    prefix: string
    roles: string[]
  }[] = [
    {
      prefix: '/verifier',
      roles: ['VERIFIER', 'SUPER_ADMIN'],
    },
    {
      prefix: '/super-admin',
      roles: ['SUPER_ADMIN'],
    },
  ]

  // Cari aturan akses berdasarkan prefix halaman.
  const matchedRoute = protectedRoutes.find(
    (route) =>
      to.path === route.prefix ||
      to.path.startsWith(`${route.prefix}/`),
  )

  // Halaman publik tidak memerlukan pemeriksaan middleware ini.
  if (!matchedRoute) {
    return
  }

  try {
    const requestFetch = useRequestFetch()

    const response = await requestFetch<{
      success: boolean
      user: {
        role: string
        account_status: string
      }
    }>('/api/auth/me')

    const user = response.user

    const isAuthenticated = user.account_status === 'ACTIVE'
    const hasAllowedRole = matchedRoute.roles.includes(user.role)

    if (!isAuthenticated || !hasAllowedRole) {
      return navigateTo('/login', {
        replace: true,
      })
    }
  } catch {
    // Sesi tidak tersedia atau tidak valid.
    return navigateTo('/login', {
      replace: true,
    })
  }
})
