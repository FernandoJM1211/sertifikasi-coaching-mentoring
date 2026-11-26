
<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-primary">
          Pengaturan Akun
        </p>

        <h1 class="mt-2 text-3xl font-bold tracking-tight text-blue-500">
          Profil Akun Staf
        </h1>

        <p class="mt-2 text-slate-600">
          Informasi akun dan status akses pengguna dalam sistem sertifikasi.
        </p>
      </div>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
        class="shrink-0"
        @click="goBack"
      >
        Kembali
      </UButton>
    </div>

    <!-- Loading -->
    <UCard v-if="status === 'pending'">
      <div class="flex items-center justify-center gap-3 py-12 text-sm text-slate-600">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin"
        />
        Memuat informasi akun...
      </div>
    </UCard>

    <!-- Error -->
    <UCard v-else-if="error || !account">
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-circle-alert"
          class="mt-0.5 size-5 text-red-500"
        />

        <div>
          <p class="font-semibold text-slate-900">
            Informasi akun tidak dapat dimuat
          </p>

          <p class="mt-1 text-sm text-slate-600">
            Akun mungkin tidak ditemukan atau terjadi kendala saat mengambil data.
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <UButton @click="refresh()">
              Muat Ulang
            </UButton>

            <UButton
              color="neutral"
              variant="outline"
              @click="goBack"
            >
              Kembali
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <template v-else>
      <!-- Ringkasan profil -->
      <UCard>
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UAvatar
            :text="userInitial"
            :alt="account.full_name"
            size="3xl"
            class="ring-4 ring-blue-50"
          />

          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-bold text-slate-900">
              {{ account.full_name || 'Nama belum tersedia' }}
            </h2>

            <p class="mt-1 break-all text-sm text-slate-600">
              {{ account.username_email }}
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

          <div class="flex items-center gap-2 self-start rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 sm:self-center">
            <UIcon name="i-lucide-shield-check" class="size-5" />
            Detail Akun
          </div>
        </div>
      </UCard>

      <!-- Informasi akun -->
      <UCard>
        <template #header>
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-300 bg-blue-50">
              <UIcon
                name="i-lucide-user-round"
                class="size-5 text-primary"
              />
            </div>

            <div>
              <h2 class="font-semibold text-slate-900">
                Informasi Akun
              </h2>

              <p class="mt-1 text-sm text-slate-600">
                Identitas dan hak akses akun yang tercatat dalam sistem.
              </p>
            </div>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            v-for="item in accountDetails"
            :key="item.label"
            class="min-w-0 rounded-xl border border-slate-300 bg-slate-50 p-4"
          >
            <p class="text-sm text-slate-600">
              {{ item.label }}
            </p>

            <p class="mt-2 break-words text-sm font-semibold text-slate-800">
              {{ item.value || 'Belum tersedia' }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Informasi waktu -->
      <UCard>
        <template #header>
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-300 bg-indigo-50">
              <UIcon
                name="i-lucide-clock"
                class="size-5 text-indigo-600"
              />
            </div>

            <div>
              <h2 class="font-semibold text-slate-900">
                Riwayat Akun
              </h2>

              <p class="mt-1 text-sm text-slate-600">
                Informasi waktu pembuatan dan aktivitas akun yang tersedia.
              </p>
            </div>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            v-for="item in activityDetails"
            :key="item.label"
            class="min-w-0 rounded-xl border border-slate-300 bg-slate-50 p-4"
          >
            <p class="text-sm text-slate-600">
              {{ item.label }}
            </p>

            <p class="mt-2 break-words text-sm font-semibold text-slate-800">
              {{ formatDate(item.value) }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Riwayat tindakan (audit log) -->
      <UCard>
        <template #header>
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-amber-50">
              <UIcon
                name="i-lucide-history"
                class="size-5 text-amber-600"
              />
            </div>

            <div>
              <h2 class="font-semibold text-slate-900">
                Riwayat Tindakan
              </h2>

              <p class="mt-1 text-sm text-slate-600">
                Perubahan akun beserta pelakunya, terbaru di atas.
              </p>
            </div>
          </div>
        </template>

        <p v-if="history.length === 0" class="text-sm text-slate-600">
          Belum ada catatan.
        </p>

        <ol v-else class="divide-y divide-slate-200">
          <li
            v-for="item in history"
            :key="item.audit_id"
            class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-900">
                {{ item.action_label }}
              </p>
              <p v-if="item.details" class="mt-0.5 break-words text-xs text-slate-600">
                {{ item.details }}
              </p>
            </div>

            <div class="shrink-0 text-xs text-slate-600 sm:text-right">
              <p>{{ formatDate(item.event_time) }}</p>
              <p class="mt-0.5">
                Oleh {{ item.actor_is_self ? 'pemilik akun' : item.actor_name }}
              </p>
            </div>
          </li>
        </ol>
      </UCard>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'super-admin',
})

type ApiAccount = {
  user_id: string
  person_id: string
  full_name: string
  username_email: string
  role: string
  account_status: string
  email_verified_at: string
  created_at: string
  updated_at: string
  last_login_at: string
}

type AccountHistoryItem = {
  audit_id: string
  event_time: string
  action: string
  action_label: string
  actor_name: string
  actor_is_self: boolean
  details: string
}

type AccountResponse = {
  success: boolean
  account: ApiAccount
  history?: AccountHistoryItem[]
}

const route = useRoute()
const router = useRouter()

const accountId = String(route.params.id ?? '')

const {
  data: response,
  status,
  error,
  refresh,
} = await useFetch<AccountResponse>(
  `/api/admin/accounts/${encodeURIComponent(accountId)}`,
  {
    key: `admin-account-detail-${accountId}`,
    credentials: 'include',
  },
)

const account = computed(() => response.value?.account ?? null)
const history = computed(() => response.value?.history ?? [])

const roleLabel = computed(() => getRoleLabel(account.value?.role))

const statusLabel = computed(() =>
  getAccountStatusLabel(account.value?.account_status),
)

const statusColor = computed(() => {
  switch (account.value?.account_status) {
    case 'ACTIVE':
      return 'success'
    case 'PENDING_ACTIVATION':
      return 'warning'
    case 'SUSPENDED':
      return 'error'
    default:
      return 'neutral'
  }
})

const userInitial = computed(() => {
  return account.value?.full_name?.trim().charAt(0).toUpperCase() || 'U'
})

const accountDetails = computed(() => [
  {
    label: 'Nama Lengkap',
    value: account.value?.full_name,
  },
  {
    label: 'Email Akun',
    value: account.value?.username_email,
  },
  {
    label: 'ID Pengguna',
    value: account.value?.user_id,
  },
  {
    label: 'ID Peserta / Pegawai',
    value: account.value?.person_id,
  },
  {
    label: 'Role Pengguna',
    value: roleLabel.value,
  },
  {
    label: 'Status Akun',
    value: statusLabel.value,
  },
  {
    label: 'Verifikasi Email',
    value: account.value?.email_verified_at
      ? formatDate(account.value.email_verified_at)
      : 'Belum tercatat',
  },
])

const activityDetails = computed(() => [
  {
    label: 'Tanggal Pembuatan',
    value: account.value?.created_at,
  },
  {
    label: 'Pembaruan Terakhir',
    value: account.value?.updated_at,
  },
  {
    label: 'Login Terakhir',
    value: account.value?.last_login_at,
  },
])

function formatDate(value?: string | null) {
  if (!value) return 'Belum tercatat'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date) + ' WIB'
}

function goBack() {
  router.push('/super-admin/accounts')
}
</script>
