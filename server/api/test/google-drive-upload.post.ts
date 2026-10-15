import {
  uploadToGoogleDrive,
} from '../../services/google-drive.service'

export default defineEventHandler(async () => {
  const dummyPdf = Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`,
    'utf-8',
  )

  const result = await uploadToGoogleDrive({
    fileName: 'TEST_CMSP_GOOGLE_DRIVE.pdf',
    mimeType: 'application/pdf',
    buffer: dummyPdf,
  })

  return {
    success: true,
    message: 'Upload Google Drive berhasil.',
    data: result,
  }
})