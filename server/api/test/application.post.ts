import { createApplication } from '../../repositories/application.repository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const application =
    await createApplication({
      person_id: body.person_id ?? '',
      period_id: body.period_id ?? '',
      category_id: body.category_id ?? '',
      full_name_snapshot:
        body.full_name_snapshot ?? '',
      nip_snapshot:
        body.nip_snapshot ?? '',
      institution_name:
        body.institution_name ?? '',
      region:
        body.region ?? '',
      email_snapshot:
        body.email_snapshot ?? '',
      phone_snapshot:
        body.phone_snapshot ?? '',
      last_education:
        body.last_education ?? '',
      position:
        body.position ?? '',
      application_status:
        body.application_status ?? '',
      submitted_at:
        body.submitted_at ??
        new Date().toISOString(),
    })

  return {
    success: true,
    data: application,
  }
})