<script setup lang="ts">
/**
 * Footer aplikasi.
 * - `full`    : halaman publik (landing, login, pendaftaran, aktivasi akun) — satu pita horizontal.
 * - `compact` : kartu di bawah konten dashboard dengan tombol "Butuh Bantuan?" (modal email/WhatsApp).
 */
withDefaults(defineProps<{ variant?: 'full' | 'compact' }>(), {
  variant: 'full',
})

const year = new Date().getFullYear()

const contact = {
  unit: 'Direktorat Teknologi dan Digitalisasi Pembelajaran',
  institution: 'Lembaga Administrasi Negara',
  address: 'Jl. Veteran No.10, Jakarta 10110',
  email: 'dit.tekdigi@gmail.com',
  whatsappLabel: '+62 877-8221-4464',
  whatsappUrl: 'https://wa.me/6287782214464',
}

const helpOpen = ref(false)

const helpOptions = [
  {
    label: 'Kirim Email',
    description: contact.email,
    icon: 'i-lucide-mail',
    href: `mailto:${contact.email}?subject=${encodeURIComponent('Bantuan Sistem Sertifikasi CMSP')}`,
    external: false,
    tone: 'border-slate-200 hover:border-blue-300 hover:bg-blue-50',
    iconTone: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Chat WhatsApp',
    description: contact.whatsappLabel,
    icon: 'i-lucide-message-circle',
    href: contact.whatsappUrl,
    external: true,
    tone: 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50',
    iconTone: 'bg-emerald-50 text-emerald-600',
  },
]
</script>

<template>
  <!-- Footer dashboard: kartu ringkas -->
  <footer
    v-if="variant === 'compact'"
    class="mt-8 flex flex-col gap-2 rounded-xl border border-slate-300 bg-white/90 px-5 py-3 text-xs text-slate-600 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
  >
    <p>© {{ year }} {{ contact.unit }} — {{ contact.institution }}</p>

    <UButton
      label="Butuh Bantuan?"
      variant="link"
      size="sm"
      class="self-start px-0 sm:self-auto"
      @click="helpOpen = true"
    />

    <UModal
      v-model:open="helpOpen"
      title="Butuh Bantuan?"
      description="Hubungi tim pengelola sistem melalui salah satu kanal berikut."
    >
      <template #body>
        <div class="space-y-3">
          <a
            v-for="option in helpOptions"
            :key="option.label"
            :href="option.href"
            :target="option.external ? '_blank' : undefined"
            :rel="option.external ? 'noopener noreferrer' : undefined"
            class="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition"
            :class="option.tone"
            @click="helpOpen = false"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg" :class="option.iconTone">
              <UIcon :name="option.icon" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900">{{ option.label }}</p>
              <p class="mt-1 break-all text-xs text-slate-600">{{ option.description }}</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-500" />
          </a>

          <p class="pt-1 text-xs text-slate-600">
            {{ contact.unit }}, {{ contact.institution }} · {{ contact.address }}
          </p>
        </div>
      </template>
    </UModal>
  </footer>

  <!-- Footer publik: satu pita horizontal -->
  <footer v-else class="w-full border-t border-slate-200 bg-white shadow-[0_-1px_3px_rgb(15_23_42/0.04)]">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
          <img src="/logo-lan.png" alt="Logo LAN" class="size-full scale-150 object-contain">
        </div>
        <div class="leading-tight">
          <p class="text-sm font-semibold text-slate-900">{{ contact.unit }}</p>
          <p class="text-xs text-slate-600">© {{ year }} {{ contact.institution }}</p>
        </div>
      </div>

      <ul class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
        <li class="flex items-center gap-2">
          <UIcon name="i-lucide-map-pin" class="size-4 shrink-0 text-blue-500" />
          {{ contact.address }}
        </li>
        <li>
          <a :href="`mailto:${contact.email}`" class="flex items-center gap-2 transition hover:text-blue-600">
            <UIcon name="i-lucide-mail" class="size-4 shrink-0 text-blue-500" />
            {{ contact.email }}
          </a>
        </li>
        <li>
          <a :href="contact.whatsappUrl" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 transition hover:text-blue-600">
            <UIcon name="i-lucide-message-circle" class="size-4 shrink-0 text-blue-500" />
            {{ contact.whatsappLabel }}
          </a>
        </li>
      </ul>
    </div>
  </footer>
</template>
