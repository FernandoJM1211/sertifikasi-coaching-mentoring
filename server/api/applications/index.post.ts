import { createApplication } from '../../services/application.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return await createApplication(body)
})