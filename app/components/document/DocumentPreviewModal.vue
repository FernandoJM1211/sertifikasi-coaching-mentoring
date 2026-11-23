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
    // `preview=pdf`: berkas Word dikonversi server menjadi PDF (butuh beberapa detik);
    // jenis lain dikirim apa adanya. Tombol Unduh tetap memakai berkas asli (`url`).
    const separator = props.url.includes('?') ? '&' : '?'
    const blob = await $fetch<Blob>(`${props.url}${separator}preview=pdf`, {
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

/** Nama berkas Word → pesan memuat menyebut konversi (lebih lama dari PDF). */
const isWordFile = computed(() => /\.docx?$/i.test(props.title ?? ''))

/** PDF/gambar dapat dibuka di tab baru agar lebih lega (memakai berkas yang sudah dimuat). */
const canOpenInNewTab = computed(() => Boolean(objectUrl.value) && (isPdf.value || isImage.value))

function openInNewTab() {
  // Tanpa 'noopener': URL blob hanya dapat dibuka dari konteks asal yang sama.
  if (objectUrl.value) window.open(objectUrl.value, '_blank')
}
</script>

<template>
  <!-- Hampir layar penuh dengan header tipis agar area dokumen maksimal. -->
  <UModal
    v-model:open="open"
    :title="title || 'Preview Dokumen'"
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
          <p class="truncate text-sm font-semibold text-slate-900" :title="title || 'Preview Dokumen'">
            {{ title || 'Preview Dokumen' }}
          </p>
          <p v-if="description" class="truncate text-xs text-slate-600">{{ description }}</p>
        </div>
        <!-- Unduh berkas ASLI (mis. .docx), bukan hasil konversi preview. -->
        <UButton
          v-if="url && !loading"
          :href="url"
          :download="title || 'dokumen'"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-download"
        >
          <span class="hidden sm:inline">Unduh</span>
        </UButton>
        <UButton
          v-if="canOpenInNewTab"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-external-link"
          @click="openInNewTab"
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
      <div
        v-if="loading"
        class="flex h-[calc(96vh-5rem)] items-center justify-center gap-3 text-sm text-slate-600"
      >
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        {{ isWordFile ? 'Menyiapkan pratinjau dokumen Word (beberapa detik)...' : 'Memuat dokumen...' }}
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
        class="h-[calc(96vh-5rem)] w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-100"
      >
        <iframe
          :src="objectUrl"
          class="h-full w-full"
          :title="title || 'Preview Dokumen'"
        />
      </div>

      <div
        v-else-if="objectUrl && isImage"
        class="flex h-[calc(96vh-5rem)] w-full items-center justify-center overflow-auto rounded-lg border border-slate-300 bg-slate-100 p-2"
      >
        <img :src="objectUrl" :alt="title || 'Preview Dokumen'" class="max-h-full max-w-full object-contain">
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
