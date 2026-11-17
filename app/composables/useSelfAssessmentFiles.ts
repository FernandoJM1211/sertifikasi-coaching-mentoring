import {
  MAX_SELF_ASSESSMENT_FILE_BYTES,
  type SelfAssessmentUploadPurpose,
} from '~~/shared/utils/self-assessment'

export type SelfAssessmentFile = {
  file_id: string
  original_file_name: string
  mime_type: string
  file_size_bytes: number
  uploaded_at: string
}

/**
 * Unggah & preview berkas self assessment (dokumen CMSP-01 dan evidence CMSP-02).
 * Berkas langsung diunggah saat dipilih; baru tercatat di CMSP saat draft disimpan.
 */
export function useSelfAssessmentFiles(
  applicationId: () => string,
  /** Endpoint berkas lain, mis. milik Verifikator (hanya untuk preview). */
  basePathOverride?: () => string | undefined,
) {
  const toast = useToast()

  const basePath = () =>
    basePathOverride?.() ||
    `/api/peserta/applications/${encodeURIComponent(applicationId())}/self-assessment/files`

  function previewUrl(fileId: string) {
    return `${basePath()}/${encodeURIComponent(fileId)}`
  }

  async function upload(
    purpose: SelfAssessmentUploadPurpose,
    file: File,
  ): Promise<SelfAssessmentFile | null> {
    if (file.size > MAX_SELF_ASSESSMENT_FILE_BYTES) {
      toast.add({
        title: 'File terlalu besar',
        description: 'Ukuran file maksimal 4 MB.',
        color: 'warning',
        icon: 'i-lucide-circle-alert',
      })
      return null
    }

    try {
      const formData = new FormData()
      formData.append('purpose', purpose)
      formData.append('file', file)

      const response = await $fetch<{ data: SelfAssessmentFile }>(basePath(), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      return response.data
    } catch (error: unknown) {
      const data = (error as { data?: { statusMessage?: string } }).data

      toast.add({
        title: 'Gagal mengunggah file',
        description: data?.statusMessage || 'Terjadi kesalahan. Silakan coba lagi.',
        color: 'error',
        icon: 'i-lucide-circle-x',
      })

      return null
    }
  }

  return { upload, previewUrl }
}

export function formatFileInfo(file: SelfAssessmentFile | null) {
  if (!file) return 'Belum ada file.'

  const size = file.file_size_bytes
    ? `${(file.file_size_bytes / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`
    : ''

  const date = file.uploaded_at
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(file.uploaded_at))
    : ''

  return [file.original_file_name, size, date && `diunggah ${date}`]
    .filter(Boolean)
    .join(' · ')
}
