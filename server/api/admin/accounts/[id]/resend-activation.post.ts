import { resendPesertaActivation } from '../../../../services/peserta-account-provisioning.service'

// Kirim ulang tautan aktivasi ke akun peserta yang masih menunggu aktivasi.
export default defineEventHandler(async (event) => {
  const currentUser = await requireUser(event, ['SUPER_ADMIN'])
  const userId = requireRouterParam(event, 'id', 'ID akun')

  const { recipientEmail } = await resendPesertaActivation(userId)

  await recordAccountAudit(event, {
    actorUserId: currentUser.user_id,
    action: 'ACCOUNT_ACTIVATION_RESEND',
    targetUserId: userId,
    details: `Dikirim ke ${recipientEmail}`,
  })

  return {
    success: true,
    message: `Tautan aktivasi baru telah dikirim ke ${recipientEmail}.`,
  }
})
