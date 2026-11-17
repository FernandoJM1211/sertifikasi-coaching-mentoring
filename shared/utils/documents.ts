/**
 * Jenis dokumen persyaratan administrasi yang diunggah saat pendaftaran.
 * Nilai disimpan di kolom `document_type` pada sheet `application_documents`.
 */

export const APPLICATION_DOCUMENT_TYPES = [
  'IJAZAH',
  'SK_JABATAN',
  'SERTIFIKAT_COACHING_MENTORING',
  'BUKTI_PRAKTIK_COACHING_MENTORING',
] as const

export type ApplicationDocumentType = (typeof APPLICATION_DOCUMENT_TYPES)[number]

export const APPLICATION_DOCUMENT_LABELS: Record<ApplicationDocumentType, string> = {
  IJAZAH: 'Ijazah Terakhir',
  SK_JABATAN: 'SK Jabatan Terakhir',
  SERTIFIKAT_COACHING_MENTORING: 'Sertifikat Pelatihan Coaching dan Mentoring',
  BUKTI_PRAKTIK_COACHING_MENTORING: 'Log Book / Portofolio Praktik Coaching dan Mentoring',
}

export const APPLICATION_DOCUMENT_ICONS: Record<ApplicationDocumentType, string> = {
  IJAZAH: 'i-lucide-graduation-cap',
  SK_JABATAN: 'i-lucide-file-badge-2',
  SERTIFIKAT_COACHING_MENTORING: 'i-lucide-award',
  BUKTI_PRAKTIK_COACHING_MENTORING: 'i-lucide-briefcase-business',
}

/** Dokumen tambahan yang hanya ada di CMSP-01. */
const ADDITIONAL_DOCUMENT_LABELS: Record<string, string> = {
  KTP: 'KTP',
  SURAT_TUGAS: 'Surat Tugas Instansi',
}

const ADDITIONAL_DOCUMENT_ICONS: Record<string, string> = {
  KTP: 'i-lucide-id-card',
  SURAT_TUGAS: 'i-lucide-file-text',
}

export function getApplicationDocumentLabel(documentType: string): string {
  return (
    APPLICATION_DOCUMENT_LABELS[documentType as ApplicationDocumentType] ??
    ADDITIONAL_DOCUMENT_LABELS[documentType] ??
    documentType
  )
}

export function getApplicationDocumentIcon(documentType: string): string {
  return (
    APPLICATION_DOCUMENT_ICONS[documentType as ApplicationDocumentType] ??
    ADDITIONAL_DOCUMENT_ICONS[documentType] ??
    'i-lucide-file-text'
  )
}

/**
 * Ukuran maksimum satu berkas unggahan (4 MB).
 * Dibatasi di bawah batas body request hosting serverless (Vercel: 4,5 MB per request).
 */
export const MAX_UPLOAD_SIZE_MB = 4

/** Ukuran maksimum satu dokumen PDF. */
export const MAX_PDF_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
