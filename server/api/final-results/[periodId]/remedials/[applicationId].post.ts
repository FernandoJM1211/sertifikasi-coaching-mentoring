import { decideRemedial } from '../../../../services/final-result.service'
import { REMEDIAL_DECISIONS, type RemedialDecision } from '../../../../../shared/utils/final-result'

/** Verifikator / Super Admin: nyatakan tugas remedial peserta Lulus / Tidak Lulus (final). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['VERIFIKATOR', 'SUPER_ADMIN'])
  const periodId = requireRouterParam(event, 'periodId', 'ID periode')
  const applicationId = requireRouterParam(event, 'applicationId', 'ID pengajuan')
  const body = (await readBody(event)) as unknown
  const decision = body && typeof body === 'object' ? (body as Record<string, unknown>).decision : undefined

  if (typeof decision !== 'string' || !REMEDIAL_DECISIONS.includes(decision as RemedialDecision)) {
    throw createError({ statusCode: 400, statusMessage: 'Keputusan remedial tidak valid.' })
  }

  const data = await decideRemedial(user, periodId, applicationId, decision as RemedialDecision)

  return {
    success: true,
    message: data.decision === 'PASSED' ? 'Peserta dinyatakan lulus remedial.' : 'Peserta dinyatakan tidak lulus remedial.',
    data,
  }
})
