<script setup lang="ts">
/**
 * Footer paginasi tabel yang seragam: ringkasan baris, pilihan jumlah per halaman, dan navigasi halaman.
 * Dipakai bersama composable `useTablePagination`.
 *
 * Contoh:
 *   <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" label="peserta" />
 */
import { TABLE_PAGE_SIZES } from '~/composables/useTablePagination'

const props = withDefaults(defineProps<{
  total: number
  /** Satuan data pada teks ringkasan, mis. "peserta", "soal". */
  label?: string
}>(), {
  label: 'data',
})

const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })

const pageSizeItems = TABLE_PAGE_SIZES.map((value): { label: string, value: number } => ({ label: String(value), value }))

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / pageSize.value)))
const rangeStart = computed(() => (props.total === 0 ? 0 : (page.value - 1) * pageSize.value + 1))
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, props.total))
</script>

<template>
  <div class="flex w-full flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p>
        Menampilkan {{ rangeStart }}–{{ rangeEnd }} dari {{ total }} {{ label }}
      </p>
      <div class="flex items-center gap-2">
        <span>Tampilkan</span>
        <USelect
          v-model="pageSize"
          :items="pageSizeItems"
          value-key="value"
          label-key="label"
          size="sm"
          class="w-20"
          aria-label="Jumlah baris per halaman"
        />
        <span>per halaman</span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-chevron-left"
        :disabled="page <= 1"
        @click="page--"
      >
        Sebelumnya
      </UButton>

      <span class="px-1 text-slate-600">{{ page }} / {{ totalPages }}</span>

      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        trailing-icon="i-lucide-chevron-right"
        :disabled="page >= totalPages"
        @click="page++"
      >
        Berikutnya
      </UButton>
    </div>
  </div>
</template>
