<script setup lang="ts">
/** Halaman dari tautan email Lupa Kata Sandi: buat kata sandi baru (khusus peserta). */
definePageMeta({ layout: 'guest' })
useHead({ title: 'Atur Ulang Kata Sandi' })

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const success = ref(false)
const errorMessage = ref('')

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
    await $fetch('/api/password-reset/confirm', {
      method: 'POST',
      body: { token: token.value, password: password.value, confirmPassword: confirmPassword.value },
    })

    success.value = true
    password.value = ''
    confirmPassword.value = ''
  } catch (error: unknown) {
    const data = (error as { data?: { statusMessage?: string, message?: string } }).data
    errorMessage.value = data?.statusMessage || data?.message || 'Kata sandi belum dapat diatur ulang. Silakan coba lagi.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[65vh] items-center justify-center">
    <div class="w-full max-w-md">
      <div class="mb-7 text-center">
        <div class="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-blue-50 ring-1 ring-blue-200">
          <UIcon name="i-lucide-lock-keyhole" class="size-8 text-primary" />
        </div>

        <h1 class="text-3xl font-semibold tracking-tight text-blue-500">
          Atur ulang kata sandi
        </h1>

        <p class="mt-3 text-sm leading-6 text-slate-600">
          Buat kata sandi baru untuk akun Sertifikasi CMSP Anda.
        </p>
      </div>

      <UCard class="ring-1 ring-slate-300 shadow-xl shadow-slate-200/40">
        <!-- Berhasil -->
        <div v-if="success" class="space-y-5">
          <UAlert
            color="success"
            variant="soft"
            icon="i-lucide-circle-check"
            title="Kata sandi berhasil diatur ulang"
            description="Anda telah dikeluarkan dari semua perangkat. Silakan masuk dengan kata sandi baru."
          />
          <UButton block size="xl" to="/login">Masuk</UButton>
        </div>

        <!-- Tautan tidak lengkap -->
        <div v-else-if="!token" class="space-y-5">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="Tautan tidak valid"
            description="Gunakan tautan dari email atur ulang kata sandi, atau minta tautan baru."
          />
          <UButton block to="/lupa-kata-sandi">Minta Tautan Baru</UButton>
        </div>

        <form v-else class="space-y-5" @submit.prevent="submit">
          <div class="space-y-1.5">
            <label for="password" class="block text-sm font-medium text-slate-700">Kata sandi baru</label>

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
          >
            <template #actions>
              <UButton size="xs" color="error" variant="outline" to="/lupa-kata-sandi">Minta Tautan Baru</UButton>
            </template>
          </UAlert>

          <UButton type="submit" block size="xl" :loading="isSubmitting" :disabled="isSubmitting">
            Simpan Kata Sandi Baru
          </UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
