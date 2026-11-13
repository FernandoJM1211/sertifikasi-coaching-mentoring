
<script setup lang="ts">
definePageMeta({
  layout: 'super-admin',
})

const quickLinks = [
  {
    title: 'Periode Sertifikasi',
    description: 'Kelola periode dan tahapan sertifikasi coaching dan mentoring.',
    icon: 'i-lucide-calendar-days',
    to: '/super-admin/periods',
  },
  {
    title: 'Pengelolaan Akun',
    description: 'Kelola akun Verifikator dan Assessor. Fitur ini akan dikembangkan berikutnya.',
    icon: 'i-lucide-users',
    to: '/super-admin/accounts',
    comingSoon: true,
  },
]
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-8">
    <section>
      <p class="text-sm font-medium text-primary">
        Panel Administrasi
      </p>

      <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Dashboard Super Admin
      </h1>

      <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Selamat datang di panel pengelolaan Sistem Sertifikasi Coaching dan
        Mentoring. Gunakan menu berikut untuk mengelola operasional sertifikasi.
      </p>
    </section>

    <section class="grid gap-5 sm:grid-cols-2">
      <UCard
        v-for="item in quickLinks"
        :key="item.title"
        class="ring-1 ring-slate-200/70 shadow-sm"
      >
        <div class="flex items-start gap-4">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <UIcon
              :name="item.icon"
              class="size-6 text-primary"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-semibold text-slate-900">
                {{ item.title }}
              </h2>

              <UBadge
                v-if="item.comingSoon"
                color="neutral"
                variant="subtle"
              >
                Segera hadir
              </UBadge>
            </div>

            <p class="mt-2 text-sm leading-6 text-slate-600">
              {{ item.description }}
            </p>

            <UButton
              v-if="!item.comingSoon"
              :to="item.to"
              class="mt-4"
              color="primary"
              variant="solid"
              trailing-icon="i-lucide-arrow-right"
            >
              Buka menu
            </UButton>

            <p
              v-else
              class="mt-4 text-xs text-slate-500"
            >
              Menu sedang dalam tahap pengembangan.
            </p>
          </div>
        </div>
      </UCard>
    </section>

    <section>
      <UCard class="ring-1 ring-slate-200/70 shadow-sm">
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-info"
            class="mt-0.5 size-5 shrink-0 text-primary"
          />

          <div>
            <h2 class="font-semibold text-slate-900">
              Informasi pengembangan
            </h2>

            <p class="mt-1 text-sm leading-6 text-slate-600">
              Saat ini, pengembangan difokuskan pada penyediaan area Super Admin
              dan pengelolaan periode sertifikasi. Fitur pengelolaan akun pegawai
              akan ditambahkan setelah akses dan kewenangan setiap role dipastikan.
            </p>
          </div>
        </div>
      </UCard>
    </section>
  </div>
</template>
