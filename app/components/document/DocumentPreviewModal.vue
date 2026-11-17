<script setup lang="ts">
/**
 * Modal preview dokumen PDF dari endpoint backend.
 * Berkas diambil dulu sebagai blob agar error (mis. koneksi Drive bermasalah)
 * dapat ditampilkan sebagai pesan yang jelas.
 *
 * Contoh:
 *   <DocumentPreviewModal v-model:open="open" :url="url" :title="nama" :description="jenis" />
 *   <DocumentPreviewModal v-model:open="open" :file="fileLokal" />   // berkas yang belum diunggah
 */
const props = defineProps<{
  url?: string
  /** Berkas lokal dari input file (mis. form pendaftaran); dipakai bila diisi. */
  file?: File | null
  title?: string
  description?: string
}>()

const open = defineModel<boolean>('open', { default: false })

const objectUrl = ref('')
const mimeType = ref('')
const loading = ref(false)

// Hanya PDF & gambar yang dapat ditampilkan browser. Berkas lain (mis. Word)
// disajikan server sebagai unduhan, jadi tidak dimuat ke iframe agar tidak
// langsung terunduh tanpa penjelasan.
const isPdf = computed(() => mimeType.value === 'application/pdf')
const isImage = computed(() => mimeType.value === 'image/png' || mimeType.value === 'image/jpeg')
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

  // Berkas lokal: langsung ditampilkan tanpa memanggil server.
  if (props.file) {
    mimeType.value = props.file.type
    objectUrl.value = URL.createObjectURL(props.file)
    return
  }

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

    mimeType.value = blob.type
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
  () => [open.value, props.url, props.file] as const,
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
        v-else-if="objectUrl && isPdf"
        class="h-[70vh] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      >
        <iframe
          :src="objectUrl"
          class="h-full w-full"
          :title="title || 'Preview Dokumen'"
        />
      </div>

      <div
        v-else-if="objectUrl && isImage"
        class="flex max-h-[70vh] w-full items-center justify-center overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-2"
      >
        <img :src="objectUrl" :alt="title || 'Preview Dokumen'" class="max-h-[66vh] max-w-full object-contain">
      </div>

      <div
        v-else-if="objectUrl"
        class="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <UIcon name="i-lucide-file-text" class="size-10 text-primary" />
        <p class="max-w-md text-sm leading-6 text-slate-600">
          Pratinjau tidak tersedia untuk jenis berkas ini (mis. Word).
          Silakan unduh berkas untuk membukanya.
        </p>
        <UButton
          :href="objectUrl"
          :download="title || 'dokumen'"
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
        >
          Unduh Berkas
        </UButton>
      </div>
    </template>
  </UModal>
</template>
