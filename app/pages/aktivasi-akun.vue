
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()

const token = computed(() => {
  return typeof route.query.token === 'string'
    ? route.query.token
    : ''
})

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const success = ref(false)
const errorMessage = ref('')

async function activateAccount() {
  errorMessage.value = ''

  if (!token.value) {
    errorMessage.value =
      'Token aktivasi tidak ditemukan. Silakan gunakan tautan dari email aktivasi.'
    return
  }

  if (password.value.length < 12) {
    errorMessage.value =
      'Kata sandi harus terdiri dari minimal 12 karakter.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value =
      'Kata sandi dan konfirmasi kata sandi tidak sama.'
    return
  }

  loading.value = true

  try {
    await $fetch('/api/account-activation', {
      method: 'POST',
      body: {
        token: token.value,
        password: password.value,
        confirmPassword: confirmPassword.value,
      },
    })

    success.value = true
    password.value = ''
    confirmPassword.value = ''
  } catch (error: unknown) {
    const response = error as {
      data?: {
        statusMessage?: string
        message?: string
      }
    }

    errorMessage.value =
      response.data?.statusMessage ||
      response.data?.message ||
      'Aktivasi akun gagal. Silakan coba kembali.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main
    class="flex min-h-[65vh] items-center justify-center px-4 py-10"
  >
    <section
      class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
    >
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold text-blue-500">
          Aktivasi Akun CMSP
        </h1>

        <p class="mt-2 text-sm text-slate-600">
          Buat kata sandi untuk mulai menggunakan akun sertifikasi coaching
          dan mentoring.
        </p>
      </div>

      <div
        v-if="success"
        class="rounded-xl border border-green-200 bg-green-50 p-5 text-center"
      >
        <h2 class="font-semibold text-green-800">
          Aktivasi Berhasil
        </h2>

        <p class="mt-2 text-sm text-green-700">
          Akun kamu sudah aktif. Silakan masuk menggunakan email dan kata
          sandi yang baru dibuat.
        </p>

        <NuxtLink
          to="/login"
          class="mt-5 inline-flex w-full justify-center rounded-lg bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800"
        >
          Masuk ke CMSP
        </NuxtLink>
      </div>

      <form v-else class="space-y-5" @submit.prevent="activateAccount">
        <div>
          <label
            for="password"
            class="mb-2 block text-sm font-medium text-slate-700"
          >
            Kata Sandi Baru
          </label>

          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="12"
            required
            placeholder="Minimal 12 karakter"
            class="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            for="confirmPassword"
            class="mb-2 block text-sm font-medium text-slate-700"
          >
            Konfirmasi Kata Sandi
          </label>

          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            minlength="12"
            required
            placeholder="Masukkan kembali kata sandi"
            class="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <p class="text-xs text-slate-600">
          Gunakan kata sandi minimal 12 karakter dan jangan membagikannya
          kepada orang lain.
        </p>

        <div
          v-if="errorMessage"
          role="alert"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Memproses Aktivasi...' : 'Aktifkan Akun' }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-slate-500">
        Sistem Sertifikasi Coaching dan Mentoring (CMSP)
      </p>
    </section>
  </main>
</template>
