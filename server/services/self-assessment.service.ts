import type { H3Event } from 'h3'

import type { Application } from '../repositories/application.repository'
import { findApplicationDocumentsByApplicationId } from '../repositories/application-document.repository'
import {
  createFile,
  findFilesByIds,
} from '../repositories/file.repository'
import { findPersonById } from '../repositories/person.repository'
import {
  findCmsp01ByApplicationId,
  findCmsp01Documents,
  findCmsp01Practices,
  findCmsp01Trainings,
  findCmsp02ByApplicationId,
  findCmsp02Evidences,
  findLatestSelfAssessmentReview,
  replaceCmsp01Documents,
  replaceCmsp01Practices,
  replaceCmsp01Trainings,
  replaceCmsp02Evidences,
  upsertCmsp01,
  upsertCmsp02,
  type Cmsp01Submission,
} from '../repositories/self-assessment.repository'
import type { AuthenticatedUser } from './auth.service'
import { getStageAccess } from './certification-stage.service'
import { uploadToGoogleDrive } from './google-drive.service'
import { toPublicFile, sendStoredFile } from './application-document.service'
import { toPublicProfile } from './profile.service'
import {
  getCertificationInfo,
  requireOwnedApplication,
} from './peserta-application.service'
import { normalizeGender } from '../../shared/utils/person'
import { CMSP02_UNIT_CODES } from '../../shared/utils/cmsp02-units'
import {
  CMSP01_DOCUMENT_TYPES,
  EDITABLE_SELF_ASSESSMENT_STATUSES,
  MAX_SELF_ASSESSMENT_FILE_BYTES,
  SELF_ASSESSMENT_LIMITS,
  SELF_ASSESSMENT_UPLOAD_PURPOSES,
  type SelfAssessmentUploadPurpose,
} from '../../shared/utils/self-assessment'
import { getApplicationDocumentLabel } from '../../shared/utils/documents'

/* ------------------------------------------------------------------ */
/* Pemetaan field form (camelCase) <-> kolom sheet (snake_case)        */
/* ------------------------------------------------------------------ */

const APPLICANT_FIELDS = {
  fullName: 'full_name',
  nip: 'nip',
  rankName: 'rank_name',
  rankGroup: 'rank_group',
  gender: 'gender',
  birthPlace: 'birth_place',
  birthDate: 'birth_date',
  phoneNumber: 'phone_number',
  email: 'email',
  institution: 'institution_name',
  workUnit: 'work_unit',
  position: 'position_name',
  latestEducation: 'latest_education',
  educationQualification: 'education_qualification',
  domicileAddress: 'domicile_address',
} as const satisfies Record<string, keyof Cmsp01Submission>

type ApplicantField = keyof typeof APPLICANT_FIELDS
type Applicant = Record<ApplicantField, string>

type TrainingInput = { trainingName: string, organizer: string, year: string, jp: string }
type PracticeInput = { year: string, coacheeMentee: string, topic: string, duration: string }
type DocumentInput = { documentType: string, fileId: string }
type EvidenceInput = {
  unitCode: string
  evidenceName: string
  type: 'FILE' | 'URL'
  fileId: string
  url: string
  description: string
}

type SelfAssessmentPayload = {
  cmsp01: {
    applicant: Applicant
    trainings: TrainingInput[]
    practices: PracticeInput[]
    documents: DocumentInput[]
    declarationAccepted: boolean
  }
  cmsp02: {
    evidences: EvidenceInput[]
  }
}

/* ------------------------------------------------------------------ */
/* Status & hak edit                                                   */
/* ------------------------------------------------------------------ */

type EditingAccess = { allowed: boolean, message: string }

async function getEditingAccess(
  application: Application,
  status: string,
): Promise<EditingAccess> {
  if (application.application_status !== 'accepted') {
    return { allowed: false, message: 'Self assessment hanya tersedia untuk pengajuan yang sudah diterima.' }
  }

  if (status === 'SUBMITTED') {
    return { allowed: false, message: 'Self assessment sudah dikirim dan sedang menunggu verifikasi.' }
  }

  if (status === 'VERIFIED') {
    return { allowed: false, message: 'Self assessment sudah diverifikasi.' }
  }

  // Perbaikan boleh dilakukan selama tahap Self Assessment atau
  // tahap Verifikasi Self Assessment masih dibuka.
  const stages = status === 'REVISION_REQUESTED'
    ? ['SELF_ASSESSMENT', 'SELF_ASSESSMENT_VERIFICATION']
    : ['SELF_ASSESSMENT']

  let lastMessage = ''

  for (const stage of stages) {
    const access = await getStageAccess(application.period_id, stage)
    if (access.open) return { allowed: true, message: '' }
    lastMessage = access.message
  }

  return { allowed: false, message: `Self assessment tidak dapat diubah: ${lastMessage}` }
}

/**
 * Ringkasan self assessment untuk beranda peserta: status dan apakah saat ini masih
 * dapat diisi/diperbaiki (mengikuti aturan tahap yang sama dengan halaman Self Assessment).
 */
export async function getSelfAssessmentProgress(application: Application) {
  const [cmsp01, cmsp02] = await Promise.all([
    findCmsp01ByApplicationId(application.application_id),
    findCmsp02ByApplicationId(application.application_id),
  ])
  const status = cmsp01?.status || cmsp02?.status || 'NEW'
  const access = await getEditingAccess(application, status)

  return { status, editable: access.allowed }
}

async function requireEditing(application: Application, status: string) {
  const access = await getEditingAccess(application, status)

  if (!access.allowed) {
    throw createError({ statusCode: 409, statusMessage: access.message })
  }
}

/* ------------------------------------------------------------------ */
/* Membaca data                                                        */
/* ------------------------------------------------------------------ */

/**
 * Isi CMSP-01 & CMSP-02 sebuah pengajuan (tanpa aturan hak akses).
 * Dipakai oleh halaman peserta dan halaman verifikasi Verifikator.
 */
export async function loadSelfAssessmentContent(application: Application) {
  const [cmsp01, cmsp02, applicationDocuments, certification] = await Promise.all([
    findCmsp01ByApplicationId(application.application_id),
    findCmsp02ByApplicationId(application.application_id),
    findApplicationDocumentsByApplicationId(application.application_id),
    getCertificationInfo(application),
  ])

  const [trainings, practices, cmsp01Documents, evidences] = await Promise.all([
    cmsp01 ? findCmsp01Trainings(cmsp01.cmsp01_id) : [],
    cmsp01 ? findCmsp01Practices(cmsp01.cmsp01_id) : [],
    cmsp01 ? findCmsp01Documents(cmsp01.cmsp01_id) : [],
    cmsp02 ? findCmsp02Evidences(cmsp02.cmsp02_id) : [],
  ])

  const status = cmsp01?.status || cmsp02?.status || 'NEW'

  // Dokumen CMSP-01: dari data CMSP-01 jika sudah pernah disimpan,
  // jika belum, disalin awal dari dokumen pendaftaran.
  const documentFileIds = new Map<string, string>()

  if (cmsp01) {
    for (const document of cmsp01Documents) {
      documentFileIds.set(document.document_type, document.file_id)
    }
  } else {
    for (const document of applicationDocuments) {
      documentFileIds.set(document.document_type, document.file_id)
    }
  }

  const files = await findFilesByIds([
    ...documentFileIds.values(),
    ...evidences.map((evidence) => evidence.file_id),
  ])

  return {
    application: {
      application_id: application.application_id,
      application_status: application.application_status,
    },
    certification,
    status,
    submittedAt: cmsp01?.submitted_at ?? '',
    revisionCount: Number(cmsp01?.revision_count) || 0,
    hasCmsp01: Boolean(cmsp01),
    cmsp01: {
      applicant: cmsp01
        ? (Object.fromEntries(
            Object.entries(APPLICANT_FIELDS).map(([field, column]) => [field, cmsp01[column]]),
          ) as Applicant)
        : null,
      trainings: trainings.map((item) => ({
        trainingName: item.training_name,
        organizer: item.organizer,
        year: item.year,
        jp: item.jp,
      })),
      practices: practices.map((item) => ({
        year: item.year,
        coacheeMentee: item.coachee_mentee,
        topic: item.topic,
        duration: item.duration_minutes,
      })),
      documents: CMSP01_DOCUMENT_TYPES.map((documentType) => ({
        documentType,
        file: toPublicFile(files.get(documentFileIds.get(documentType) ?? '')),
      })),
      declarationAccepted: cmsp01?.declaration_accepted === 'TRUE',
    },
    cmsp02: {
      evidences: evidences.map((item) => ({
        unitCode: item.unit_code,
        evidenceName: item.evidence_name,
        type: item.evidence_type === 'URL' ? 'URL' : 'FILE',
        file: toPublicFile(files.get(item.file_id)),
        url: item.url,
        description: item.description,
      })),
    },
  }
}

export async function getSelfAssessment(
  user: AuthenticatedUser,
  applicationId: string,
) {
  const application = await requireOwnedApplication(user, applicationId)
  const { hasCmsp01, ...content } = await loadSelfAssessmentContent(application)

  const [editing, review, person] = await Promise.all([
    getEditingAccess(application, content.status),
    content.status === 'REVISION_REQUESTED'
      ? findLatestSelfAssessmentReview(application.application_id)
      : null,
    // Profil hanya dipakai untuk isian awal sebelum draft pertama disimpan.
    hasCmsp01 ? null : findPersonById(application.person_id),
  ])

  return {
    ...content,
    editing,
    review: review
      ? {
          cmsp01_note: review.cmsp01_note,
          cmsp02_note: review.cmsp02_note,
          reviewed_at: review.reviewed_at,
        }
      : null,
    profile: person ? toPublicProfile(person) : null,
  }
}

/* ------------------------------------------------------------------ */
/* Validasi payload draft                                              */
/* ------------------------------------------------------------------ */

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

function text(value: unknown, label: string, maxLength: number = SELF_ASSESSMENT_LIMITS.text): string {
  if (value === undefined || value === null) return ''
  // Angka (mis. tahun/JP dari input number) diterima dan disimpan sebagai teks.
  if (typeof value === 'number' && Number.isFinite(value)) value = String(value)
  if (typeof value !== 'string') badRequest(`${label} tidak valid.`)

  const trimmed = value.trim()
  if (trimmed.length > maxLength) badRequest(`${label} maksimal ${maxLength} karakter.`)

  return trimmed
}

function list(value: unknown, label: string, max: number): Record<string, unknown>[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) badRequest(`${label} tidak valid.`)
  if (value.length > max) badRequest(`${label} maksimal ${max} baris.`)

  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) badRequest(`${label} tidak valid.`)
    return item as Record<string, unknown>
  })
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function parsePayload(body: unknown): SelfAssessmentPayload {
  if (!body || typeof body !== 'object') badRequest('Data self assessment tidak valid.')

  const root = body as Record<string, any>
  const cmsp01 = (root.cmsp01 ?? {}) as Record<string, unknown>
  const cmsp02 = (root.cmsp02 ?? {}) as Record<string, unknown>
  const applicantInput = (cmsp01.applicant ?? {}) as Record<string, unknown>

  const applicant = Object.fromEntries(
    (Object.keys(APPLICANT_FIELDS) as ApplicantField[]).map((field) => [
      field,
      text(
        applicantInput[field],
        'Data pemohon',
        field === 'domicileAddress' ? SELF_ASSESSMENT_LIMITS.longText : SELF_ASSESSMENT_LIMITS.text,
      ),
    ]),
  ) as Applicant

  applicant.gender = normalizeGender(applicant.gender)

  const trainings = list(cmsp01.trainings, 'Riwayat pelatihan', SELF_ASSESSMENT_LIMITS.trainings)
    .map((item) => ({
      trainingName: text(item.trainingName, 'Nama pelatihan'),
      organizer: text(item.organizer, 'Penyelenggara'),
      year: text(item.year, 'Tahun pelatihan', 10),
      jp: text(item.jp, 'Jumlah JP', 10),
    }))

  const practices = list(cmsp01.practices, 'Pengalaman praktik', SELF_ASSESSMENT_LIMITS.practices)
    .map((item) => ({
      year: text(item.year, 'Tahun praktik', 10),
      coacheeMentee: text(item.coacheeMentee, 'Coachee/mentee'),
      topic: text(item.topic, 'Topik'),
      duration: text(item.duration, 'Durasi', 10),
    }))

  const documents = list(cmsp01.documents, 'Dokumen', CMSP01_DOCUMENT_TYPES.length)
    .map((item) => {
      const documentType = text(item.documentType, 'Jenis dokumen', 50)

      if (!(CMSP01_DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
        badRequest('Jenis dokumen tidak valid.')
      }

      return { documentType, fileId: text(item.fileId, 'ID berkas', 30) }
    })

  if (new Set(documents.map((item) => item.documentType)).size !== documents.length) {
    badRequest('Jenis dokumen tidak boleh ganda.')
  }

  const evidenceCountByUnit = new Map<string, number>()

  const evidences = list(
    cmsp02.evidences,
    'Evidence',
    CMSP02_UNIT_CODES.length * SELF_ASSESSMENT_LIMITS.evidencesPerUnit,
  ).map((item) => {
    const unitCode = text(item.unitCode, 'Unit kompetensi', 20)

    if (!CMSP02_UNIT_CODES.includes(unitCode)) badRequest('Unit kompetensi tidak valid.')

    const count = (evidenceCountByUnit.get(unitCode) ?? 0) + 1
    if (count > SELF_ASSESSMENT_LIMITS.evidencesPerUnit) {
      badRequest(`Evidence per unit maksimal ${SELF_ASSESSMENT_LIMITS.evidencesPerUnit}.`)
    }
    evidenceCountByUnit.set(unitCode, count)

    const type = item.type === 'URL' ? 'URL' : 'FILE'
    const url = type === 'URL' ? text(item.url, 'Link evidence', SELF_ASSESSMENT_LIMITS.url) : ''

    // Hanya link http/https yang boleh disimpan (mencegah javascript: dsb.).
    if (url && !isHttpUrl(url)) badRequest('Link evidence harus diawali http:// atau https://.')

    return {
      unitCode,
      evidenceName: text(item.evidenceName, 'Nama evidence'),
      type,
      fileId: type === 'FILE' ? text(item.fileId, 'ID berkas', 30) : '',
      url,
      description: text(item.description, 'Deskripsi evidence', SELF_ASSESSMENT_LIMITS.longText),
    } satisfies EvidenceInput
  })

  return {
    cmsp01: {
      applicant,
      trainings,
      practices,
      documents,
      declarationAccepted: cmsp01.declarationAccepted === true,
    },
    cmsp02: { evidences },
  }
}

/**
 * Setiap file yang dirujuk harus boleh dipakai peserta ini: diunggah oleh
 * dirinya sendiri, dokumen pendaftarannya, atau sudah tercatat di CMSP-nya.
 */
async function assertFilesAccessible(
  user: AuthenticatedUser,
  application: Application,
  fileIds: string[],
  alreadyLinkedIds: Set<string>,
) {
  const ids = [...new Set(fileIds.filter(Boolean))]
  if (ids.length === 0) return

  const [files, applicationDocuments] = await Promise.all([
    findFilesByIds(ids),
    findApplicationDocumentsByApplicationId(application.application_id),
  ])

  const applicationFileIds = new Set(applicationDocuments.map((item) => item.file_id))

  for (const id of ids) {
    const file = files.get(id)
    const allowed =
      file &&
      file.status !== 'deleted' &&
      (file.uploaded_by === user.user_id ||
        applicationFileIds.has(id) ||
        alreadyLinkedIds.has(id))

    if (!allowed) {
      throw createError({ statusCode: 403, statusMessage: 'Berkas tidak dapat digunakan.' })
    }
  }
}

/* ------------------------------------------------------------------ */
/* Simpan draft                                                        */
/* ------------------------------------------------------------------ */

export async function saveSelfAssessmentDraft(
  user: AuthenticatedUser,
  applicationId: string,
  body: unknown,
) {
  const application = await requireOwnedApplication(user, applicationId)

  const [existing01, existing02] = await Promise.all([
    findCmsp01ByApplicationId(application.application_id),
    findCmsp02ByApplicationId(application.application_id),
  ])

  const currentStatus = existing01?.status || existing02?.status || 'NEW'
  await requireEditing(application, currentStatus)

  const payload = parsePayload(body)

  const [existingDocuments, existingEvidences] = await Promise.all([
    existing01 ? findCmsp01Documents(existing01.cmsp01_id) : [],
    existing02 ? findCmsp02Evidences(existing02.cmsp02_id) : [],
  ])

  await assertFilesAccessible(
    user,
    application,
    [
      ...payload.cmsp01.documents.map((item) => item.fileId),
      ...payload.cmsp02.evidences.map((item) => item.fileId),
    ],
    new Set([
      ...existingDocuments.map((item) => item.file_id),
      ...existingEvidences.map((item) => item.file_id),
    ]),
  )

  const now = new Date().toISOString()
  const status = EDITABLE_SELF_ASSESSMENT_STATUSES.includes(currentStatus)
    ? currentStatus
    : 'DRAFT'

  const applicantColumns = Object.fromEntries(
    Object.entries(APPLICANT_FIELDS).map(([field, column]) => [
      column,
      payload.cmsp01.applicant[field as ApplicantField],
    ]),
  )

  const declarationAccepted = payload.cmsp01.declarationAccepted

  const cmsp01 = await upsertCmsp01({
    application_id: application.application_id,
    period_id: application.period_id,
    status,
    ...applicantColumns,
    declaration_accepted: declarationAccepted ? 'TRUE' : 'FALSE',
    declaration_accepted_at: declarationAccepted
      ? existing01?.declaration_accepted_at || now
      : '',
    revision_count: existing01?.revision_count || '0',
    created_at: existing01?.created_at || now,
    updated_at: now,
  })

  const cmsp02 = await upsertCmsp02({
    application_id: application.application_id,
    period_id: application.period_id,
    status,
    revision_count: existing02?.revision_count || '0',
    created_at: existing02?.created_at || now,
    updated_at: now,
  })

  const applicationFileIds = new Set(
    (await findApplicationDocumentsByApplicationId(application.application_id))
      .map((item) => item.file_id),
  )

  await replaceCmsp01Trainings(
    cmsp01.cmsp01_id,
    payload.cmsp01.trainings.map((item, index) => ({
      sort_order: String(index + 1),
      training_name: item.trainingName,
      organizer: item.organizer,
      year: item.year,
      jp: item.jp,
      created_at: now,
      updated_at: now,
    })),
  )

  await replaceCmsp01Practices(
    cmsp01.cmsp01_id,
    payload.cmsp01.practices.map((item, index) => ({
      sort_order: String(index + 1),
      year: item.year,
      coachee_mentee: item.coacheeMentee,
      topic: item.topic,
      duration_minutes: item.duration,
      created_at: now,
      updated_at: now,
    })),
  )

  await replaceCmsp01Documents(
    cmsp01.cmsp01_id,
    payload.cmsp01.documents
      .filter((item) => item.fileId)
      .map((item) => ({
        document_type: item.documentType,
        file_id: item.fileId,
        source: applicationFileIds.has(item.fileId) ? 'APPLICATION' : 'UPLOAD',
        created_at: now,
        updated_at: now,
      })),
  )

  // Simpan evidence dengan urutan per unit (1, 2, 3, ...).
  const orderByUnit = new Map<string, number>()

  await replaceCmsp02Evidences(
    cmsp02.cmsp02_id,
    payload.cmsp02.evidences.map((item) => {
      const order = (orderByUnit.get(item.unitCode) ?? 0) + 1
      orderByUnit.set(item.unitCode, order)

      return {
        unit_code: item.unitCode,
        sort_order: String(order),
        evidence_name: item.evidenceName,
        evidence_type: item.type,
        file_id: item.fileId,
        url: item.url,
        description: item.description,
        created_at: now,
        updated_at: now,
      }
    }),
  )

  return { status, savedAt: now }
}

/* ------------------------------------------------------------------ */
/* Submit                                                              */
/* ------------------------------------------------------------------ */

const isFilled = (value: string) => value.trim() !== ''
const isYear = (value: string) => /^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= 2100
const isPositiveInteger = (value: string) => /^[1-9]\d*$/.test(value)

/** Mengembalikan daftar kekurangan; kosong berarti lengkap. */
async function findIncompleteItems(applicationId: string): Promise<string[]> {
  const [cmsp01, cmsp02] = await Promise.all([
    findCmsp01ByApplicationId(applicationId),
    findCmsp02ByApplicationId(applicationId),
  ])

  if (!cmsp01 || !cmsp02) {
    return ['Simpan draft CMSP-01 dan CMSP-02 terlebih dahulu.']
  }

  const [trainings, practices, documents, evidences] = await Promise.all([
    findCmsp01Trainings(cmsp01.cmsp01_id),
    findCmsp01Practices(cmsp01.cmsp01_id),
    findCmsp01Documents(cmsp01.cmsp01_id),
    findCmsp02Evidences(cmsp02.cmsp02_id),
  ])

  const problems: string[] = []

  if (Object.values(APPLICANT_FIELDS).some((column) => !isFilled(cmsp01[column]))) {
    problems.push('CMSP-01: data pemohon belum lengkap.')
  }

  if (!/^\d{18}$/.test(cmsp01.nip)) problems.push('CMSP-01: NIP harus 18 digit.')
  if (!/^\+?\d{8,15}$/.test(cmsp01.phone_number.replace(/[\s()-]/g, ''))) {
    problems.push('CMSP-01: nomor telepon tidak valid.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cmsp01.email)) problems.push('CMSP-01: e-mail tidak valid.')

  if (
    trainings.length === 0 ||
    trainings.some((item) => !isFilled(item.training_name) || !isFilled(item.organizer) || !isYear(item.year) || !isPositiveInteger(item.jp))
  ) {
    problems.push('CMSP-01: riwayat pelatihan belum lengkap.')
  }

  if (
    practices.length === 0 ||
    practices.some((item) => !isYear(item.year) || !isFilled(item.coachee_mentee) || !isFilled(item.topic) || !isPositiveInteger(item.duration_minutes))
  ) {
    problems.push('CMSP-01: pengalaman praktik belum lengkap.')
  }

  const documentTypes = new Set(documents.filter((item) => item.file_id).map((item) => item.document_type))
  const missingDocuments = CMSP01_DOCUMENT_TYPES.filter((type) => !documentTypes.has(type))

  if (missingDocuments.length > 0) {
    problems.push(`CMSP-01: dokumen belum lengkap (${missingDocuments.map((type) => getApplicationDocumentLabel(type)).join(', ')}).`)
  }

  if (cmsp01.declaration_accepted !== 'TRUE') {
    problems.push('CMSP-01: pernyataan pemohon belum disetujui.')
  }

  for (const unitCode of CMSP02_UNIT_CODES) {
    const unitEvidences = evidences.filter((item) => item.unit_code === unitCode)

    const complete =
      unitEvidences.length > 0 &&
      unitEvidences.every((item) =>
        isFilled(item.evidence_name) &&
        (item.evidence_type === 'URL' ? isHttpUrl(item.url) : isFilled(item.file_id)),
      )

    if (!complete) problems.push(`CMSP-02: evidence unit ${unitCode} belum lengkap.`)
  }

  return problems
}

export async function submitSelfAssessment(
  user: AuthenticatedUser,
  applicationId: string,
) {
  const application = await requireOwnedApplication(user, applicationId)

  const [cmsp01, cmsp02] = await Promise.all([
    findCmsp01ByApplicationId(application.application_id),
    findCmsp02ByApplicationId(application.application_id),
  ])

  const currentStatus = cmsp01?.status || cmsp02?.status || 'NEW'
  await requireEditing(application, currentStatus)

  const problems = await findIncompleteItems(application.application_id)

  if (problems.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: problems[0],
      data: { problems },
    })
  }

  const now = new Date().toISOString()
  const isResubmission = currentStatus === 'REVISION_REQUESTED'

  const nextRevisionCount = (value: string | undefined) =>
    String((Number(value) || 0) + (isResubmission ? 1 : 0))

  await upsertCmsp01({
    application_id: application.application_id,
    status: 'SUBMITTED',
    submitted_at: now,
    revision_count: nextRevisionCount(cmsp01?.revision_count),
    updated_at: now,
  })

  await upsertCmsp02({
    application_id: application.application_id,
    status: 'SUBMITTED',
    submitted_at: now,
    revision_count: nextRevisionCount(cmsp02?.revision_count),
    updated_at: now,
  })

  return { status: 'SUBMITTED', submittedAt: now }
}

/* ------------------------------------------------------------------ */
/* Berkas                                                              */
/* ------------------------------------------------------------------ */

export async function uploadSelfAssessmentFile(
  user: AuthenticatedUser,
  applicationId: string,
  purposeInput: string,
  file: File | undefined,
) {
  const application = await requireOwnedApplication(user, applicationId)

  if (!(purposeInput in SELF_ASSESSMENT_UPLOAD_PURPOSES)) {
    badRequest('Jenis unggahan tidak valid.')
  }

  const purpose = purposeInput as SelfAssessmentUploadPurpose

  const cmsp01 = await findCmsp01ByApplicationId(application.application_id)
  await requireEditing(application, cmsp01?.status || 'NEW')

  const label = purpose === 'EVIDENCE' ? 'File evidence' : getApplicationDocumentLabel(purpose)

  const mimeType = await assertValidUpload(file, {
    allowedMimeTypes: SELF_ASSESSMENT_UPLOAD_PURPOSES[purpose],
    maxBytes: MAX_SELF_ASSESSMENT_FILE_BYTES,
    label,
  })

  const validFile = file as File

  const uploaded = await uploadToGoogleDrive({
    fileName: `CMSP_SA_${sanitizeFileNamePart(application.nip_snapshot)}_${purpose}_${Date.now()}.${getExtensionForMime(mimeType)}`,
    mimeType,
    buffer: Buffer.from(await validFile.arrayBuffer()),
  })

  const record = await createFile({
    original_file_name: validFile.name.slice(0, 200),
    storage_provider: 'GOOGLE_DRIVE',
    storage_file_id: uploaded.storageFileId,
    file_url: uploaded.fileUrl,
    mime_type: mimeType,
    file_size_bytes: uploaded.fileSizeBytes,
    uploaded_by: user.user_id,
  })

  return toPublicFile(record)
}

/**
 * Preview berkas self assessment milik peserta sendiri: dokumen
 * pendaftarannya, berkas yang tercatat di CMSP-nya, atau berkas yang
 * ia unggah sendiri.
 */
export async function sendSelfAssessmentFile(
  event: H3Event,
  user: AuthenticatedUser,
  applicationId: string,
  fileId: string,
) {
  const application = await requireOwnedApplication(user, applicationId)
  return sendLinkedSelfAssessmentFile(event, application, fileId, user.user_id)
}

/**
 * Menyajikan berkas yang terkait dengan self assessment sebuah pengajuan:
 * dokumen pendaftaran, berkas yang tercatat di CMSP-01/02, atau (khusus
 * peserta pemilik) berkas yang ia unggah sendiri.
 */
export async function sendLinkedSelfAssessmentFile(
  event: H3Event,
  application: Application,
  fileId: string,
  uploaderUserId?: string,
) {
  const [files, applicationDocuments, cmsp01, cmsp02] = await Promise.all([
    findFilesByIds([fileId]),
    findApplicationDocumentsByApplicationId(application.application_id),
    findCmsp01ByApplicationId(application.application_id),
    findCmsp02ByApplicationId(application.application_id),
  ])

  const [documents, evidences] = await Promise.all([
    cmsp01 ? findCmsp01Documents(cmsp01.cmsp01_id) : [],
    cmsp02 ? findCmsp02Evidences(cmsp02.cmsp02_id) : [],
  ])

  const file = files.get(fileId)

  const allowed =
    file &&
    ((uploaderUserId && file.uploaded_by === uploaderUserId) ||
      applicationDocuments.some((item) => item.file_id === fileId) ||
      documents.some((item) => item.file_id === fileId) ||
      evidences.some((item) => item.file_id === fileId))

  if (!allowed) {
    throw createError({ statusCode: 404, statusMessage: 'Berkas tidak ditemukan.' })
  }

  return sendStoredFile(event, file)
}
