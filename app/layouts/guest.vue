
<template>
  <div
    class="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-mesh"
  >
    <!-- Header (sticky) — seragam dengan navbar landing page -->
    <header
      class="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl"
    >
      <div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <img src="/logo-lan.png" alt="Logo LAN" class="size-full scale-150 object-contain">
          </div>

          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">
              Coaching & Mentoring
            </p>
            <p class="truncate text-xs text-slate-600">
              Sistem Sertifikasi
            </p>
          </div>
        </NuxtLink>

        <UButton to="/" label="Home" variant="outline" class="shrink-0" />
      </div>
    </header>

    <main class="w-full min-w-0 flex-1 px-6 py-8 lg:py-10">
      <div class="mx-auto w-full max-w-6xl min-w-0">
        <slot />
      </div>
    </main>

    <LayoutAppFooter />
  </div>
</template>
