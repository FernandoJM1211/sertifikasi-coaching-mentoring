/** Satu pilihan di <TableActionModal> (tabel dengan lebih dari satu aksi per baris, docs/05). */
export type TableAction = {
  label: string
  description: string
  icon: string
  /** Warna ikon & hover: blue (lihat), amber (ubah), red (berbahaya), sky (lainnya). */
  tone?: 'blue' | 'amber' | 'red' | 'sky'
  /** Tujuan tautan; dibuka di tab baru bila `newTab`. */
  to?: string
  newTab?: boolean
  onSelect?: () => void
  /** Alasan aksi belum tersedia (aksi ditampilkan nonaktif). */
  disabledReason?: string
}
