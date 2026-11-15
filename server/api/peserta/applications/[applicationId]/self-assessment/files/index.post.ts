import { uploadSelfAssessmentFile } from '../../../../../../services/self-assessment.service'
import { MAX_SELF_ASSESSMENT_FILE_BYTES } from '../../../../../../../shared/utils/self-assessment'

// Satu file (maks. 5 MB) + field teks & boundary multipart.
const MAX_REQUEST_BYTES = MAX_SELF_ASSESSMENT_FILE_BYTES + 64 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['PESERTA'])
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')

  assertRateLimit(
    `self-assessment:upload:${user.user_id}`,
    60,
    60 * 60 * 1000,
    'Terlalu banyak unggahan. Silakan coba lagi nanti.',
  )

  const contentLength = Number(getRequestHeader(event, 'content-length'))

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw createError({ statusCode: 411, statusMessage: 'Ukuran berkas tidak diketahui.' })
  }

  if (contentLength > MAX_REQUEST_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Ukuran file maksimal 5 MB.' })
  }

  const parts = await readMultipartFormData(event)
  const purpose = parts?.find((part) => part.name === 'purpose' && !part.filename)?.data.toString('utf-8') ?? ''
  const filePart = parts?.find((part) => part.name === 'file' && part.filename)

  return {
    success: true,
    data: await uploadSelfAssessmentFile(
      user,
      applicationId,
      purpose,
      filePart ? multipartPartToFile(filePart) : undefined,
    ),
  }
})
