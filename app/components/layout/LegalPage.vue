<script setup lang="ts">
/**
 * Kerangka halaman dokumen publik (Kebijakan Privasi, Syarat & Ketentuan).
 * Tautan halaman ini didaftarkan pada Branding Google OAuth, jadi harus dapat dibuka tanpa login.
 */
defineProps<{
  title: string
  /** Tanggal berlaku, mis. "23 November 2026". */
  effectiveDate: string
}>()
</script>

<template>
  <section class="mx-auto w-full max-w-3xl px-6 py-10 lg:px-8">
    <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      Beranda
    </NuxtLink>

    <div class="mt-4 rounded-xl border border-slate-300 bg-white/90 p-6 shadow-sm sm:p-8">
      <p class="text-sm font-medium text-primary">Sertifikasi Coaching dan Mentoring Sektor Publik</p>
      <h1 class="mt-2 text-2xl font-bold tracking-tight text-blue-500 sm:text-3xl">{{ title }}</h1>
      <p class="mt-2 text-sm text-slate-600">Berlaku sejak {{ effectiveDate }}</p>

      <div class="legal-content mt-6 space-y-6 text-sm leading-7 text-slate-700">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.legal-content :deep(h2) {
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-slate-900);
}

.legal-content :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}

.legal-content :deep(li + li) {
  margin-top: 0.25rem;
}

.legal-content :deep(a) {
  color: var(--color-blue-600);
  text-decoration: underline;
}
</style>
