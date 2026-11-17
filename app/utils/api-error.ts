/**
 * Mengambil pesan error dari respons `$fetch` (server mengirim `statusMessage`).
 * Contoh: `toast.add({ title: 'Gagal', description: getApiErrorMessage(error, 'Data gagal disimpan.') })`
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { statusMessage?: string, message?: string } } | null)?.data
  return data?.statusMessage || data?.message || fallback
}
