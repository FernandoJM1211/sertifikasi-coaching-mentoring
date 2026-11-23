
<script setup lang="ts">
const props = defineProps<{
  /** Halaman profil untuk tombol kembali/batal, mis. "/verifikator/profile". */
  profilePath: string
}>()

const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const isSubmitting = ref(false)
const errorMessage = ref('')

const passwordLengthValid = computed(
  () => newPassword.value.length >= 12,
)

const passwordsMatch = computed(
  () =>
    confirmPassword.value.length > 0 &&
    newPassword.value === confirmPassword.value,
)

const isFormValid = computed(
  () =>
    currentPassword.value.length > 0 &&
    passwordLengthValid.value &&
    newPassword.value !== currentPassword.value &&
    passwordsMatch.value,
)

const passwordLengthMessage = computed(() => {
  if (!newPassword.value) {
    return 'Minimal 12 karakter'
  }

  return passwordLengthValid.value
    ? `${newPassword.value.length}/12 karakter minimum`
    : `${newPassword.value.length}/12 karakter minimum`
})

const passwordMatchMessage = computed(() => {
  if (!confirmPassword.value) {
    return ''
  }

  return passwordsMatch.value
    ? 'Kata sandi cocok.'
    : 'Kata sandi belum cocok.'
})

async function handleSubmit() {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = ''

  if (!currentPassword.value) {
    errorMessage.value = 'Masukkan kata sandi saat ini.'
    return
  }

  if (!passwordLengthValid.value) {
    errorMessage.value =
      'Kata sandi baru minimal 12 karakter.'
    return
  }

  if (newPassword.value === currentPassword.value) {
    errorMessage.value =
      'Kata sandi baru harus berbeda dari kata sandi saat ini.'
    return
  }

  if (!passwordsMatch.value) {
    errorMessage.value =
      'Konfirmasi kata sandi baru belum cocok.'
    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      credentials: 'include',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    })

    // Sesi sudah dicabut oleh backend.
    // Hapus formulir sebelum berpindah halaman.
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''

    // Simpan pesan keberhasilan untuk ditampilkan
    // setelah halaman login selesai dibuka.
    if (import.meta.client) {
      sessionStorage.setItem(
        'cmsp_password_change_success',
        'Kata sandi berhasil diubah. Silakan login kembali menggunakan kata sandi terbaru Anda.',
      )
    }

    clearNuxtData('authenticated-user')
    // Muat ulang penuh agar state & tata letak dashboard tidak terbawa.
    await navigateTo('/login', { replace: true, external: true })
  } catch (error: unknown) {
    const fetchError = error as {
      data?: {
        statusMessage?: string
        message?: string
      }
      statusMessage?: string
      message?: string
    }

    const message =
      fetchError.data?.statusMessage ||
      fetchError.data?.message ||
      fetchError.statusMessage ||
      fetchError.message ||
      'Terjadi kesalahan saat mengubah kata sandi.'

    if (
      message.toLowerCase().includes('sesi') &&
      (
        message.toLowerCase().includes('dicabut') ||
        message.toLowerCase().includes('tidak berlaku')
      )
    ) {
      errorMessage.value =
        'Sesi login sudah tidak berlaku. Silakan login kembali untuk melanjutkan.'
      return
    }

    errorMessage.value = message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight text-blue-500">
          Ganti Kata Sandi
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          Perbarui kata sandi untuk menjaga keamanan akun Anda.
        </p>
      </div>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
        :to="props.profilePath"
        class="shrink-0"
      >
        Kembali
      </UButton>
    </div>

    <UCard class="overflow-hidden">
      <template #header>
        <div class="flex items-start gap-3">
          <div
            class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
          >
            <UIcon
              name="i-lucide-shield-check"
              class="size-6"
            />
          </div>

          <div>
            <h2 class="font-semibold text-slate-900">
              Keamanan Akun
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              Masukkan kata sandi saat ini dan kata sandi baru Anda.
            </p>
          </div>
        </div>
      </template>

      <form
        class="space-y-6"
        @submit.prevent="handleSubmit"
      >
        <div class="space-y-2">
          <label
            for="current-password"
            class="block text-sm font-semibold text-slate-700"
          >
            Kata Sandi Saat Ini
            <span class="text-red-500">*</span>
          </label>

          <UInput
            id="current-password"
            v-model="currentPassword"
            :type="showCurrentPassword ? 'text' : 'password'"
            placeholder="Masukkan kata sandi saat ini"
            autocomplete="current-password"
            size="xl"
            icon="i-lucide-lock-keyhole"
            class="w-full"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="sm"
                :icon="showCurrentPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showCurrentPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="showCurrentPassword = !showCurrentPassword"
              />
            </template>
          </UInput>
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label
              for="new-password"
              class="block text-sm font-semibold text-slate-700"
            >
              Kata Sandi Baru
              <span class="text-red-500">*</span>
            </label>

            <span
              class="text-xs font-medium"
              :class="
                !newPassword
                  ? 'text-slate-500'
                  : passwordLengthValid
                    ? 'text-emerald-600'
                    : 'text-red-600'
              "
            >
              {{ passwordLengthMessage }}
            </span>
          </div>

          <UInput
            id="new-password"
            v-model="newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            placeholder="Buat kata sandi baru"
            autocomplete="new-password"
            size="xl"
            icon="i-lucide-lock"
            class="w-full"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="sm"
                :icon="showNewPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showNewPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="showNewPassword = !showNewPassword"
              />
            </template>
          </UInput>

          <p class="text-xs text-slate-600">
            Gunakan minimal 12 karakter dan hindari penggunaan kata sandi yang sama dengan sebelumnya.
          </p>
        </div>

        <div class="space-y-2">
          <label
            for="confirm-password"
            class="block text-sm font-semibold text-slate-700"
          >
            Konfirmasi Kata Sandi Baru
            <span class="text-red-500">*</span>
          </label>

          <UInput
            id="confirm-password"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Ulangi kata sandi baru"
            autocomplete="new-password"
            size="xl"
            icon="i-lucide-shield-check"
            class="w-full"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="sm"
                :icon="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </UInput>

          <p
            v-if="passwordMatchMessage"
            class="text-xs font-medium"
            :class="
              passwordsMatch
                ? 'text-emerald-600'
                : 'text-red-600'
            "
          >
            {{ passwordMatchMessage }}
          </p>
        </div>

        <div
          v-if="errorMessage"
          role="alert"
          aria-live="polite"
          class="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-red-700"
        >
          <UIcon
            name="i-lucide-circle-alert"
            class="mt-0.5 size-5 shrink-0 text-red-600"
          />

          <div class="space-y-1">
            <p class="text-sm font-semibold">
              {{ errorMessage }}
            </p>

            <p
              v-if="errorMessage.toLowerCase().includes('sesi login')"
              class="text-sm text-red-600"
            >
              Silakan login kembali menggunakan kata sandi terbaru Anda.
            </p>
          </div>
        </div>

        <div
          class="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"
        >
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            :to="props.profilePath"
            :disabled="isSubmitting"
            class="justify-center"
          >
            Batal
          </UButton>

          <UButton
            type="submit"
            color="primary"
            size="lg"
            icon="i-lucide-shield-check"
            :loading="isSubmitting"
            :disabled="!isFormValid || isSubmitting"
            class="justify-center"
          >
            Simpan Kata Sandi
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
