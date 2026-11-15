import {
  updateProfile,
  type ProfileUpdateInput,
} from '../../services/profile.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = await readBody<ProfileUpdateInput>(event)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data profil tidak valid.',
    })
  }

  assertRateLimit(`profile:update:${user.user_id}`, 30, 15 * 60 * 1000)

  return {
    success: true,
    message: 'Profil berhasil diperbarui.',
    data: await updateProfile(user, body),
  }
})
