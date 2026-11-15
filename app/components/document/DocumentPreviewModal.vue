<script setup lang="ts">
/**
 * Modal preview dokumen PDF dari endpoint backend.
 * Berkas diambil dulu sebagai blob agar error (mis. koneksi Drive bermasalah)
 * dapat ditampilkan sebagai pesan yang jelas.
 *
 * Contoh:
 *   <DocumentPreviewModal v-model:open="open" :url="url" :title="nama" :description="jenis" />
 */
const props = defineProps<{
  url: string
  title?: string
  description?: string
}>()

const open = defineModel<boolean>('open', { default: false })

const objectUrl = ref('')
const loading = ref(false)
const errorMessage = ref('')

function releaseObjectUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
  }
}

async function loadDocument() {
  releaseObjectUrl()
  errorMessage.value = ''

  if (!props.url) {
    errorMessage.value = 'Dokumen tidak dapat ditampilkan.'
    return
  }

  loading.value = true

  try {
    const blob = await $fetch<Blob>(props.url, {
      responseType: 'blob',
      credentials: 'include',
    })

    objectUrl.value = URL.createObjectURL(blob)
  } catch (error: unknown) {
    const data = (error as { data?: unknown }).data
    let message = ''

    // Respons error berupa blob JSON karena responseType: 'blob'.
    if (data instanceof Blob) {
      try {
        message = JSON.parse(await data.text())?.statusMessage ?? ''
      } catch {
        message = ''
      }
    } else if (data && typeof data === 'object' && 'statusMessage' in data) {
      message = String((data as { statusMessage?: string }).statusMessage ?? '')
    }

    errorMessage.value = message || 'Dokumen gagal dimuat. Silakan coba lagi.'
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.url] as const,
  ([isOpen]) => {
    if (isOpen) {
      loadDocument()
    } else {
      releaseObjectUrl()
    }
  },
)

onBeforeUnmount(releaseObjectUrl)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title || 'Preview Dokumen'"
    :description="description"
    :ui="{ content: 'max-w-5xl' }"
  >
    <template #body>
      <div
        v-if="loading"
        class="flex h-[70vh] items-center justify-center gap-3 text-sm text-slate-500"
      >
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        Memuat dokumen...
      </div>

      <div
        v-else-if="errorMessage"
        class="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <UIcon name="i-lucide-circle-alert" class="size-8 text-red-500" />
        <p class="max-w-md text-sm leading-6 text-slate-600">
          {{ errorMessage }}
        </p>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="loadDocument"
        >
          Coba Lagi
        </UButton>
      </div>

      <div
        v-else-if="objectUrl"
        class="h-[70vh] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      >
        <iframe
          :src="objectUrl"
          class="h-full w-full"
          :title="title || 'Preview Dokumen'"
        />
      </div>
    </template>
  </UModal>
</template>
