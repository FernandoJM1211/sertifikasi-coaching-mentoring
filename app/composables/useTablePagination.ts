import type { MaybeRefOrGetter } from 'vue'

/** Pilihan jumlah baris per halaman untuk semua tabel. */
export const TABLE_PAGE_SIZES = [5, 10, 20, 50] as const

/**
 * Paginasi sisi klien untuk tabel (data sudah difilter di halaman).
 *
 * Contoh:
 *   const pagination = useTablePagination(filteredItems)
 *   // v-for="item in pagination.items.value"
 *   // <TablePagination v-model:page="pagination.page.value" v-model:page-size="pagination.pageSize.value" :total="filteredItems.length" />
 *
 * Halaman kembali ke 1 saat ukuran halaman berubah, dan disesuaikan bila jumlah data berkurang
 * (mis. karena filter/pencarian).
 */
export function useTablePagination<T>(source: MaybeRefOrGetter<T[]>, defaultPageSize = 10) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)

  const all = computed(() => toValue(source))
  const total = computed(() => all.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  const items = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return all.value.slice(start, start + pageSize.value)
  })

  /** Nomor urut baris pertama pada halaman aktif (untuk kolom "No."). */
  const offset = computed(() => (page.value - 1) * pageSize.value)

  watch(pageSize, () => {
    page.value = 1
  })

  watch(totalPages, (pages) => {
    if (page.value > pages) page.value = pages
  })

  /** Kembali ke halaman 1, mis. saat filter atau kata pencarian berubah. */
  function reset() {
    page.value = 1
  }

  return { page, pageSize, total, totalPages, items, offset, reset }
}
