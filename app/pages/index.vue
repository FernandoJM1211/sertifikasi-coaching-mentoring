<template>
  <!-- Mengisi sisa tinggi layar (layout default: navbar + footer) agar beranda tidak perlu di-scroll di desktop. -->
  <div class="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
    <div
      class="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-blue-200/40 blur-3xl"
    />

    <div
      class="pointer-events-none absolute -right-24 top-24 size-96 rounded-full bg-indigo-200/40 blur-3xl"
    />

    <section
      class="relative mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10 lg:px-8"
    >
      <div class="mx-auto max-w-4xl text-center">
        <h1
          class="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
        >
          Sertifikasi Coaching dan Mentoring
          <span class="text-primary">
            Sektor Publik
          </span>
        </h1>

        <p
          class="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg"
        >
          Platform sertifikasi kompetensi Coach dan Mentor Sektor Publik
          untuk mendukung proses pendaftaran, verifikasi, assessment,
          hingga hasil sertifikasi.
        </p>

        <div class="mt-9 flex justify-center">
          <UButton
            to="/pendaftaran"
            label="Daftar Sertifikasi"
            trailing
            size="lg"
            color="primary"
          />
        </div>
      </div>
    </section>
  </div>
</template>
