/**
 * Konstanta self assessment (CMSP-01 & CMSP-02) yang dipakai app/ dan server/.
 */

export const SELF_ASSESSMENT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'REVISION_REQUESTED',
  'VERIFIED',
] as const

export type SelfAssessmentStatus = (typeof SELF_ASSESSMENT_STATUSES)[number]

export const SELF_ASSESSMENT_STATUS_LABELS: Record<SelfAssessmentStatus | 'NEW', string> = {
  NEW: 'Belum Disimpan',
  DRAFT: 'Draft',
  SUBMITTED: 'Sudah Dikirim',
  REVISION_REQUESTED: 'Perlu Perbaikan',
  VERIFIED: 'Terverifikasi',
}

/** Status yang masih boleh diedit peserta. */
export const EDITABLE_SELF_ASSESSMENT_STATUSES: readonly string[] = [
  'DRAFT',
  'REVISION_REQUESTED',
]

/** Dokumen CMSP-01: 4 dari pendaftaran + 2 dokumen tambahan. */
export const CMSP01_DOCUMENT_TYPES = [
  'IJAZAH',
  'SK_JABATAN',
  'SERTIFIKAT_COACHING_MENTORING',
  'BUKTI_PRAKTIK_COACHING_MENTORING',
  'KTP',
  'SURAT_TUGAS',
] as const

export type Cmsp01DocumentType = (typeof CMSP01_DOCUMENT_TYPES)[number]

/**
 * Jenis unggahan self assessment & tipe file yang diizinkan.
 * Dokumen persyaratan pendaftaran hanya PDF.
 */
export const SELF_ASSESSMENT_UPLOAD_PURPOSES = {
  IJAZAH: ['application/pdf'],
  SK_JABATAN: ['application/pdf'],
  SERTIFIKAT_COACHING_MENTORING: ['application/pdf'],
  BUKTI_PRAKTIK_COACHING_MENTORING: ['application/pdf'],
  KTP: ['application/pdf', 'image/jpeg', 'image/png'],
  SURAT_TUGAS: ['application/pdf', 'image/jpeg', 'image/png'],
  EVIDENCE: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const

export type SelfAssessmentUploadPurpose = keyof typeof SELF_ASSESSMENT_UPLOAD_PURPOSES

export const SELF_ASSESSMENT_UPLOAD_ACCEPT: Record<SelfAssessmentUploadPurpose, string> = {
  IJAZAH: 'application/pdf,.pdf',
  SK_JABATAN: 'application/pdf,.pdf',
  SERTIFIKAT_COACHING_MENTORING: 'application/pdf,.pdf',
  BUKTI_PRAKTIK_COACHING_MENTORING: 'application/pdf,.pdf',
  KTP: 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png',
  SURAT_TUGAS: 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png',
  EVIDENCE: '.pdf,.doc,.docx',
}

/** Ukuran maksimum satu file self assessment (4 MB — lihat MAX_UPLOAD_SIZE_MB). */
export const MAX_SELF_ASSESSMENT_FILE_BYTES = 4 * 1024 * 1024

/** Batas jumlah baris agar payload tetap wajar. */
export const SELF_ASSESSMENT_LIMITS = {
  trainings: 30,
  practices: 100,
  evidencesPerUnit: 20,
  text: 500,
  longText: 2000,
  url: 1000,
} as const
