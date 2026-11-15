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
  <UModal
    v-model:open="open"
    :title="title || 'Preview Link'"
    :description="description"
    :ui="{ content: 'max-w-5xl' }"
  >
    <template #body>
      <div class="space-y-3">
        <div class="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
          <iframe
            v-if="open && embedUrl"
            :src="embedUrl"
            class="h-full w-full"
            :title="title || 'Preview Link'"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-slate-500">
            Jika tidak tampil, pastikan akses link sudah dibuka untuk "Siapa saja yang memiliki link".
          </p>
          <UButton
            :to="url"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="outline"
            icon="i-lucide-external-link"
            size="sm"
          >
            Buka di Tab Baru
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
