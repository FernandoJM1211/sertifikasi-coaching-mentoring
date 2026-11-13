
<template>
  <div
    class="min-h-screen w-full min-w-0 overflow-x-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50"
  >
    <header
      class="w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6"
      >
        <NuxtLink to="/" class="min-w-0">
          <p class="text-base font-semibold text-slate-900">
            Sertifikasi Coaching dan Mentoring
          </p>
          <p class="text-xs text-slate-500">
            Sektor Publik
          </p>
        </NuxtLink>

        <NuxtLink
          to="/"
          class="shrink-0 text-sm font-medium text-slate-600 transition hover:text-primary"
        >
          Beranda
        </NuxtLink>
      </div>
    </header>

    <main class="w-full min-w-0 px-6 py-8 lg:py-10">
      <div class="mx-auto w-full max-w-6xl min-w-0">
        <slot />
      </div>
    </main>

    <footer class="w-full border-t border-slate-200/70 bg-white/70">
      <div
        class="mx-auto w-full max-w-6xl px-6 py-5 text-center text-xs text-slate-500"
      >
        Sistem Sertifikasi Coaching dan Mentoring Sektor Publik
      </div>
    </footer>
  </div>
</template>
