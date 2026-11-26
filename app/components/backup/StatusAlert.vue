<script setup lang="ts">
/**
 * Status backup spreadsheet di beranda Super Admin (docs/08 K-32): waktu backup terakhir,
 * tombol Backup Sekarang & buka folder. Kuning bila belum ada backup / backup terakhir > 2 hari.
 * Tidak tampil bila Drive tidak dapat diakses (sudah diperingatkan oleh <DriveConnectionAlert>).
 */
type BackupStatus = {
  available: boolean
  lastBackupAt: string
  lastBackupUrl: string
  folderUrl: string
  count: number
  stale: boolean
}

const toast = useToast()

const { data, refresh } = useFetch<BackupStatus>('/api/admin/backups', {
  key: 'backup-status',
  server: false,
  lazy: true,
  credentials: 'include',
})

const running = ref(false)

async function backupNow() {
  if (running.value) return
  running.value = true

  try {
    const response = await $fetch<{ message: string }>('/api/admin/backups', { method: 'POST', credentials: 'include' })
    toast.add({ title: 'Backup berhasil', description: response.message, color: 'success', icon: 'i-lucide-database-backup' })
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Backup gagal',
      description: getApiErrorMessage(error, 'Backup belum dapat dibuat. Coba lagi nanti.'),
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  } finally {
    running.value = false
  }
}

function formatWib(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)) + ' WIB'
}

const notice = computed(() => {
  const status = data.value
  if (!status?.available) return null

  if (!status.lastBackupAt) {
    return { color: 'warning' as const, title: 'Belum ada backup data', description: 'Backup otomatis berjalan setiap hari pukul 02.00 WIB.' }
  }

  return {
    color: status.stale ? 'warning' as const : 'neutral' as const,
    title: `Backup terakhir ${formatWib(status.lastBackupAt)}`,
    description: status.stale
      ? 'Backup otomatis harian tidak berjalan lebih dari 2 hari. Periksa CRON_SECRET di Vercel.'
      : `${status.count} salinan tersimpan di folder CMSP Backup (jangan dibagikan).`,
  }
})
</script>

<template>
  <UAlert
    v-if="notice"
    :color="notice.color"
    variant="subtle"
    icon="i-lucide-database-backup"
    :title="notice.title"
    :description="notice.description"
  >
    <template #actions>
      <UButton size="xs" :color="notice.color" icon="i-lucide-save" :loading="running" @click="backupNow">
        Backup
      </UButton>
      <UButton
        v-if="data?.folderUrl"
        size="xs"
        :color="notice.color"
        variant="outline"
        icon="i-lucide-folder-open"
        :to="data.folderUrl"
        target="_blank"
        external
      >
        Folder
      </UButton>
    </template>
  </UAlert>
</template>
