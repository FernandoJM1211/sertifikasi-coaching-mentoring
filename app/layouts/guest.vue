<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50"
  >
    <header
      class="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl"
    >
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div>
          <p class="text-base font-semibold text-slate-900">
            Sertifikasi Coaching dan Mentoring
          </p>
          <p class="text-xs text-slate-500">
            Sektor Publik
          </p>
        </div>

        <NuxtLink
          to="/"
          class="text-sm font-medium text-slate-600 transition hover:text-primary"
        >
          Beranda
        </NuxtLink>
      </div>
    </header>

    <main class="px-6 py-8 lg:py-10">
      <div class="mx-auto max-w-6xl">
        <slot />
      </div>
    </main>

    <footer
      class="border-t border-slate-200/70 bg-white/70"
    >
      <div
        class="mx-auto max-w-6xl px-6 py-5 text-center text-xs text-slate-500"
      >
        Sistem Sertifikasi Coaching dan Mentoring Sektor Publik
      </div>
    </footer>
  </div>
</template>