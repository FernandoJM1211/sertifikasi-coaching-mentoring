
<template>
  <div class="space-y-6">
    <!-- Header halaman -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-blue-500">
          Manajemen Akun
        </h1>
        <p class="mt-1 text-sm text-slate-600">
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
    <div class="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <!-- Header tabel dan filter -->
      <div class="border-b border-slate-300 p-5 sm:px-8 sm:py-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">
              Daftar Akun
            </h2>
            <p class="mt-1 text-sm text-slate-600">
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
        <div class="mt-5 flex flex-col gap-3 rounded-xl border border-blue-300 bg-blue-50 p-3 sm:flex-row sm:items-center">
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
        class="border-b border-red-300 bg-red-50 px-5 py-4 sm:px-8"
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

          <tbody class="divide-y divide-slate-300">
            <tr
              v-if="isRefreshing && accounts.length === 0"
            >
              <td colspan="6" class="px-5 py-16 text-center text-slate-600">
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
              class="transition hover:bg-slate-50"
            >
              <td class="break-words px-5 py-5 sm:px-8">
                <p class="font-semibold text-slate-800">
                  {{ account.name }}
                </p>
                <p class="mt-1 text-xs text-slate-600">
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
                <div class="mx-auto flex size-12 items-center justify-center rounded-xl border border-slate-400 bg-slate-100">
                  <UIcon
                    name="i-lucide-search-x"
                    class="size-6 text-slate-500"
                  />
                </div>
                <p class="mt-3 font-semibold text-slate-800">
                  Akun tidak ditemukan
                </p>
                <p class="mt-1 text-sm text-slate-600">
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
      <div class="border-t border-slate-300 px-4 py-4 sm:px-6">
        <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="filteredAccounts.length" label="akun" />
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
          <div class="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <p class="font-semibold text-slate-900">
              {{ selectedAccount.name }}
            </p>
            <p class="mt-1 break-all text-sm text-slate-600">
              {{ selectedAccount.email }}
            </p>
            <p class="mt-2 text-sm text-slate-600">
              {{ getRoleLabel(selectedAccount.role) }}
            </p>
          </div>

          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-300 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
            @click="goToAccountProfile(selectedAccount.id)"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 text-blue-600">
              <UIcon name="i-lucide-user-round" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900">
                Lihat Profil
              </p>
              <p class="mt-1 text-xs text-slate-600">
                Lihat informasi dan data profil akun.
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-500" />
          </button>

          <!-- Akun Super Admin dilindungi -->
          <div
            v-if="selectedAccount.role === 'SUPER_ADMIN'"
            class="flex gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-slate-700"
          >
            <UIcon name="i-lucide-shield-check" class="mt-0.5 size-5 shrink-0 text-blue-600" />
            <p>
              Akun Super Admin dilindungi: kata sandi dan statusnya tidak dapat diubah dari
              Manajemen Akun. Gunakan menu <span class="font-medium">Ganti Kata Sandi</span>
              pada profil untuk mengganti kata sandi sendiri.
            </p>
          </div>

          <button
            v-else
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-300 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
            @click="openResetPassword"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-600">
              <UIcon name="i-lucide-key-round" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900">
                Atur Ulang Password
              </p>
              <p class="mt-1 text-xs text-slate-600">
                Atur ulang kata sandi akun melalui prosedur admin.
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-500" />
          </button>

          <!-- Ubah email login (khusus peserta, mis. email lama tidak dapat diakses) -->
          <button
            v-if="selectedAccount.role === 'PESERTA'"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-300 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50"
            @click="openChangeEmail"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-violet-300 bg-violet-50 text-violet-600">
              <UIcon name="i-lucide-at-sign" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900">
                Ubah Email
              </p>
              <p class="mt-1 text-xs text-slate-600">
                Ganti email masuk bila email lama tidak dapat diakses.
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-500" />
          </button>

          <!-- Kirim ulang tautan aktivasi (peserta yang belum aktivasi) -->
          <button
            v-if="selectedAccount.status === 'PENDING_ACTIVATION' && selectedAccount.role === 'PESERTA'"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-300 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isResendingActivation"
            @click="resendActivation"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-sky-300 bg-sky-50 text-sky-600">
              <UIcon
                :name="isResendingActivation ? 'i-lucide-loader-circle' : 'i-lucide-mail-plus'"
                class="size-5"
                :class="{ 'animate-spin': isResendingActivation }"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900">
                {{ isResendingActivation ? 'Mengirim Tautan...' : 'Kirim Ulang Tautan Aktivasi' }}
              </p>
              <p class="mt-1 text-xs text-slate-600">
                Kirim tautan aktivasi baru ke email peserta.
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-500" />
          </button>

<!-- Aktifkan atau nonaktifkan akun -->
<button
  v-if="selectedAccount.status === 'ACTIVE' && selectedAccount.role !== 'SUPER_ADMIN'"
  type="button"
  class="flex w-full items-center gap-3 rounded-xl border border-slate-300 p-4 text-left transition hover:border-red-300 hover:bg-red-50"
  @click="confirmAccountStatusChange('DISABLED')"
>
  <div class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-600">
    <UIcon name="i-lucide-user-round-x" class="size-5" />
  </div>

  <div class="min-w-0 flex-1">
    <p class="font-medium text-slate-900">
      Nonaktifkan Akun
    </p>
    <p class="mt-1 text-xs text-slate-600">
      Menonaktifkan akses akun ke sistem.
    </p>
  </div>

  <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-500" />
</button>

<button
  v-else-if="selectedAccount.status === 'DISABLED' && selectedAccount.role !== 'SUPER_ADMIN'"
  type="button"
  class="flex w-full items-center gap-3 rounded-xl border border-slate-300 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
  @click="confirmAccountStatusChange('ACTIVE')"
>
  <div class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-600">
    <UIcon name="i-lucide-user-round-check" class="size-5" />
  </div>

  <div class="min-w-0 flex-1">
    <p class="font-medium text-slate-900">
      Aktifkan Kembali
    </p>
    <p class="mt-1 text-xs text-slate-600">
      Memulihkan akses akun ke sistem.
    </p>
  </div>

  <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-500" />
</button>


          <div class="flex justify-end border-t border-slate-200 pt-3">
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

        <p class="mt-1 text-sm text-slate-600">
          Buat kata sandi baru untuk akun ini, lalu sampaikan kepada pemilik akun.
        </p>
      </div>

      <button
        type="button"
        class="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Tutup modal"
        :disabled="isResettingPassword"
        @click="isResetPasswordModalOpen = false"
      >
        <UIcon name="i-lucide-x" class="size-5" />
      </button>
    </div>

    <div
      v-if="selectedAccount"
      class="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4"
    >
      <p class="font-semibold text-slate-900">
        {{ selectedAccount.name }}
      </p>
      <p class="mt-1 break-all text-sm text-slate-600">
        {{ selectedAccount.email }}
      </p>
      <p class="mt-1 text-xs text-slate-500">
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

        <p class="mt-2 text-xs text-slate-600">
          Minimal 12 karakter dan maksimal 128 karakter.
        </p>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-200 pt-4">
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

    <!-- Modal Ubah Email -->
    <UModal
      v-model:open="isChangeEmailModalOpen"
      title="Ubah Email"
      :description="selectedAccount?.name ?? ''"
      :dismissible="!isChangingEmail"
    >
      <template #body>
        <form v-if="selectedAccount" class="space-y-4" @submit.prevent="submitChangeEmail">
          <div class="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm">
            <p class="text-slate-600">Email saat ini</p>
            <p class="mt-0.5 break-all font-medium text-slate-900">{{ selectedAccount.email }}</p>
          </div>

          <div class="space-y-1.5">
            <label for="new-account-email" class="block text-sm font-medium text-slate-700">Email baru</label>
            <UInput
              id="new-account-email"
              v-model="newEmail"
              type="email"
              maxlength="254"
              autocomplete="off"
              required
              placeholder="nama@gmail.com"
              icon="i-lucide-mail"
              :disabled="isChangingEmail"
              class="w-full"
            />
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-shield-alert"
            title="Pastikan identitas peserta sudah dicek."
            :description="selectedAccount.status === 'PENDING_ACTIVATION'
              ? 'Tautan aktivasi lama tidak berlaku; tautan baru dikirim ke email baru.'
              : 'Peserta keluar dari semua perangkat dan masuk dengan email baru.'"
          />

          <div class="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <UButton color="neutral" variant="outline" :disabled="isChangingEmail" @click="isChangeEmailModalOpen = false">
              Batal
            </UButton>
            <UButton type="submit" icon="i-lucide-save" :loading="isChangingEmail" :disabled="isChangingEmail || !newEmail.trim()">
              Simpan
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

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
            <p class="text-xs text-slate-600">
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
            <p class="text-xs text-slate-600">
              Pegawai dapat mengganti kata sandi setelah login.
            </p>
          </div>

          <div class="flex justify-end gap-3 border-t border-slate-200 pt-4">
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
import type { AccountStatus, StaffRole, UserRole } from '~~/shared/utils/roles'

definePageMeta({
  layout: 'super-admin',
})

type AccountRole = UserRole

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

const accounts = ref<Account[]>([])
const isRefreshing = ref(false)
const loadError = ref('')

const isActionModalOpen = ref(false)
const selectedAccount = ref<Account | null>(null)
const isResetPasswordModalOpen = ref(false)
const newPassword = ref('')
const isResettingPassword = ref(false)
const isChangingAccountStatus = ref(false)
const isResendingActivation = ref(false)
const isChangeEmailModalOpen = ref(false)
const newEmail = ref('')
const isChangingEmail = ref(false)

const isAddAccountModalOpen = ref(false)
const isSubmittingAccount = ref(false)

const staffRoleOptions = STAFF_ROLES.map((role) => ({
  label: ROLE_LABELS[role],
  value: role,
}))

const newAccount = ref<{
  full_name: string
  username_email: string
  role: StaffRole
  password: string
}>({
  full_name: '',
  username_email: '',
  role: 'VERIFIKATOR',
  password: '',
})

const roleOptions = [
  { label: 'Semua Role', value: 'ALL' },
  ...USER_ROLES.map((role) => ({ label: ROLE_LABELS[role], value: role })),
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

const { page: currentPage, pageSize, items: paginatedAccounts, reset: resetPage } = useTablePagination(filteredAccounts)

watch([searchQuery, selectedRole], resetPage)


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
        user.role === 'PESERTA' && Boolean(user.person_id?.trim()),
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

function getRoleColor(
  role: AccountRole,
): 'primary' | 'info' | 'success' | 'warning' | 'neutral' {
  const colors: Record<
    AccountRole,
    'primary' | 'info' | 'success' | 'warning' | 'neutral'
  > = {
    SUPER_ADMIN: 'primary',
    VERIFIKATOR: 'info',
    TECHNICAL_ASSESSOR: 'success',
    PUBLIC_ASSESSOR: 'warning',
    PESERTA: 'neutral',
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

async function resendActivation() {
  if (!selectedAccount.value || isResendingActivation.value) return

  const account = selectedAccount.value

  if (!window.confirm(
    `Kirim ulang tautan aktivasi ke ${account.email}?`,
  )) return

  isResendingActivation.value = true

  try {
    const response = await $fetch<{ success: boolean; message: string }>(
      `/api/admin/accounts/${encodeURIComponent(account.id)}/resend-activation`,
      { method: 'POST', credentials: 'include' },
    )

    toast.add({
      title: 'Tautan aktivasi terkirim',
      description: response.message,
      color: 'success',
      icon: 'i-lucide-mail-check',
    })

    isActionModalOpen.value = false
    selectedAccount.value = null
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string; message?: string } }

    toast.add({
      title: 'Gagal mengirim tautan aktivasi',
      description:
        fetchError.data?.statusMessage
        || fetchError.data?.message
        || 'Terjadi kesalahan saat mengirim tautan aktivasi.',
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    isResendingActivation.value = false
  }
}

function openChangeEmail() {
  if (!selectedAccount.value) return

  newEmail.value = ''
  isActionModalOpen.value = false
  isChangeEmailModalOpen.value = true
}

async function submitChangeEmail() {
  if (!selectedAccount.value || isChangingEmail.value) return

  const account = selectedAccount.value
  isChangingEmail.value = true

  try {
    const response = await $fetch<{ success: boolean, email: string, message: string }>(
      `/api/admin/accounts/${encodeURIComponent(account.id)}/email`,
      { method: 'PATCH', credentials: 'include', body: { email: newEmail.value.trim().toLowerCase() } },
    )

    accounts.value = accounts.value.map((item) =>
      item.id === account.id ? { ...item, email: response.email } : item,
    )

    toast.add({ title: 'Email akun diubah', description: response.message, color: 'success', icon: 'i-lucide-mail-check' })

    isChangeEmailModalOpen.value = false
    selectedAccount.value = null
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string, message?: string } }

    toast.add({
      title: 'Gagal mengubah email',
      description: fetchError.data?.statusMessage || fetchError.data?.message || 'Terjadi kesalahan saat mengubah email.',
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    isChangingEmail.value = false
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
    role: 'VERIFIKATOR',
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
      role: 'VERIFIKATOR',
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
