<script setup lang="ts">
definePageMeta({
  layout: 'guest',
})

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const passwordChangeSuccessMessage = ref('')

const toast = useToast()

onMounted(() => {
  passwordChangeSuccessMessage.value =
    sessionStorage.getItem('cmsp_password_change_success') || ''

  if (passwordChangeSuccessMessage.value) {
    sessionStorage.removeItem('cmsp_password_change_success')
  }
})

async function handleLogin() {
  if (isSubmitting.value) return

  const normalizedEmail = email.value.trim().toLowerCase()

  if (!normalizedEmail || !password.value) {
    toast.add({
      title: 'Data belum lengkap',
      description: 'Masukkan email dan kata sandi untuk melanjutkan.',
      color: 'warning',
      icon: 'i-lucide-circle-alert',
    })
    return
  }

  isSubmitting.value = true

  try {
    const response = await $fetch<{
      user: {
        role: string
      }
      expiresAt?: string
    }>('/api/auth/login', {
      method: 'POST',
      body: {
        email: normalizedEmail,
        password: password.value,
      },
    })

    toast.add({
      title: 'Login berhasil',
      description:
        'Selamat datang di Sistem Sertifikasi Coaching dan Mentoring.',
      color: 'success',
      icon: 'i-lucide-circle-check',
    })

    clearNuxtData('authenticated-user')

    const role = normalizeUserRole(response.user.role)
    await navigateTo((role && ROLE_HOME_PATHS[role]) || '/')
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'data' in error
        ? (
            error as {
              data?: {
                statusMessage?: string
                message?: string
              }
            }
          ).data
        : undefined

    toast.add({
      title: 'Login gagal',
      description:
        message?.statusMessage ||
        message?.message ||
        'Email atau kata sandi tidak sesuai, atau akun belum dapat digunakan.',
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[65vh] items-center justify-center py-8">
    <div class="w-full max-w-md">
      <div class="mb-7 text-center">
        <div
          class="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-lg shadow-blue-200/60"
        >
          CM
        </div>

        <p class="mb-2 text-sm font-medium text-primary">
          Selamat datang kembali
        </p>

        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
          Masuk ke akun Anda
        </h1>

        <p class="mt-3 text-sm leading-6 text-slate-500">
          Masuk untuk melanjutkan proses Sertifikasi Coaching dan Mentoring
          Sektor Publik.
        </p>
      </div>

      <div
        v-if="passwordChangeSuccessMessage"
        role="status"
        aria-live="polite"
        class="mb-5 flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-emerald-800"
      >
        <UIcon
          name="i-lucide-circle-check"
          class="mt-0.5 size-5 shrink-0 text-emerald-600"
        />

        <div>
          <p class="text-sm font-semibold">
            Kata sandi berhasil diubah.
          </p>

          <p class="mt-1 text-sm leading-5 text-emerald-700">
            Silakan login kembali menggunakan kata sandi terbaru Anda.
          </p>
        </div>
      </div>

      <UCard class="ring-1 ring-slate-200/70 shadow-xl shadow-slate-200/40">
        <form class="space-y-5" @submit.prevent="handleLogin">
          <div class="space-y-1.5">
            <label
              for="email"
              class="block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <UInput
              id="email"
              v-model="email"
              type="email"
              placeholder="nama@email.go.id"
              icon="i-lucide-mail"
              size="xl"
              autocomplete="username"
              required
              :disabled="isSubmitting"
              class="w-full"
            />
          </div>

          <div class="space-y-1.5">
            <label
              for="password"
              class="block text-sm font-medium text-slate-700"
            >
              Kata sandi
            </label>

            <UInput
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Masukkan kata sandi"
              icon="i-lucide-lock-keyhole"
              size="xl"
              autocomplete="current-password"
              required
              :disabled="isSubmitting"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="
                    showPassword
                      ? 'Sembunyikan kata sandi'
                      : 'Tampilkan kata sandi'
                  "
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </div>

          <UButton
            type="submit"
            block
            size="xl"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            trailing-icon="i-lucide-arrow-right"
          >
            Masuk
          </UButton>

          <div class="relative py-1">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200" />
            </div>

            <div class="relative flex justify-center">
              <span class="bg-white px-3 text-xs text-slate-400">
                Belum memiliki akun?
              </span>
            </div>
          </div>

          <UButton
            to="/pendaftaran"
            block
            color="neutral"
            variant="outline"
            size="lg"
          >
            Daftar sebagai peserta
          </UButton>
        </form>
      </UCard>

      <p class="mt-6 text-center text-xs leading-5 text-slate-500">
        Dengan masuk, Anda dapat mengakses layanan sesuai dengan peran dan
        status akun Anda.
      </p>
    </div>
  </div>
</template>
