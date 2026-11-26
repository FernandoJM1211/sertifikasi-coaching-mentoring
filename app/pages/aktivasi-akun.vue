<script setup lang="ts">
/**
 * Halaman dari tautan email aktivasi: peserta membuat kata sandi pertama.
 * Status tautan dicek saat halaman dibuka (docs/08 K-28) agar peserta tidak mengisi kata sandi
 * pada tautan yang sudah tidak berlaku, dan tahu email mana yang dipakai untuk masuk.
 */
definePageMeta({ layout: 'guest' })
useHead({ title: 'Aktivasi Akun' })

type LinkStatus = 'VALID' | 'ACTIVE' | 'EXPIRED' | 'UNAVAILABLE' | 'INVALID'

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const checking = ref(true)
const linkStatus = ref<LinkStatus>('INVALID')
const accountEmail = ref('')

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const success = ref(false)
const errorMessage = ref('')

const forgotPasswordLink = computed(() =>
  accountEmail.value ? `/lupa-kata-sandi?email=${encodeURIComponent(accountEmail.value)}` : '/lupa-kata-sandi',
)

async function checkLink() {
  checking.value = true

  if (!token.value) {
    linkStatus.value = 'INVALID'
    checking.value = false
    return
  }

  try {
    const response = await $fetch<{ status: LinkStatus, email: string }>('/api/account-activation', {
      query: { token: token.value },
    })
    linkStatus.value = response.status
    accountEmail.value = response.email
  } catch {
    // Gagal memeriksa (mis. jaringan): tetap tampilkan form; server memeriksa ulang saat dikirim.
    linkStatus.value = 'VALID'
  } finally {
    checking.value = false
  }
}

async function submit() {
  if (isSubmitting.value) return

  errorMessage.value = ''

  if (password.value.length < 12) {
    errorMessage.value = 'Kata sandi minimal 12 karakter.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Kata sandi dan konfirmasi kata sandi tidak sama.'
    return
  }

  isSubmitting.value = true

  try {
    const response = await $fetch<{ email: string }>('/api/account-activation', {
      method: 'POST',
      body: { token: token.value, password: password.value, confirmPassword: confirmPassword.value },
    })

    accountEmail.value = response.email || accountEmail.value
    success.value = true
    password.value = ''
    confirmPassword.value = ''
  } catch (error: unknown) {
    const fetchError = error as { statusCode?: number, data?: { statusMessage?: string, message?: string } }
    const status = fetchError.statusCode

    // Tautan ternyata sudah tidak berlaku/akun sudah aktif: tampilkan keadaan yang sesuai.
    if (status === 409 || status === 410) {
      await checkLink()
      if (linkStatus.value !== 'VALID') return
    }

    errorMessage.value = fetchError.data?.statusMessage || fetchError.data?.message || 'Aktivasi akun gagal. Silakan coba lagi.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(checkLink)
</script>

<template>
  <div class="flex min-h-[65vh] items-center justify-center">
    <div class="w-full max-w-md">
      <div class="mb-7 text-center">
        <div class="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-blue-50 ring-1 ring-blue-200">
          <UIcon name="i-lucide-user-round-check" class="size-8 text-primary" />
        </div>

        <h1 class="text-3xl font-semibold tracking-tight text-blue-500">
          Aktivasi akun
        </h1>

        <p class="mt-3 text-sm leading-6 text-slate-600">
          Buat kata sandi untuk akun Sertifikasi CMSP Anda.
        </p>
      </div>

      <UCard class="ring-1 ring-slate-300 shadow-xl shadow-slate-200/40">
        <div v-if="checking" class="flex items-center justify-center py-8 text-sm text-slate-600">
          <UIcon name="i-lucide-loader-circle" class="mr-2 size-5 animate-spin text-primary" />
          Memeriksa tautan...
        </div>

        <!-- Berhasil -->
        <div v-else-if="success" class="space-y-5">
          <UAlert
            color="success"
            variant="soft"
            icon="i-lucide-circle-check"
            title="Akun berhasil diaktifkan"
            :description="accountEmail ? `Masuk dengan email ${accountEmail} dan kata sandi baru.` : 'Silakan masuk dengan kata sandi baru.'"
          />
          <UButton block size="xl" to="/login">Masuk</UButton>
        </div>

        <!-- Akun sudah aktif -->
        <div v-else-if="linkStatus === 'ACTIVE'" class="space-y-5">
          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-badge-check"
            title="Akun sudah aktif"
            :description="accountEmail ? `Silakan masuk dengan email ${accountEmail}.` : 'Silakan masuk dengan akun Anda.'"
          />
          <div class="flex flex-col gap-2 sm:flex-row">
            <UButton block size="xl" to="/login">Masuk</UButton>
            <UButton block size="xl" color="neutral" variant="outline" :to="forgotPasswordLink">Lupa Sandi</UButton>
          </div>
        </div>

        <!-- Tautan kedaluwarsa/dicabut, akun belum aktif -->
        <div v-else-if="linkStatus === 'EXPIRED'" class="space-y-5">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-clock-alert"
            title="Tautan sudah tidak berlaku"
            :description="accountEmail
              ? `Minta tautan aktivasi baru dengan email ${accountEmail} lewat halaman Lupa Kata Sandi.`
              : 'Minta tautan aktivasi baru lewat halaman Lupa Kata Sandi.'"
          />
          <UButton block size="xl" :to="forgotPasswordLink">Minta Tautan</UButton>
        </div>

        <!-- Akun nonaktif -->
        <div v-else-if="linkStatus === 'UNAVAILABLE'" class="space-y-5">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="Akun tidak dapat diaktifkan"
            description="Hubungi admin melalui kontak di bagian bawah halaman."
          />
          <UButton block size="xl" color="neutral" variant="outline" to="/login">Kembali</UButton>
        </div>

        <!-- Tautan tidak dikenal -->
        <div v-else-if="linkStatus === 'INVALID'" class="space-y-5">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="Tautan tidak valid"
            description="Gunakan tautan dari email aktivasi terbaru, atau minta tautan baru lewat halaman Lupa Kata Sandi."
          />
          <UButton block size="xl" to="/lupa-kata-sandi">Minta Tautan</UButton>
        </div>

        <form v-else class="space-y-5" @submit.prevent="submit">
          <div v-if="accountEmail" class="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm">
            <p class="text-slate-600">Email untuk masuk</p>
            <p class="mt-0.5 break-all font-medium text-slate-900">{{ accountEmail }}</p>
          </div>

          <div class="space-y-1.5">
            <label for="password" class="block text-sm font-medium text-slate-700">Kata sandi</label>

            <UInput
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Minimal 12 karakter"
              icon="i-lucide-lock-keyhole"
              size="xl"
              autocomplete="new-password"
              maxlength="128"
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
                  :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </div>

          <div class="space-y-1.5">
            <label for="confirmPassword" class="block text-sm font-medium text-slate-700">Konfirmasi kata sandi</label>

            <UInput
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Masukkan kembali kata sandi"
              icon="i-lucide-lock-keyhole"
              size="xl"
              autocomplete="new-password"
              maxlength="128"
              required
              :disabled="isSubmitting"
              class="w-full"
            />
          </div>

          <p class="text-xs text-slate-600">
            Gunakan minimal 12 karakter dan jangan membagikannya kepada orang lain.
          </p>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />

          <UButton type="submit" block size="xl" :loading="isSubmitting" :disabled="isSubmitting">
            Aktifkan Akun
          </UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
