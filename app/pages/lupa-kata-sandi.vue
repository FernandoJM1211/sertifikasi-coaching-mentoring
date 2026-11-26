<script setup lang="ts">
/** Lupa Kata Sandi — khusus akun peserta (docs/08 K-19). */
definePageMeta({ layout: 'guest' })
useHead({ title: 'Lupa Kata Sandi' })

const route = useRoute()
// Diisi otomatis dari tautan halaman aktivasi (`?email=`).
const email = ref(typeof route.query.email === 'string' ? route.query.email.slice(0, 254) : '')
const isSubmitting = ref(false)
const sentMessage = ref('')
const errorMessage = ref('')

async function submit() {
  if (isSubmitting.value) return

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const response = await $fetch<{ message: string }>('/api/password-reset/request', {
      method: 'POST',
      body: { email: email.value.trim().toLowerCase() },
    })

    sentMessage.value = response.message
  } catch (error: unknown) {
    const data = (error as { data?: { statusMessage?: string, message?: string } }).data
    errorMessage.value = data?.statusMessage || data?.message || 'Permintaan belum dapat diproses. Silakan coba lagi.'
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
          <UIcon name="i-lucide-key-round" class="size-8 text-primary" />
        </div>

        <h1 class="text-3xl font-semibold tracking-tight text-blue-500">
          Lupa kata sandi
        </h1>

        <p class="mt-3 text-sm leading-6 text-slate-600">
          Masukkan email akun peserta Anda. Kami akan mengirim tautan untuk membuat kata sandi baru,
          atau tautan aktivasi baru bila akun belum diaktifkan.
        </p>
      </div>

      <UCard class="ring-1 ring-slate-300 shadow-xl shadow-slate-200/40">
        <div v-if="sentMessage" class="space-y-5">
          <UAlert
            color="success"
            variant="soft"
            icon="i-lucide-mail-check"
            title="Permintaan diterima"
            :description="sentMessage"
          />

          <p class="text-sm leading-6 text-slate-600">
            Belum menerima email setelah beberapa menit? Periksa folder Spam/Promosi dan alamat email
            yang Anda masukkan, lalu kirim ulang. Gunakan email akun, bukan email pendaftaran lain.
          </p>

          <div class="flex flex-col gap-2 sm:flex-row">
            <UButton block color="neutral" variant="outline" @click="sentMessage = ''">
              Kirim Ulang
            </UButton>
            <UButton block to="/login">
              Kembali ke Halaman Masuk
            </UButton>
          </div>
        </div>

        <form v-else class="space-y-5" @submit.prevent="submit">
          <div class="space-y-1.5">
            <label for="email" class="block text-sm font-medium text-slate-700">Email</label>

            <UInput
              id="email"
              v-model="email"
              type="email"
              placeholder="nama@gmail.com"
              icon="i-lucide-mail"
              size="xl"
              autocomplete="email"
              maxlength="254"
              required
              :disabled="isSubmitting"
              class="w-full"
            />
          </div>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />

          <UButton type="submit" block size="xl" :loading="isSubmitting" :disabled="isSubmitting">
            Kirim Tautan
          </UButton>

          <UButton to="/login" block color="neutral" variant="ghost" icon="i-lucide-arrow-left">
            Kembali ke Halaman Masuk
          </UButton>
        </form>
      </UCard>

      <p class="mt-6 text-center text-xs leading-5 text-slate-600">
        Fitur ini khusus akun peserta. Petugas (Verifikator/Asesor) yang lupa kata sandi dapat
        menghubungi Super Admin.
      </p>
    </div>
  </div>
</template>
