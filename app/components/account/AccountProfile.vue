<script setup lang="ts">
import { GENDER_OPTIONS, PROFILE_FIELD_MAX_LENGTH } from '~~/shared/utils/person'

const props = defineProps<{
  /** Halaman ganti kata sandi, mis. "/peserta/change-password". */
  changePasswordPath: string
}>()

type ProfileData = {
  full_name: string
  nip: string
  email: string
  gender: string
  birth_place: string
  birth_date: string
  institution_name: string
  phone_number: string
}

type ProfileResponse = {
  success: boolean
  data: {
    account: { full_name: string, email: string, role: string }
    profile: ProfileData | null
  }
}

const toast = useToast()
const genderItems: string[] = [...GENDER_OPTIONS]

const { data, status, error, refresh } = await useFetch<ProfileResponse>(
  '/api/profile',
  { key: 'my-profile', credentials: 'include' },
)

const account = computed(() => data.value?.data.account ?? null)
const profile = computed(() => data.value?.data.profile ?? null)

/** Akun peserta punya data diri lengkap; akun pegawai hanya nama & email. */
const hasPersonProfile = computed(() => profile.value !== null)

const form = reactive({
  full_name: '',
  gender: '',
  birth_place: '',
  birth_date: '',
  institution_name: '',
  phone_number: '',
})

function resetForm() {
  form.full_name = profile.value?.full_name || account.value?.full_name || ''
  form.gender = profile.value?.gender || ''
  form.birth_place = profile.value?.birth_place || ''
  form.birth_date = profile.value?.birth_date || ''
  form.institution_name = profile.value?.institution_name || ''
  form.phone_number = profile.value?.phone_number || ''
}

watch(data, resetForm, { immediate: true })

const displayName = computed(() =>
  profile.value?.full_name || account.value?.full_name || 'Pengguna',
)

const displayEmail = computed(() =>
  account.value?.email || profile.value?.email || '',
)

const userInitial = computed(() =>
  displayName.value.trim().charAt(0).toUpperCase() || 'U',
)

const isDirty = computed(() => {
  if (!hasPersonProfile.value) {
    return form.full_name.trim() !== (account.value?.full_name ?? '')
  }

  const current = profile.value!

  return (
    form.full_name.trim() !== current.full_name ||
    form.gender !== current.gender ||
    form.birth_place.trim() !== current.birth_place ||
    form.birth_date !== current.birth_date ||
    form.institution_name.trim() !== current.institution_name ||
    form.phone_number.trim() !== current.phone_number
  )
})

const completion = computed(() => {
  if (!hasPersonProfile.value) return null

  const values = [
    form.full_name,
    profile.value?.nip,
    displayEmail.value,
    form.gender,
    form.birth_place,
    form.birth_date,
    form.institution_name,
    form.phone_number,
  ]

  return {
    filled: values.filter((value) => String(value ?? '').trim()).length,
    total: values.length,
  }
})

const fieldErrors = computed(() => {
  const errors: Record<string, string> = {}

  if (!form.full_name.trim()) {
    errors.full_name = 'Nama lengkap wajib diisi.'
  }

  const phone = form.phone_number.replace(/[\s()-]/g, '')

  if (phone && !/^\+?\d{8,15}$/.test(phone)) {
    errors.phone_number = 'Nomor telepon harus berupa 8–15 digit angka.'
  }

  if (form.birth_date && form.birth_date > new Date().toISOString().slice(0, 10)) {
    errors.birth_date = 'Tanggal lahir tidak boleh di masa depan.'
  }

  return errors
})

const today = new Date().toISOString().slice(0, 10)

/** Field terkunci (NIP/Email) yang sedang difokus, untuk menampilkan pesan. */
const lockedFocus = ref<'nip' | 'email' | null>(null)
const lockedInputClass = 'bg-slate-50 text-slate-500 cursor-not-allowed'
const isSaving = ref(false)

async function saveProfile() {
  if (isSaving.value || Object.keys(fieldErrors.value).length > 0) return

  isSaving.value = true

  try {
    const body = hasPersonProfile.value
      ? { ...form }
      : { full_name: form.full_name }

    const response = await $fetch<ProfileResponse>('/api/profile', {
      method: 'PATCH',
      credentials: 'include',
      body,
    })

    data.value = response
    // Perbarui nama di sidebar.
    await refreshNuxtData('authenticated-user')

    toast.add({
      title: 'Profil tersimpan',
      description: 'Perubahan data profil berhasil disimpan.',
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  } catch (saveError: unknown) {
    const errorData = (saveError as { data?: { statusMessage?: string } }).data

    toast.add({
      title: 'Gagal menyimpan profil',
      description: errorData?.statusMessage || 'Terjadi kesalahan. Silakan coba lagi.',
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <!-- Judul Halaman -->
    <div>
      <p class="text-sm font-medium text-primary">
        Pengaturan Akun
      </p>
      <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Profil Saya
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Lihat dan perbarui data diri Anda. Data ini juga dipakai untuk mengisi
        formulir sertifikasi secara otomatis.
      </p>
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'pending' && !data"
      class="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12"
    >
      <div class="flex items-center gap-3 text-sm text-slate-500">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        Memuat profil...
      </div>
    </div>

    <!-- Error -->
    <UCard v-else-if="error || !account" class="ring-1 ring-slate-200/70 shadow-sm">
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-circle-alert" class="mt-0.5 size-5 text-red-500" />
        <div>
          <p class="font-semibold text-slate-900">
            Profil tidak dapat dimuat
          </p>
          <p class="mt-1 text-sm text-slate-500">
            Silakan periksa koneksi atau login kembali.
          </p>
          <UButton class="mt-4" icon="i-lucide-refresh-cw" @click="refresh()">
            Muat Ulang
          </UButton>
        </div>
      </div>
    </UCard>

    <template v-else>
      <!-- Ringkasan -->
      <UCard class="ring-1 ring-slate-200/70 shadow-sm">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UAvatar
            :text="userInitial"
            :alt="displayName"
            size="3xl"
            class="shrink-0 ring-4 ring-blue-50"
          />

          <div class="min-w-0 flex-1">
            <h2 class="truncate text-xl font-bold text-slate-900">
              {{ displayName }}
            </h2>
            <p class="mt-1 break-all text-sm text-slate-500">
              {{ displayEmail }}
            </p>
          </div>

          <div v-if="completion" class="shrink-0 sm:text-right">
            <p class="text-xs text-slate-500">
              Kelengkapan profil
            </p>
            <p class="mt-1 text-sm font-semibold text-slate-900">
              {{ completion.filled }} dari {{ completion.total }} data terisi
            </p>
          </div>
        </div>
      </UCard>

      <!-- Data Diri -->
      <UCard class="ring-1 ring-slate-200/70 shadow-sm">
        <template #header>
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <UIcon name="i-lucide-user-round" class="size-5 text-primary" />
            </div>
            <div>
              <h2 class="font-semibold text-slate-900">
                Data Diri
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                <template v-if="hasPersonProfile">
                  Tidak semua data wajib diisi sekarang. Lengkapi sebelum mengisi formulir sertifikasi.
                </template>
                <template v-else>
                  Informasi akun yang digunakan dalam sistem.
                </template>
              </p>
            </div>
          </div>
        </template>

        <form class="space-y-6" @submit.prevent="saveProfile">
          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <UFormField label="Nama Lengkap" required :error="fieldErrors.full_name">
              <UInput
                v-model="form.full_name"
                :maxlength="PROFILE_FIELD_MAX_LENGTH.full_name"
                placeholder="Masukkan nama lengkap"
                autocomplete="name"
                class="w-full"
              />
            </UFormField>

            <UFormField v-if="hasPersonProfile" label="Jenis Kelamin">
              <USelect
                v-model="form.gender"
                :items="genderItems"
                placeholder="Pilih jenis kelamin"
                class="w-full"
              />
            </UFormField>

            <!-- Field terkunci: pesan hanya tampil saat field sedang dipilih. -->
            <UFormField
              label="Email"
              :error="lockedFocus === 'email' ? 'Email login tidak dapat diubah. Hubungi Super Admin untuk mengubahnya.' : undefined"
            >
              <UInput
                :model-value="displayEmail"
                readonly
                :ui="{ base: lockedInputClass }"
                class="w-full"
                @focus="lockedFocus = 'email'"
                @blur="lockedFocus = null"
              />
            </UFormField>

            <UFormField
              v-if="hasPersonProfile"
              label="NIP"
              :error="lockedFocus === 'nip' ? 'NIP tidak dapat diubah.' : undefined"
            >
              <UInput
                :model-value="profile?.nip || '-'"
                readonly
                :ui="{ base: lockedInputClass }"
                class="w-full"
                @focus="lockedFocus = 'nip'"
                @blur="lockedFocus = null"
              />
            </UFormField>

            <template v-if="hasPersonProfile">
              <UFormField label="Tempat Lahir">
                <UInput
                  v-model="form.birth_place"
                  :maxlength="PROFILE_FIELD_MAX_LENGTH.birth_place"
                  placeholder="Contoh: Jakarta"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Tanggal Lahir" :error="fieldErrors.birth_date">
                <UInput
                  v-model="form.birth_date"
                  type="date"
                  :max="today"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Instansi">
                <UInput
                  v-model="form.institution_name"
                  :maxlength="PROFILE_FIELD_MAX_LENGTH.institution_name"
                  placeholder="Nama instansi"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Nomor Telepon" :error="fieldErrors.phone_number">
                <UInput
                  v-model="form.phone_number"
                  type="tel"
                  inputmode="tel"
                  :maxlength="20"
                  placeholder="Contoh: 081234567890"
                  autocomplete="tel"
                  class="w-full"
                />
              </UFormField>
            </template>
          </div>

          <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="!isDirty || isSaving"
              class="justify-center"
              @click="resetForm"
            >
              Batalkan Perubahan
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-save"
              :loading="isSaving"
              :disabled="!isDirty || isSaving || Object.keys(fieldErrors).length > 0"
              class="justify-center"
            >
              Simpan Profil
            </UButton>
          </div>
        </form>
      </UCard>

      <!-- Keamanan Akun -->
      <UCard class="ring-1 ring-slate-200/70 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <UIcon name="i-lucide-lock-keyhole" class="size-5 text-emerald-600" />
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-slate-900">
              Keamanan Akun
            </h2>
            <p class="mt-1 text-sm leading-6 text-slate-500">
              Jaga kerahasiaan kata sandi untuk melindungi akun Anda.
            </p>
          </div>

          <UButton
            color="primary"
            variant="outline"
            icon="i-lucide-key-round"
            :to="props.changePasswordPath"
          >
            Ganti Kata Sandi
          </UButton>
        </div>
      </UCard>
    </template>
  </div>
</template>
