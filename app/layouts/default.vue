<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
    <!-- Header -->
    <header
      class="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl"
    >
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <div
            class="flex size-9 items-center justify-center rounded-xl bg-primary text-white"
          >
            CM
          </div>

          <div>
            <p class="text-sm font-semibold text-slate-900">
              Coaching & Mentoring
            </p>

            <p class="text-xs text-slate-500">
              Sistem Sertifikasi
            </p>
          </div>
        </div>

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