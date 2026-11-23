<script setup lang="ts">
/**
 * Modal preview link evidence (video YouTube atau file Google Drive) lewat embed.
 * URL embed dibentuk ulang dari ID yang sudah divalidasi (lihat parseEvidenceLink),
 * bukan dari teks input peserta secara langsung.
 *
 * Contoh:
 *   <DocumentLinkPreviewModal v-model:open="open" :embed-url="info.embedUrl" :url="info.url" />
 */
defineProps<{
  embedUrl: string
  url: string
  title?: string
  description?: string
}>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <!-- Ukuran & header sama dengan <DocumentPreviewModal> (hampir layar penuh, header tipis). -->
  <UModal
    v-model:open="open"
    :title="title || 'Preview Link'"
    :description="description"
    :ui="{
      content: 'w-[96vw] max-w-7xl sm:max-h-[96vh]',
      header: 'min-h-0 px-4 py-2.5 sm:px-5',
      body: 'p-2 sm:p-3',
    }"
  >
    <template #header>
      <div class="flex w-full items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-slate-900" :title="title || 'Preview Link'">
            {{ title || 'Preview Link' }}
          </p>
          <p v-if="description" class="truncate text-xs text-slate-600">{{ description }}</p>
        </div>
        <UButton
          v-if="url"
          :to="url"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-external-link"
        >
          <span class="hidden sm:inline">Buka di Tab Baru</span>
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          aria-label="Tutup preview"
          @click="open = false"
        />
      </div>
    </template>

    <template #body>
      <div class="flex h-[calc(96vh-5rem)] w-full flex-col overflow-hidden rounded-lg border border-slate-300 bg-slate-900">
        <iframe
          v-if="open && embedUrl"
          :src="embedUrl"
          class="min-h-0 w-full flex-1"
          :title="title || 'Preview Link'"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
        <p class="shrink-0 bg-white px-3 py-1.5 text-xs text-slate-600">
          Jika tidak tampil, pastikan akses link sudah dibuka untuk "Siapa saja yang memiliki link", atau gunakan Buka di Tab Baru.
        </p>
      </div>
    </template>
  </UModal>
</template>
