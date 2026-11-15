<script setup lang="ts">
export type DashboardNavItem = {
  label: string
  icon: string
  to: string
  /** Aktif hanya jika path sama persis (untuk menu beranda/dashboard). */
  exact?: boolean
}

const props = defineProps<{
  /** Subjudul di bawah nama sistem pada sidebar. */
  panelLabel: string
  /** Judul pada header konten. */
  headerTitle: string
  navigation: DashboardNavItem[]
  /** Prefix route role, mis. "/verifikator". */
  basePath: string
}>()

const route = useRoute()
const toast = useToast()

const isProfileMenuOpen = ref(false)
const isLoggingOut = ref(false)

const { user: currentUser } = await useAuthUser()

const displayName = computed(() => (
  currentUser.value?.full_name?.trim() ||
  currentUser.value?.username_email ||
  'Pengguna'
))

const userInitial = computed(() => (
  displayName.value.charAt(0).toUpperCase() || 'U'
))

const roleLabel = computed(() => getRoleLabel(currentUser.value?.role))

function isActive(item: DashboardNavItem) {
  if (item.exact) {
    return route.path === item.to
  }

  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

function goTo(path: string) {
  isProfileMenuOpen.value = false
  navigateTo(`${props.basePath}${path}`)
}

async function handleLogout() {
  if (isLoggingOut.value) return

  isLoggingOut.value = true

  try {
    await logout()
  } catch {
    toast.add({
      title: 'Gagal keluar',
      description: 'Sesi belum berhasil diakhiri. Silakan coba lagi.',
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    isLoggingOut.value = false
    isProfileMenuOpen.value = false
  }
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
    <!-- Sidebar -->
    <aside class="relative z-20 flex h-full w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white/95">
      <!-- Identitas Sistem -->
      <div class="flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-200/70 px-6">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm">
          CM
        </div>

        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-slate-900">
            Coaching &amp; Mentoring
          </p>
          <p class="truncate text-xs text-slate-500">
            {{ panelLabel }}
          </p>
        </div>
      </div>

      <!-- Navigasi -->
      <nav class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-5">
        <p class="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu Utama
        </p>

        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition"
          :class="isActive(item)
            ? 'bg-blue-50 text-primary'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
        >
          <UIcon :name="item.icon" class="size-5 shrink-0" />
          <span class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Profil Pengguna -->
      <div class="relative shrink-0 border-t border-slate-200/70 p-4">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary"
          :aria-expanded="isProfileMenuOpen"
          aria-label="Buka menu profil"
          @click="isProfileMenuOpen = !isProfileMenuOpen"
        >
          <UAvatar
            :text="userInitial"
            :alt="displayName"
            size="md"
            class="shrink-0"
          />

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-slate-900">
              {{ displayName }}
            </p>
            <p class="truncate text-xs text-slate-500">
              {{ roleLabel }}
            </p>
          </div>

          <UIcon
            :name="isProfileMenuOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
            class="size-4 shrink-0 text-slate-500"
          />
        </button>

        <!-- Menu Akun -->
        <div
          v-if="isProfileMenuOpen"
          class="absolute bottom-full left-4 right-4 z-50 mb-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          <div class="border-b border-slate-100 px-3 py-3">
            <p class="truncate text-sm font-semibold text-slate-900">
              {{ displayName }}
            </p>
            <p class="break-all text-xs text-slate-500">
              {{ currentUser?.username_email || '' }}
            </p>
            <UBadge class="mt-2" color="info" variant="subtle">
              {{ roleLabel }}
            </UBadge>
          </div>

          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            @click="goTo('/profile')"
          >
            <UIcon name="i-lucide-user-round" class="size-4" />
            Profil Saya
          </button>

          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            @click="goTo('/change-password')"
          >
            <UIcon name="i-lucide-key-round" class="size-4" />
            Ganti Kata Sandi
          </button>

          <div class="my-1 border-t border-slate-100" />

          <button
            type="button"
            :disabled="isLoggingOut"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            @click="handleLogout"
          >
            <UIcon
              :name="isLoggingOut ? 'i-lucide-loader-circle' : 'i-lucide-log-out'"
              class="size-4"
              :class="{ 'animate-spin': isLoggingOut }"
            />
            {{ isLoggingOut ? 'Sedang keluar...' : 'Keluar' }}
          </button>
        </div>
      </div>
    </aside>

    <!-- Area Konten -->
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header class="z-10 flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/90 px-5 backdrop-blur-xl sm:px-8">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-slate-900">
            {{ headerTitle }}
          </p>
          <p class="truncate text-xs text-slate-500">
            Sistem Sertifikasi Coaching dan Mentoring
          </p>
        </div>

        <UButton
          icon="i-lucide-bell"
          color="neutral"
          variant="ghost"
          square
          aria-label="Notifikasi"
        />
      </header>

      <main class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
