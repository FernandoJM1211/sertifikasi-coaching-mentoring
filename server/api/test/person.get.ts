import { findPersonByNip } from '../../repositories/person.repository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const nip =
    typeof query.nip === 'string'
      ? query.nip
      : ''

  if (!nip) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parameter nip wajib diisi.',
    })
  }

  const person = await findPersonByNip(nip)

  return {
    success: true,
    found: !!person,
    data: person,
  }
})