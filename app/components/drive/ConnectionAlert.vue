<script setup lang="ts">
/**
 * Peringatan di beranda Super Admin bila koneksi Google Drive aplikasi bermasalah (docs/08 K-31).
 * Tidak tampil apa pun selama koneksi normal.
 */
type DriveConnection = {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'DISCONNECTED' | 'UNKNOWN'
  checkedAt: string
  canReconnectInApp: boolean
}

const { data, refresh } = useFetch<DriveConnection>('/api/admin/google-drive/status', {
  key: 'google-drive-status',
  server: false,
  lazy: true,
  credentials: 'include',
})

const rechecking = ref(false)

async function recheck() {
  rechecking.value = true
  try {
    data.value = await $fetch<DriveConnection>('/api/admin/google-drive/status', {
      query: { refresh: '1' },
      credentials: 'include',
    })
  } catch {
    await refresh()
  } finally {
    rechecking.value = false
  }
}

const notice = computed(() => {
  switch (data.value?.status) {
    case 'DISCONNECTED':
      return {
        color: 'error' as const,
        title: 'Koneksi Google Drive terputus',
        description: 'Unggah dan preview dokumen tidak berfungsi sampai Drive dihubungkan ulang.',
      }
    case 'NOT_CONNECTED':
      return {
        color: 'error' as const,
        title: 'Google Drive belum terhubung',
        description: 'Unggah dan preview dokumen tidak berfungsi sampai Drive dihubungkan.',
      }
    case 'UNKNOWN':
      return {
        color: 'warning' as const,
        title: 'Status Google Drive belum dapat diperiksa',
        description: 'Mungkin gangguan jaringan sementara. Periksa ulang beberapa saat lagi.',
      }
    default:
      return null
  }
})

const showSteps = computed(() =>
  (data.value?.status === 'DISCONNECTED' || data.value?.status === 'NOT_CONNECTED') && !data.value.canReconnectInApp,
)
</script>

<template>
  <UAlert
    v-if="notice"
    :color="notice.color"
    variant="subtle"
    icon="i-lucide-hard-drive"
    :title="notice.title"
  >
    <template #description>
      <p>{{ notice.description }}</p>

      <ol v-if="showSteps" class="mt-2 list-decimal space-y-0.5 pl-5">
        <li>Di komputer pengembang, jalankan aplikasi lokal dan buka <code>/api/auth/google</code> sebagai Super Admin.</li>
        <li>Salin refresh token baru ke env <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> di Vercel.</li>
        <li>Redeploy aplikasi, lalu Periksa Ulang.</li>
      </ol>
    </template>

    <template #actions>
      <UButton
        v-if="data?.canReconnectInApp && data.status !== 'UNKNOWN'"
        size="xs"
        :color="notice.color"
        icon="i-lucide-link"
        to="/api/auth/google"
        external
      >
        Hubungkan
      </UButton>
      <UButton
        size="xs"
        :color="notice.color"
        variant="outline"
        icon="i-lucide-refresh-cw"
        :loading="rechecking"
        @click="recheck"
      >
        Periksa Ulang
      </UButton>
    </template>
  </UAlert>
</template>
