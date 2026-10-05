<script setup lang="ts">
definePageMeta({
  layout: 'user',
})
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8">
    <!-- Welcome -->
    <section>
      <p class="text-sm font-medium text-primary">
        SELAMAT DATANG
      </p>

      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        Dashboard Sertifikasi
      </h1>

      <p class="mt-2 max-w-2xl text-slate-500">
        Kelola dan ikuti proses Sertifikasi Coaching dan Mentoring Sektor
        Publik dalam satu platform.
      </p>
    </section>

    <!-- Active Certification -->
    <section>
      <UCard class="bg-white/90 shadow-sm">
        <div
          class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <UBadge
              label="Periode Aktif"
              color="primary"
              variant="subtle"
            />

            <h2 class="mt-3 text-xl font-semibold text-slate-900">
              Certified Public Sector Performance Coach and Mentor
            </h2>

            <p class="mt-2 text-sm text-slate-500">
              Periode Sertifikasi September 2026
            </p>
          </div>

          <UButton
            to="/user/sertifikasi"
            label="Lihat Sertifikasi"
            trailing-icon="i-lucide-arrow-right"
          />
        </div>
      </UCard>
    </section>

    <!-- Progress -->
    <section class="grid gap-4 md:grid-cols-3">
      <UCard class="bg-white/90 shadow-sm">
        <p class="text-sm text-slate-500">
          Status
        </p>

        <div class="mt-3">
          <UBadge
            label="Draft"
            color="neutral"
            variant="subtle"
          />
        </div>
      </UCard>

      <UCard class="bg-white/90 shadow-sm">
        <p class="text-sm text-slate-500">
          Form Terisi
        </p>

        <p class="mt-2 text-2xl font-semibold text-slate-900">
          2 / 3
        </p>
      </UCard>

      <UCard class="bg-white/90 shadow-sm">
        <p class="text-sm text-slate-500">
          Progress
        </p>

        <p class="mt-2 text-2xl font-semibold text-slate-900">
          67%
        </p>
      </UCard>
    </section>
  </div>
</template>