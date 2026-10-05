<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50"
  >
    <div class="flex min-h-screen">
      <!-- Sidebar -->
      <USidebar
  collapsible="icon"
  variant="sidebar"
  class="sticky top-0 h-screen shrink-0 border-r border-slate-200/70 bg-white/80 backdrop-blur-xl"
>
        <!-- Sidebar Header -->
        <template #header>
          <div class="flex items-center gap-3 px-2 py-3">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white"
            >
              CM
            </div>

            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">
                Coaching & Mentoring
              </p>

              <p class="truncate text-xs text-slate-500">
                Sistem Sertifikasi
              </p>
            </div>
          </div>
        </template>

        <!-- Navigation -->
        <UNavigationMenu
          orientation="vertical"
          :items="navigation"
          class="px-2"
        />

        <!-- Sidebar Footer -->
        <template #footer>
          <div class="border-t border-slate-200/70 p-3">
            <div class="flex items-center gap-3">
              <UAvatar
                src="https://i.pravatar.cc/80?img=12"
                alt="Fernando"
                size="sm"
              />

              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-900">
                  Fernando
                </p>

                <p class="truncate text-xs text-slate-500">
                  User
                </p>
              </div>
            </div>
          </div>
        </template>
      </USidebar>

      <!-- Main Area -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Header -->
        <header
          class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 px-6 backdrop-blur-xl"
        >
          <div>
            <p class="text-sm font-semibold text-slate-900">
              Dashboard
            </p>

            <p class="text-xs text-slate-500">
              Sistem Sertifikasi Coaching dan Mentoring
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-bell"
              color="neutral"
              variant="ghost"
              square
              aria-label="Notifikasi"
            />

            <UAvatar
              src="https://i.pravatar.cc/80?img=12"
              alt="Fernando"
              size="sm"
            />
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 p-6 lg:p-8">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const navigation = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/user',
  },
  {
    label: 'Sertifikasi Saya',
    icon: 'i-lucide-award',
    to: '/user/sertifikasi',
  },
  {
    label: 'Profil Saya',
    icon: 'i-lucide-user-round',
    to: '/user/profil',
  },
]
</script>