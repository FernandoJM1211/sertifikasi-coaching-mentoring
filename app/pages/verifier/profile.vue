
<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <!-- Judul Halaman -->
    <div>
      <p class="text-sm font-semibold text-primary">
        Pengaturan Akun
      </p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        Profil Saya
      </h1>
      <p class="mt-2 text-slate-500">
        Lihat informasi akun dan data pribadi yang tercatat dalam
        Sistem Sertifikasi Coaching dan Mentoring.
      </p>
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12"
    >
      <div class="flex items-center gap-3 text-sm text-slate-500">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin"
        />
        Memuat informasi akun...
      </div>
    </div>

    <!-- Error -->
    <UCard v-else-if="error || !currentUser">
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-circle-alert"
          class="mt-0.5 size-5 text-red-500"
        />
        <div>
          <p class="font-semibold text-slate-900">
            Informasi akun tidak dapat dimuat
          </p>
          <p class="mt-1 text-sm text-slate-500">
            Silakan periksa koneksi atau login kembali.
          </p>
          <UButton class="mt-4" @click="refresh()">
            Muat Ulang
          </UButton>
        </div>
      </div>
    </UCard>

    <template v-else>
      <!-- Ringkasan Profil -->
      <UCard>
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div class="relative shrink-0">
            <UAvatar
              :text="userInitial"
              :alt="currentUser.full_name"
              size="3xl"
              class="ring-4 ring-blue-50"
            />
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-bold text-slate-900">
              {{ currentUser.full_name || 'Nama belum tersedia' }}
            </h2>

            <p class="mt-1 break-all text-sm text-slate-500">
              {{ currentUser.username_email }}
            </p>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <UBadge color="info" variant="subtle">
                {{ roleLabel }}
              </UBadge>

              <UBadge :color="statusColor" variant="subtle">
                {{ statusLabel }}
              </UBadge>
            </div>
          </div>

          <div
            class="flex items-center gap-2 self-start rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 sm:self-center"
          >
            <UIcon name="i-lucide-shield-check" class="size-5" />
            Akun Terdaftar
          </div>
        </div>
      </UCard>

      <!-- Informasi Akun -->
      <UCard>
        <template #header>
          <div class="flex items-start gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50"
            >
              <UIcon
                name="i-lucide-user-round"
                class="size-5 text-primary"
              />
            </div>

            <div>
              <h2 class="font-semibold text-slate-900">
                Informasi Akun
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                Identitas akun yang digunakan dalam sistem.
              </p>
            </div>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            v-for="item in accountDetails"
            :key="item.label"
            class="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4"
          >
            <p class="text-sm text-slate-500">
              {{ item.label }}
            </p>
            <p class="mt-2 break-words text-sm font-semibold text-slate-800">
              {{ item.value || 'Belum diisi' }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Informasi Pribadi dan Pekerjaan -->
      <UCard>
        <template #header>
          <div class="flex items-start gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50"
            >
              <UIcon
                name="i-lucide-contact-round"
                class="size-5 text-indigo-600"
              />
            </div>

            <div>
              <h2 class="font-semibold text-slate-900">
                Informasi Pribadi dan Pekerjaan
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                Informasi identitas, kontak, pendidikan, dan instansi.
              </p>
            </div>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            v-for="item in personalDetails"
            :key="item.label"
            class="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="item.icon"
                class="size-4 shrink-0 text-slate-400"
              />
              <p class="text-sm text-slate-500">
                {{ item.label }}
              </p>
            </div>

            <p class="mt-2 break-words text-sm font-semibold text-slate-800">
              {{ item.value || 'Belum diisi' }}
            </p>
          </div>
        </div>

        <div
          class="mt-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4"
        >
          <UIcon
            name="i-lucide-info"
            class="mt-0.5 size-5 shrink-0 text-blue-600"
          />
          <p class="text-sm leading-6 text-slate-600">
            Informasi yang belum tersedia dapat dilengkapi melalui
            fitur pengelolaan profil setelah fitur tersebut diaktifkan.
          </p>
        </div>
      </UCard>

      <!-- Keamanan Akun -->
      <UCard>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50"
          >
            <UIcon
              name="i-lucide-lock-keyhole"
              class="size-5 text-emerald-600"
            />
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
            @click="goToChangePassword"
          >
            Ganti Kata Sandi
          </UButton>
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'verifier',
})

type AuthenticatedUser = {
  user_id: string
  person_id: string
  full_name: string
  username_email: string
  role: string
  account_status: string
}

type AuthMeResponse = {
  success: boolean
  user: AuthenticatedUser
}

const router = useRouter()

const {
  data: authResponse,
  status,
  error,
  refresh,
} = await useFetch<AuthMeResponse>('/api/auth/me', {
  key: 'authenticated-user',
  credentials: 'include',
})

const currentUser = computed(() => authResponse.value?.user ?? null)

const userInitial = computed(() => {
  return currentUser.value?.full_name?.trim().charAt(0).toUpperCase() || 'U'
})

const roleLabels: Record<string, string> = {
  PARTICIPANT: 'Peserta',
  VERIFIER: 'Verifikator',
  TECHNICAL_ASSESSOR: 'Asesor Teknis',
  PUBLIC_ASSESSOR: 'Asesor Publik',
  SUPER_ADMIN: 'Super Admin',
}

const roleLabel = computed(() => {
  const role = currentUser.value?.role ?? ''
  return roleLabels[role] || role || 'Tidak diketahui'
})

const statusLabels: Record<string, string> = {
  PENDING_ACTIVATION: 'Menunggu Aktivasi',
  ACTIVE: 'Aktif',
  SUSPENDED: 'Ditangguhkan',
  DISABLED: 'Dinonaktifkan',
}

const statusColor = computed(() => {
  const accountStatus = currentUser.value?.account_status

  if (accountStatus === 'ACTIVE') return 'success'
  if (accountStatus === 'SUSPENDED') return 'warning'

  return 'neutral'
})

const statusLabel = computed(() => {
  const accountStatus = currentUser.value?.account_status ?? ''
  return statusLabels[accountStatus] || accountStatus || 'Tidak diketahui'
})

const accountDetails = computed(() => [
  {
    label: 'Nama Lengkap',
    value: currentUser.value?.full_name,
  },
  {
    label: 'Email Akun',
    value: currentUser.value?.username_email,
  },
  {
    label: 'ID Pengguna',
    value: currentUser.value?.user_id,
  },
  {
    label: 'ID Peserta / Pegawai',
    value: currentUser.value?.person_id,
  },
  {
    label: 'Role Pengguna',
    value: roleLabel.value,
  },
  {
    label: 'Status Akun',
    value: statusLabel.value,
  },
])

const personalDetails = computed(() => [
  {
    label: 'Nomor Induk Pegawai (NIP)',
    value: '',
    icon: 'i-lucide-id-card',
  },
  {
    label: 'Email Pribadi / Kontak',
    value: '',
    icon: 'i-lucide-mail',
  },
  {
    label: 'Nomor Telepon',
    value: '',
    icon: 'i-lucide-phone',
  },
  {
    label: 'Nama Instansi',
    value: '',
    icon: 'i-lucide-building-2',
  },
  {
    label: 'Alamat Instansi',
    value: '',
    icon: 'i-lucide-map-pin',
  },
  {
    label: 'Jabatan',
    value: '',
    icon: 'i-lucide-briefcase-business',
  },
  {
    label: 'Pangkat / Golongan',
    value: '',
    icon: 'i-lucide-award',
  },
  {
    label: 'Pendidikan Terakhir',
    value: '',
    icon: 'i-lucide-graduation-cap',
  },
  {
    label: 'Tempat Lahir',
    value: '',
    icon: 'i-lucide-map-pinned',
  },
  {
    label: 'Tanggal Lahir',
    value: '',
    icon: 'i-lucide-calendar-days',
  },
  {
    label: 'Alamat Domisili',
    value: '',
    icon: 'i-lucide-house',
  },
  {
    label: 'Wilayah',
    value: '',
    icon: 'i-lucide-map',
  },
])

function goToChangePassword() {
  router.push('/verifier/change-password')
}
</script>
