import { getProfile } from '../../services/profile.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  return {
    success: true,
    data: await getProfile(user),
  }
})
