export type AuthUser = {
  user_id: string
  person_id: string
  full_name: string
  username_email: string
  role: string
  account_status: string
}

type AuthMeResponse = {
  success: boolean
  user: AuthUser
}

/**
 * Data pengguna yang sedang login (dari /api/auth/me).
 * Memakai key yang sama sehingga layout dan halaman berbagi satu request.
 */
export async function useAuthUser() {
  const { data, status, error, refresh } = await useFetch<AuthMeResponse>(
    '/api/auth/me',
    {
      key: 'authenticated-user',
      credentials: 'include',
    },
  )

  const user = computed(() => data.value?.user ?? null)

  return { user, status, error, refresh }
}

/** Keluar dari aplikasi lalu kembali ke halaman login. */
export async function logout() {
  await $fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })

  clearNuxtData('authenticated-user')
  await navigateTo('/login', { replace: true })
}
