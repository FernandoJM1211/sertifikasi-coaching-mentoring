import { createPerson } from '../../repositories/person.repository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const person = await createPerson({
    full_name: body.full_name ?? '',
    nip: body.nip ?? '',
    email: body.email ?? '',
    phone_number: body.phone_number ?? '',
    institution_name:
      body.institution_name ?? '',
    region: body.region ?? '',
    education_level:
      body.education_level ?? '',
    position_name:
      body.position_name ?? '',
  })

  return {
    success: true,
    data: person,
  }
})