
<template>
  <div class="space-y-6">
    <!-- Header halaman -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          Manajemen Akun
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          Kelola akun pengguna Sistem Sertifikasi Coaching dan Mentoring.
        </p>
      </div>

      <UButton
  icon="i-lucide-user-plus"
  color="primary"
  @click="openAddAccountModal"
>
  Tambah Akun Staf
</UButton>
    </div>

    <!-- Tabel akun -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <!-- Header tabel dan filter -->
      <div class="border-b border-slate-200 p-5 sm:px-8 sm:py-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">
              Daftar Akun
            </h2>
            <p class="mt-1 text-sm text-slate-500">
              Kelola informasi akun dan akses pengguna.
            </p>
          </div>

          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="isRefreshing"
            @click="refreshAccounts"
          >
            Muat Ulang
          </UButton>
        </div>

        <!-- Pencarian dan filter role -->
        <div class="mt-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:flex-row sm:items-center">
          <div class="w-full min-w-0 sm:flex-1">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Cari nama atau email..."
              class="w-full"
              size="lg"
            />
          </div>

          <div class="w-full sm:w-[240px] sm:shrink-0">
            <USelect
              v-model="selectedRole"
              :items="roleOptions"
              value-key="value"
              class="w-full"
              size="lg"
            />
          </div>
        </div>
      </div>

      <!-- Pesan error -->
      <div
        v-if="loadError"
        class="border-b border-red-100 bg-red-50 px-5 py-4 sm:px-8"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-red-700">
            {{ loadError }}
          </p>

          <UButton
            color="error"
            variant="outline"
            size="sm"
            :loading="isRefreshing"
            @click="refreshAccounts"
          >
            Coba Lagi
          </UButton>
        </div>
      </div>

      <!-- Isi tabel -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] table-fixed text-sm">
          <colgroup>
            <col class="w-[23%]" />
            <col class="w-[27%]" />
            <col class="w-[16%]" />
            <col class="w-[13%]" />
            <col class="w-[13%]" />
            <col class="w-[8%]" />
          </colgroup>

          <thead>
            <tr class="border-b border-blue-100">
              <th class="px-5 py-5 text-left font-semibold text-blue-600 sm:px-8">
                Nama Akun
              </th>
              <th class="px-4 py-5 text-left font-semibold text-blue-600">
                Email
              </th>
              <th class="px-4 py-5 text-center font-semibold text-blue-600">
                Role
              </th>
              <th class="px-4 py-5 text-center font-semibold text-blue-600">
                Status
              </th>
              <th class="px-4 py-5 text-center font-semibold text-blue-600">
                Profil
              </th>
              <th class="px-4 py-5 text-center font-semibold text-blue-600">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-if="isRefreshing && accounts.length === 0"
            >
              <td colspan="6" class="px-5 py-16 text-center text-slate-500">
                <UIcon
                  name="i-lucide-loader-circle"
                  class="mr-2 inline size-5 animate-spin"
                />
                Memuat data akun...
              </td>
            </tr>

            <tr
              v-for="account in paginatedAccounts"
              :key="account.id"
              class="transition hover:bg-slate-50/70"
            >
              <td class="break-words px-5 py-5 sm:px-8">
                <p class="font-semibold text-slate-800">
                  {{ account.name }}
                </p>
                <p class="mt-1 text-xs text-slate-500">
                  {{ account.id }}
                </p>
              </td>

              <td class="break-all px-4 py-5 text-slate-600">
                {{ account.email }}
              </td>

              <td class="px-4 py-5 text-center">
  <UBadge
    :color="getRoleColor(account.role)"
    variant="subtle"
    class="justify-center whitespace-normal text-center"
  >
    {{ getRoleLabel(account.role) }}
  </UBadge>
</td>

              <td class="px-4 py-5 text-center">
                <UBadge
                  :color="getStatusColor(account.status)"
                  variant="subtle"
                  class="justify-center whitespace-normal text-center"
                >
                  {{ getStatusLabel(account.status) }}
                </UBadge>
              </td>

              <td class="px-4 py-5 text-center">
                <UBadge
                  :color="account.profileComplete ? 'success' : 'warning'"
                  variant="subtle"
                  class="justify-center whitespace-normal text-center"
                >
                  {{ account.profileComplete ? 'Terhubung' : 'Belum tersedia' }}
                </UBadge>
              </td>

              <td class="px-4 py-5 text-center">
                <UButton
                  icon="i-lucide-settings-2"
                  color="primary"
                  variant="solid"
                  square
                  size="md"
                  aria-label="Pengaturan akun"
                  title="Pengaturan akun"
                  @click="openAccountActions(account)"
                />
              </td>
            </tr>

            <tr
              v-if="!isRefreshing && !loadError && filteredAccounts.length === 0"
            >
              <td colspan="6" class="px-5 py-16 text-center">
                <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100">
                  <UIcon
                    name="i-lucide-search-x"
                    class="size-6 text-slate-400"
                  />
                </div>
                <p class="mt-3 font-semibold text-slate-800">
                  Akun tidak ditemukan
                </p>
                <p class="mt-1 text-sm text-slate-500">
                  Coba ubah kata kunci pencarian atau filter role.
                </p>
                <UButton
                  class="mt-4"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="resetFilters"
                >
                  Reset Filter
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer dan pagination -->
      <div class="flex flex-col gap-4 border-t border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p class="text-sm text-slate-500">
          Menampilkan
          <span class="font-medium text-slate-700">
            {{ paginationStart }} – {{ paginationEnd }}
          </span>
          dari
          <span class="font-medium text-slate-700">
            {{ filteredAccounts.length }}
          </span>
          akun
        </p>

        <div class="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-chevron-left"
            :disabled="currentPage <= 1"
            @click="currentPage--"
          >
            Sebelumnya
          </UButton>

          <span class="min-w-[48px] text-center text-sm text-slate-600">
            {{ currentPage }} / {{ totalPages }}
          </span>

          <UButton
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-chevron-right"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            Berikutnya
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal pengaturan akun -->
    <UModal
      v-model:open="isActionModalOpen"
      title="Pengaturan Akun"
      :description="selectedAccount?.name ?? 'Pilih tindakan untuk akun ini.'"
    >
      <template #body>
        <div v-if="selectedAccount" class="space-y-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="font-semibold text-slate-900">
              {{ selectedAccount.name }}
            </p>
            <p class="mt-1 break-all text-sm text-slate-500">
              {{ selectedAccount.email }}
            </p>
            <p class="mt-2 text-sm text-slate-600">
              {{ getRoleLabel(selectedAccount.role) }}
            </p>
          </div>

          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
            @click="goToAccountProfile(selectedAccount.id)"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UIcon name="i-lucide-user-round" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900">
                Lihat Profil
              </p>
              <p class="mt-1 text-xs text-slate-500">
                Lihat informasi dan data profil akun.
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-400" />
          </button>

          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/50"
            @click="openResetPassword"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <UIcon name="i-lucide-key-round" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900">
                Atur Ulang Password
              </p>
              <p class="mt-1 text-xs text-slate-500">
                Atur ulang kata sandi akun melalui prosedur admin.
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-400" />
          </button>

         
<!-- Aktifkan atau nonaktifkan akun -->
<button
  v-if="selectedAccount.status === 'ACTIVE'"
  type="button"
  class="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-red-300 hover:bg-red-50/50"
  @click="confirmAccountStatusChange('DISABLED')"
>
  <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
    <UIcon name="i-lucide-user-round-x" class="size-5" />
  </div>

  <div class="min-w-0 flex-1">
    <p class="font-medium text-slate-900">
      Nonaktifkan Akun
    </p>
    <p class="mt-1 text-xs text-slate-500">
      Menonaktifkan akses akun ke sistem.
    </p>
  </div>

  <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-400" />
</button>

<button
  v-else-if="selectedAccount.status === 'DISABLED'"
  type="button"
  class="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50"
  @click="confirmAccountStatusChange('ACTIVE')"
>
  <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
    <UIcon name="i-lucide-user-round-check" class="size-5" />
  </div>

  <div class="min-w-0 flex-1">
    <p class="font-medium text-slate-900">
      Aktifkan Kembali
    </p>
    <p class="mt-1 text-xs text-slate-500">
      Memulihkan akses akun ke sistem.
    </p>
  </div>

  <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-400" />
</button>


          <div class="flex justify-end border-t border-slate-100 pt-3">
            <UButton
              color="neutral"
              variant="outline"
              @click="isActionModalOpen = false"
            >
              Tutup
            </UButton>
          </div>
        </div>
      </template>
    </UModal>


<!-- Modal Atur Ulang Password -->
<div
  v-if="isResetPasswordModalOpen"
  class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
  @click.self="isResetPasswordModalOpen = false"
>
  <div
    class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reset-password-title"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2
          id="reset-password-title"
          class="text-xl font-bold text-slate-900"
        >
          Atur Ulang Password
        </h2>

        <p class="mt-1 text-sm text-slate-500">
          Buat kata sandi baru untuk akun staf.
        </p>
      </div>

      <button
        type="button"
        class="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
        aria-label="Tutup modal"
        :disabled="isResettingPassword"
        @click="isResetPasswordModalOpen = false"
      >
        <UIcon name="i-lucide-x" class="size-5" />
      </button>
    </div>

    <div
      v-if="selectedAccount"
      class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <p class="font-semibold text-slate-900">
        {{ selectedAccount.full_name }}
      </p>
      <p class="mt-1 break-all text-sm text-slate-500">
        {{ selectedAccount.username_email }}
      </p>
      <p class="mt-1 text-xs text-slate-400">
        ID: {{ selectedAccount.id }}
      </p>
    </div>

    <form
      class="mt-5 space-y-4"
      @submit.prevent="submitResetPassword"
    >
      <div>
        <label
          for="new-account-password"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Kata Sandi Baru
        </label>

        <input
          id="new-account-password"
          v-model="newPassword"
          type="password"
          minlength="12"
          maxlength="128"
          autocomplete="new-password"
          required
          placeholder="Masukkan kata sandi baru"
          class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <p class="mt-2 text-xs text-slate-500">
          Minimal 12 karakter dan maksimal 128 karakter.
        </p>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          :disabled="isResettingPassword"
          @click="isResetPasswordModalOpen = false"
        >
          Batal
        </button>

        <button
          type="submit"
          class="rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="
            isResettingPassword ||
            newPassword.length < 12 ||
            newPassword.length > 128
          "
        >
          {{
            isResettingPassword
              ? 'Menyimpan...'
              : 'Simpan Password Baru'
          }}
        </button>
      </div>
    </form>
  </div>
</div>

    <!-- Modal Tambah Akun Staf -->
    <UModal
      v-model:open="isAddAccountModalOpen"
      title="Tambah Akun Staf"
      description="Buat akun akses untuk pegawai pengelola sistem sertifikasi."
    >
      <template #body>
        <form class="space-y-5" @submit.prevent="submitAddAccount">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700">
              Nama Lengkap
            </label>
            <UInput
              v-model="newAccount.full_name"
              placeholder="Masukkan nama lengkap"
              icon="i-lucide-user-round"
              size="lg"
              class="w-full"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700">
              Email
            </label>
            <UInput
              v-model="newAccount.username_email"
              type="email"
              placeholder="nama@gmail.com"
              icon="i-lucide-mail"
              size="lg"
              class="w-full"
              required
            />
            <p class="text-xs text-slate-500">
              Email digunakan untuk login ke sistem.
            </p>
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700">
              Role Akun
            </label>
            <USelect
              v-model="newAccount.role"
              :items="staffRoleOptions"
              value-key="value"
              size="lg"
              class="w-full"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-slate-700">
              Kata Sandi Awal
            </label>
            <UInput
              v-model="newAccount.password"
              type="password"
              placeholder="Minimal 12 karakter"
              icon="i-lucide-lock-keyhole"
              size="lg"
              class="w-full"
              required
              minlength="12"
              autocomplete="new-password"
            />
            <p class="text-xs text-slate-500">
              Pegawai dapat mengganti kata sandi setelah login.
            </p>
          </div>

          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              @click="closeAddAccountModal"
            >
              Batal
            </UButton>

            <UButton
              type="submit"
              color="primary"
              icon="i-lucide-user-plus"
              :loading="isSubmittingAccount"
              :disabled="isSubmittingAccount"
            >
              Simpan Akun
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>

</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

definePageMeta({
  layout: 'super-admin',
})

type AccountRole =
  | 'SUPER_ADMIN'
  | 'VERIFIER'
  | 'TECHNICAL_ASSESSOR'
  | 'PUBLIC_ASSESSOR'
  | 'PARTICIPANT'

type AccountStatus =
  | 'ACTIVE'
  | 'PENDING_ACTIVATION'
  | 'SUSPENDED'
  | 'DISABLED'

type Account = {
  id: string
  personId: string
  name: string
  email: string
  role: AccountRole
  status: AccountStatus
  profileComplete: boolean
}

type ApiAccount = {
  user_id: string
  person_id: string
  full_name: string
  username_email: string
  role: AccountRole
  account_status: AccountStatus
  email_verified_at: string
  created_at: string
  updated_at: string
  last_login_at: string
}

type AccountsResponse = {
  success: boolean
  accounts: ApiAccount[]
}

const toast = useToast()

const searchQuery = ref('')
const selectedRole = ref('ALL')
const currentPage = ref(1)
const pageSize = 10

const accounts = ref<Account[]>([])
const isRefreshing = ref(false)
const loadError = ref('')

const isActionModalOpen = ref(false)
const selectedAccount = ref<Account | null>(null)
const isResetPasswordModalOpen = ref(false)
const newPassword = ref('')
const isResettingPassword = ref(false)
const isChangingAccountStatus = ref(false)

const isAddAccountModalOpen = ref(false)
const isSubmittingAccount = ref(false)

type StaffRole =
  | 'SUPER_ADMIN'
  | 'VERIFIER'
  | 'TECHNICAL_ASSESSOR'
  | 'PUBLIC_ASSESSOR'

const staffRoleOptions = [
  { label: 'Verifier', value: 'VERIFIER' },
  { label: 'Asesor Teknis', value: 'TECHNICAL_ASSESSOR' },
  { label: 'Asesor Publik', value: 'PUBLIC_ASSESSOR' },
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
]

const newAccount = ref<{
  full_name: string
  username_email: string
  role: StaffRole
  password: string
}>({
  full_name: '',
  username_email: '',
  role: 'VERIFIER',
  password: '',
})

const roleOptions = [
  { label: 'Semua Role', value: 'ALL' },
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Verifier', value: 'VERIFIER' },
  { label: 'Asesor Teknis', value: 'TECHNICAL_ASSESSOR' },
  { label: 'Asesor Publik', value: 'PUBLIC_ASSESSOR' },
  { label: 'Peserta', value: 'PARTICIPANT' },
]

const filteredAccounts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return accounts.value.filter((account) => {
    const matchesSearch =
      !query ||
      account.name.toLowerCase().includes(query) ||
      account.email.toLowerCase().includes(query)

    const matchesRole =
      selectedRole.value === 'ALL' ||
      account.role === selectedRole.value

    return matchesSearch && matchesRole
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAccounts.value.length / pageSize)),
)

const paginatedAccounts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredAccounts.value.slice(start, start + pageSize)
})

const paginationStart = computed(() =>
  filteredAccounts.value.length === 0
    ? 0
    : (currentPage.value - 1) * pageSize + 1,
)

const paginationEnd = computed(() =>
  Math.min(currentPage.value * pageSize, filteredAccounts.value.length),
)

watch([searchQuery, selectedRole], () => {
  currentPage.value = 1
})

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages
  }
})

onMounted(() => {
  void refreshAccounts()
})

async function refreshAccounts() {
  if (isRefreshing.value) return

  isRefreshing.value = true
  loadError.value = ''

  try {
    const response = await $fetch<AccountsResponse>(
      '/api/admin/accounts',
      {
        method: 'GET',
      },
    )

    if (!response.success || !Array.isArray(response.accounts)) {
      throw new Error('Format respons API daftar akun tidak sesuai.')
    }

    accounts.value = response.accounts.map((user) => ({
      id: user.user_id,
      personId: user.person_id ?? '',
      name: user.full_name || '(Nama belum tersedia)',
      email: user.username_email,
      role: user.role,
      status: user.account_status,
      // Indikator ini hanya menunjukkan keterhubungan ke data Person,
      // bukan hasil pemeriksaan kelengkapan seluruh kolom profil.
      profileComplete:
        user.role === 'PARTICIPANT' && Boolean(user.person_id?.trim()),
    }))

    currentPage.value = 1
  } catch (error: unknown) {
    console.error('Gagal memuat daftar akun:', error)

    loadError.value =
      'Daftar akun gagal dimuat. Periksa koneksi atau coba muat ulang.'

    toast.add({
      title: 'Gagal memuat akun',
      description: loadError.value,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    isRefreshing.value = false
  }
}

function getRoleLabel(role: AccountRole) {
  const labels: Record<AccountRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    VERIFIER: 'Verifier',
    TECHNICAL_ASSESSOR: 'Asesor Teknis',
    PUBLIC_ASSESSOR: 'Asesor Publik',
    PARTICIPANT: 'Peserta',
  }

  return labels[role] ?? role
}

function getRoleColor(
  role: AccountRole,
): 'primary' | 'info' | 'success' | 'warning' | 'neutral' {
  const colors: Record<
    AccountRole,
    'primary' | 'info' | 'success' | 'warning' | 'neutral'
  > = {
    SUPER_ADMIN: 'primary',
    VERIFIER: 'info',
    TECHNICAL_ASSESSOR: 'success',
    PUBLIC_ASSESSOR: 'warning',
    PARTICIPANT: 'neutral',
  }

  return colors[role] ?? 'neutral'
}

function getStatusLabel(status: AccountStatus) {
  const labels: Record<AccountStatus, string> = {
    ACTIVE: 'Aktif',
    PENDING_ACTIVATION: 'Menunggu aktivasi',
    SUSPENDED: 'Ditangguhkan',
    DISABLED: 'Nonaktif',
  }

  return labels[status] ?? status
}

function getStatusColor(status: AccountStatus) {
  const colors: Record<
    AccountStatus,
    'success' | 'warning' | 'error' | 'neutral'
  > = {
    ACTIVE: 'success',
    PENDING_ACTIVATION: 'warning',
    SUSPENDED: 'error',
    DISABLED: 'neutral',
  }

  return colors[status] ?? 'neutral'
}

function resetFilters() {
  searchQuery.value = ''
  selectedRole.value = 'ALL'
  currentPage.value = 1
}

function openAccountActions(account: Account) {
  selectedAccount.value = account
  isActionModalOpen.value = true
}


function openResetPassword() {
  if (!selectedAccount.value) return

  newPassword.value = ''
  isActionModalOpen.value = false
  isResetPasswordModalOpen.value = true
}


async function submitResetPassword() {
  if (!selectedAccount.value || isResettingPassword.value) return

  const password = newPassword.value

  if (password.length < 12 || password.length > 128) {
    toast.add({
      title: 'Kata sandi tidak valid',
      description: 'Kata sandi harus terdiri dari 12–128 karakter.',
      color: 'error',
    })
    return
  }

  isResettingPassword.value = true

  try {
    const response = await $fetch<{ success: boolean; message: string }>(
      `/api/admin/accounts/${encodeURIComponent(selectedAccount.value.id)}/reset-password`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          new_password: password,
        },
      },
    )

    if (!response.success) {
      throw new Error(response.message || 'Pengaturan ulang kata sandi gagal.')
    }

    toast.add({
      title: 'Password berhasil diatur ulang',
      description: 'Kata sandi akun staf telah diperbarui.',
      color: 'success',
    })

    newPassword.value = ''
    isResetPasswordModalOpen.value = false
    selectedAccount.value = null
  } catch (error: unknown) {
    const message =
      typeof error === 'object' && error !== null && 'data' in error
        ? String(
            (error as { data?: { statusMessage?: string } }).data?.statusMessage
            || 'Terjadi kesalahan saat mengatur ulang kata sandi.',
          )
        : 'Terjadi kesalahan saat mengatur ulang kata sandi.'

    toast.add({
      title: 'Gagal mengatur ulang password',
      description: message,
      color: 'error',
    })
  } finally {
    isResettingPassword.value = false
  }
}


async function confirmAccountStatusChange(
  status: 'ACTIVE' | 'DISABLED',
) {
  if (!selectedAccount.value || isChangingAccountStatus.value) return

  const account = selectedAccount.value

  if (account.status === status) return

  const isDisabling = status === 'DISABLED'
  const confirmationMessage = isDisabling
    ? `Nonaktifkan akun ${account.name}? Akun ini tidak akan dapat mengakses sistem setelah statusnya diberlakukan.`
    : `Aktifkan kembali akun ${account.name}?`

  if (!window.confirm(confirmationMessage)) return

  isChangingAccountStatus.value = true

  try {
    const response = await $fetch<{
      success: boolean
      message?: string
    }>(
      `/api/admin/accounts/${encodeURIComponent(account.id)}/status`,
      {
        method: 'PATCH',
        credentials: 'include',
        body: {
          account_status: status,
        },
      },
    )

    if (!response.success) {
      throw new Error(
        response.message || 'Perubahan status akun gagal.',
      )
    }

    // Perbarui status akun pada tabel tanpa memuat ulang halaman.
    accounts.value = accounts.value.map((item) =>
      item.id === account.id
        ? { ...item, status }
        : item,
    )

    // Perbarui akun yang sedang dipilih.
    if (selectedAccount.value?.id === account.id) {
      selectedAccount.value = {
        ...selectedAccount.value,
        status,
      }
    }

    toast.add({
      title: isDisabling
        ? 'Akun berhasil dinonaktifkan'
        : 'Akun berhasil diaktifkan kembali',
      description: isDisabling
        ? 'Status akun telah diubah menjadi nonaktif.'
        : 'Status akun telah diubah menjadi aktif.',
      color: 'success',
    })

    isActionModalOpen.value = false
    selectedAccount.value = null
  } catch (error: unknown) {
    const message =
      typeof error === 'object' &&
      error !== null &&
      'data' in error
        ? String(
            (error as {
              data?: { statusMessage?: string; message?: string }
            }).data?.statusMessage
            || (error as {
              data?: { message?: string }
            }).data?.message
            || 'Terjadi kesalahan saat mengubah status akun.',
          )
        : error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengubah status akun.'

    toast.add({
      title: 'Gagal mengubah status akun',
      description: message,
      color: 'error',
    })
  } finally {
    isChangingAccountStatus.value = false
  }
}

function showPlaceholder(feature: string) {
  toast.add({
    title: feature,
    description: 'Fitur ini akan diimplementasikan pada tahap berikutnya.',
    color: 'info',
    icon: 'i-lucide-info',
  })
}


function goToAccountProfile(userId: string) {
  navigateTo(`/super-admin/accounts/${encodeURIComponent(userId)}`)
}

function openAddAccountModal() {
  isAddAccountModalOpen.value = true
}

function closeAddAccountModal() {
  if (isSubmittingAccount.value) return

  isAddAccountModalOpen.value = false

  newAccount.value = {
    full_name: '',
    username_email: '',
    role: 'VERIFIER',
    password: '',
  }
}

async function submitAddAccount() {
  if (isSubmittingAccount.value) return

  isSubmittingAccount.value = true

  try {
    await $fetch('/api/admin/accounts', {
      method: 'POST',
      body: {
        full_name: newAccount.value.full_name.trim(),
        username_email: newAccount.value.username_email.trim().toLowerCase(),
        role: newAccount.value.role,
        password: newAccount.value.password,
      },
    })

    toast.add({
      title: 'Akun berhasil dibuat',
      description: 'Akun staf telah dibuat dengan status aktif.',
      color: 'success',
      icon: 'i-lucide-circle-check',
    })

    isAddAccountModalOpen.value = false
    newAccount.value = {
      full_name: '',
      username_email: '',
      role: 'VERIFIER',
      password: '',
    }

    await refreshAccounts()
  } catch (error: unknown) {
    console.error('Gagal membuat akun staf:', error)

    const fetchError = error as {
      data?: { statusMessage?: string; message?: string }
      statusMessage?: string
      message?: string
    }

    const message =
      fetchError.data?.statusMessage ||
      fetchError.data?.message ||
      fetchError.statusMessage ||
      fetchError.message ||
      'Akun gagal dibuat. Periksa koneksi dan coba kembali.'

    toast.add({
      title: 'Gagal membuat akun',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    isSubmittingAccount.value = false
  }
}
</script>
