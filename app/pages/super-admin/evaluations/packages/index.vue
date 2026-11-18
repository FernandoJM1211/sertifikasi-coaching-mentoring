<script setup lang="ts">
/** Daftar paket soal evaluasi (Super Admin). */
definePageMeta({ layout: 'super-admin' })
useHead({ title: 'Paket Soal' })

type PackageSummary = {
  package_id: string
  package_name: string
  description: string
  status: 'ACTIVE' | 'ARCHIVED'
  question_count: number
  active_question_count: number
  period_ids: string[]
  used: boolean
  updated_at: string
}

const loading = ref(true)
const errorMessage = ref('')
const packages = ref<PackageSummary[]>([])
const searchQuery = ref('')
const statusFilter = ref('ACTIVE')

const STATUS_FILTERS = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'ARCHIVED', label: 'Diarsipkan' },
  { value: 'ALL', label: 'Semua Status' },
]

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: PackageSummary[] }>('/api/evaluation/packages', { credentials: 'include' })
    packages.value = response.data
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Daftar paket soal belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filteredPackages = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return packages.value.filter((item) =>
    (statusFilter.value === 'ALL' || item.status === statusFilter.value) &&
    (!query || item.package_name.toLowerCase().includes(query)),
  )
})

/* ---------------- Paginasi tabel ---------------- */
const { page: tablePage, pageSize: tablePageSize, items: pagedItems, reset: resetTablePage } = useTablePagination(filteredPackages)
watch([searchQuery, statusFilter], resetTablePage)
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <section class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight text-blue-500 sm:text-3xl">Paket Soal</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Kumpulan soal pilihan dari bank soal. Paket dipasangkan ke periode melalui menu Perencanaan Evaluasi.
        </p>
      </div>
      <UButton icon="i-lucide-plus" to="/super-admin/evaluations/packages/baru">Buat Paket</UButton>
    </section>

    <div v-if="loading && packages.length === 0" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat paket soal...</span>
    </div>

    <UAlert v-else-if="errorMessage" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <UCard v-else>
      <template #header>
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="font-semibold text-slate-900">Daftar Paket Soal</h2>
              <p class="mt-1 text-sm text-slate-600">Perubahan paket berlaku pada periode setelah perencanaan evaluasinya diterapkan ulang.</p>
            </div>
            <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" size="sm" :loading="loading" class="self-start" @click="load">
              Muat Ulang
            </UButton>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 sm:flex-row">
            <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Cari nama paket..." class="w-full" />
            <USelect v-model="statusFilter" :items="STATUS_FILTERS" value-key="value" label-key="label" class="w-full sm:w-44" />
          </div>
        </div>
      </template>

      <div v-if="filteredPackages.length === 0" class="py-10 text-center">
        <UIcon name="i-lucide-package" class="mx-auto size-9 text-slate-500" />
        <p class="mt-3 font-medium text-slate-700">
          {{ packages.length === 0 ? 'Belum Ada Paket Soal' : 'Tidak ada paket yang sesuai' }}
        </p>
        <p class="mt-1 text-sm text-slate-600">
          {{ packages.length === 0 ? 'Buat paket dengan memilih soal dari bank soal.' : 'Coba ubah filter atau kata pencarian.' }}
        </p>
        <UButton v-if="packages.length === 0" class="mt-4" icon="i-lucide-plus" to="/super-admin/evaluations/packages/baru">
          Buat Paket
        </UButton>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] table-fixed text-left text-sm">
          <colgroup>
            <col />
            <col class="w-32" />
            <col class="w-44" />
            <col class="w-28" />
            <col class="w-20" />
          </colgroup>
          <thead>
            <tr class="border-b border-blue-100">
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Paket</th>
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Jumlah Soal</th>
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Diperbarui</th>
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Status</th>
              <th class="px-4 py-3 text-center font-semibold text-blue-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pagedItems" :key="item.package_id" class="border-b border-slate-200 last:border-0">
              <td class="px-4 py-3">
                <p class="truncate font-medium text-slate-800" :title="item.package_name">{{ item.package_name }}</p>
              </td>
              <td class="px-4 py-3 text-center text-slate-600">{{ item.question_count }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-center text-slate-600">{{ formatDateTimeId(item.updated_at) }}</td>
              <td class="px-4 py-3 text-center">
                <UBadge :color="item.status === 'ACTIVE' ? 'success' : 'neutral'" variant="subtle">
                  {{ item.status === 'ACTIVE' ? 'Aktif' : 'Arsip' }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-center">
                <UButton
                  :to="`/super-admin/evaluations/packages/${item.package_id}`"
                  icon="i-lucide-pencil"
                  color="primary"
                  variant="solid"
                  square
                  size="md"
                  aria-label="Ubah paket"
                  title="Ubah paket"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <TablePagination v-model:page="tablePage" v-model:page-size="tablePageSize" :total="filteredPackages.length" label="paket" />
      </template>
    </UCard>
  </div>
</template>
