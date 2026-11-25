/**
 * Pengumuman Sertifikasi & Hasil Akhir (tahap 8, kode `ANNOUNCEMENT`) — lihat docs/08 K-26.
 *
 * - Informasi kelulusan tampil ke peserta sejak **awal** tahap Pengumuman dan tetap tampil sesudahnya.
 * - **Akhir** tahap Pengumuman = batas kirim tugas remedial (link Google Drive, satu kali).
 * - Tugas remedial dinilai Verifikator / Super Admin: Lulus atau Tidak Lulus (final, tanpa pembatalan).
 */

export const ANNOUNCEMENT_STAGE = 'ANNOUNCEMENT'

/**
 * Status akhir peserta:
 * PASSED             lulus dari penetapan;
 * REMEDIAL_PENDING   remedial, belum mengirim tugas (masih dalam batas waktu);
 * REMEDIAL_SUBMITTED tugas remedial terkirim, menunggu tinjauan panitia;
 * REMEDIAL_PASSED    lulus remedial;
 * REMEDIAL_FAILED    tidak lulus remedial;
 * REMEDIAL_EXPIRED   tidak mengirim tugas remedial sampai batas waktu (tidak lulus);
 * WITHDRAWN          tidak melanjutkan (tidak mengerjakan tes tertulis, K-25; tidak lulus).
 */
export const FINAL_STATUSES = [
  'PASSED',
  'REMEDIAL_PENDING',
  'REMEDIAL_SUBMITTED',
  'REMEDIAL_PASSED',
  'REMEDIAL_FAILED',
  'REMEDIAL_EXPIRED',
  'WITHDRAWN',
] as const
export type FinalStatus = (typeof FINAL_STATUSES)[number]

export const FINAL_STATUS_LABELS: Record<FinalStatus, string> = {
  PASSED: 'Lulus',
  REMEDIAL_PENDING: 'Remedial',
  REMEDIAL_SUBMITTED: 'Menunggu Tinjauan',
  REMEDIAL_PASSED: 'Lulus Remedial',
  REMEDIAL_FAILED: 'Tidak Lulus',
  REMEDIAL_EXPIRED: 'Tidak Kirim Remedial',
  WITHDRAWN: 'Tidak Melanjutkan',
}

export const FINAL_STATUS_COLORS: Record<FinalStatus, 'success' | 'warning' | 'info' | 'error' | 'neutral'> = {
  PASSED: 'success',
  REMEDIAL_PENDING: 'warning',
  REMEDIAL_SUBMITTED: 'info',
  REMEDIAL_PASSED: 'success',
  REMEDIAL_FAILED: 'error',
  REMEDIAL_EXPIRED: 'error',
  WITHDRAWN: 'neutral',
}

/** Status yang berarti peserta dinyatakan lulus sertifikasi. */
export const isFinalPassed = (status: FinalStatus) => status === 'PASSED' || status === 'REMEDIAL_PASSED'

/** Keputusan panitia atas tugas remedial. */
export const REMEDIAL_DECISIONS = ['PASSED', 'FAILED'] as const
export type RemedialDecision = (typeof REMEDIAL_DECISIONS)[number]

export const REMEDIAL_LINK_MAX = 500
export const REMEDIAL_NOTE_MAX = 1000

/** Link tugas remedial wajib berupa link Google Drive / Google Docs (https). */
export function isGoogleDriveLink(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'drive.google.com' || url.hostname === 'docs.google.com')
  } catch {
    return false
  }
}
