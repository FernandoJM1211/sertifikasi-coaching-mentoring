<template>
  <div class="min-h-screen bg-mesh">
    <!-- Header (sticky) -->
    <header
      class="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl"
    >
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <NuxtLink to="/" class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <img src="/logo-lan.png" alt="Logo LAN" class="size-full scale-150 object-contain">
          </div>

          <div>
            <p class="text-sm font-semibold text-slate-900">
              Coaching & Mentoring
            </p>

            <p class="text-xs text-slate-500">
              Sistem Sertifikasi
            </p>
          </div>
        </NuxtLink>

        <div class="flex items-center gap-2">
          <UButton
            to="/login"
            label="Masuk"
            variant="outline"
          />

          <UButton
            to="/pendaftaran"
            label="Daftar"
          />
        </div>
      </div>
    </header>

    <!-- Content -->
    <main>
      <slot />
    </main>
  </div>
</template>