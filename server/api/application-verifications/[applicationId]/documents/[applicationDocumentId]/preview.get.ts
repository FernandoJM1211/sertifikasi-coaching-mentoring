import { sendApplicationDocumentPreview } from '../../../../../services/application-document.service'

export default defineEventHandler(async (event) => {
  await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])

  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const applicationDocumentId = requireRouterParam(event, 'applicationDocumentId', 'ID dokumen')

  return sendApplicationDocumentPreview(event, applicationId, applicationDocumentId)
})
