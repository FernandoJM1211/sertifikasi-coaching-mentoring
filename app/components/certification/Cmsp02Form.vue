<script setup lang="ts">
import { computed, ref } from 'vue'
import { CMSP02_COMPETENCY_UNITS } from '~~/shared/utils/cmsp02-units'
import { SELF_ASSESSMENT_UPLOAD_ACCEPT } from '~~/shared/utils/self-assessment'
import { parseEvidenceLink, type EvidenceLinkInfo } from '~~/shared/utils/evidence-link'
import {
  formatFileInfo,
  useSelfAssessmentFiles,
  type SelfAssessmentFile,
} from '~/composables/useSelfAssessmentFiles'

export type Cmsp02Initial = {
  evidences: {
    unitCode: string
    evidenceName: string
    type: 'FILE' | 'URL'
    file: SelfAssessmentFile | null
    url: string
    description: string
  }[]
}

const props = defineProps<{
  applicationId: string
  initial: Cmsp02Initial
  readonly: boolean
  /** Tampilan ringkas untuk Verifikator/Super Admin: sembunyikan panduan pengisian. */
  reviewMode?: boolean
  /** Mode tinjau: kode unit yang sudah dinilai (mis. oleh Asesor Teknis) untuk penanda di navigasi unit. */
  completedUnitCodes?: string[]
  /** Endpoint preview berkas selain milik peserta (mis. halaman Verifikator). */
  filesBasePath?: string
  status: string
}>()

const { upload, previewUrl } = useSelfAssessmentFiles(() => props.applicationId, () => props.filesBasePath)

type Evidence = {
  /** ID lokal yang stabil, dipakai untuk key & status validasi per kartu. */
  id: string
  type: 'file' | 'url'
  evidenceName: string
  description: string
  file: SelfAssessmentFile | null
  url: string
}

const competencyUnits = CMSP02_COMPETENCY_UNITS

let evidenceSequence = 0

function createEvidence(partial: Partial<Evidence> = {}): Evidence {
  evidenceSequence += 1

  return {
    id: `evidence-${Date.now()}-${evidenceSequence}`,
    type: 'file',
    evidenceName: '',
    description: '',
    file: null,
    url: '',
    ...partial,
  }
}

function buildInitialEvidence(): Record<number, Evidence[]> {
  return Object.fromEntries(
    competencyUnits.map((unit) => {
      const saved = props.initial.evidences
        .filter((item) => item.unitCode === unit.code)
        .map((item) => createEvidence({
          type: item.type === 'URL' ? 'url' : 'file',
          evidenceName: item.evidenceName,
          description: item.description,
          file: item.file,
          url: item.url,
        }))

      return [unit.number, saved.length > 0 ? saved : [createEvidence()]]
    }),
  )
}

const evidenceByUnit = ref<Record<number, Evidence[]>>(buildInitialEvidence())

function unitEvidences(unitNumber: number): Evidence[] {
  return evidenceByUnit.value[unitNumber] ?? []
}

function getEvidenceKey(unitNumber: number, evidenceIndex: number) {
  return unitEvidences(unitNumber)[evidenceIndex]?.id ?? ''
}

const evidenceErrors = ref<Record<string, { name?: string, file?: string, url?: string }>>({})
const evidenceNameTouched = ref<Record<string, boolean>>({})
const evidenceSourceTouched = ref<Record<string, boolean>>({})

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function evidenceIsComplete(item: Evidence) {
  if (!item.evidenceName.trim()) return false

  if (item.type === 'file') {
    return Boolean(item.file)
  }

  return isValidUrl(item.url.trim())
}

function markEvidenceNameTouched(unitNumber: number, evidenceIndex: number) {
  evidenceNameTouched.value[getEvidenceKey(unitNumber, evidenceIndex)] = true
}

function markEvidenceSourceTouched(unitNumber: number, evidenceIndex: number) {
  evidenceSourceTouched.value[getEvidenceKey(unitNumber, evidenceIndex)] = true
}

/**
 * Evidence baru ditaruh di paling atas agar langsung terlihat peserta;
 * evidence yang sudah ada bergeser ke bawah.
 */
function addEvidence(unitNumber: number) {
  unitEvidences(unitNumber).unshift(createEvidence())
}

function removeEvidence(unitNumber: number, index: number) {
  const items = unitEvidences(unitNumber)

  if (items.length === 1) return

  const key = getEvidenceKey(unitNumber, index)

  items.splice(index, 1)
  delete evidenceErrors.value[key]
  delete evidenceNameTouched.value[key]
  delete evidenceSourceTouched.value[key]
}

const uploadingEvidenceId = ref<string | null>(null)

async function handleEvidenceFileChange(
  event: Event,
  unitNumber: number,
  evidenceIndex: number,
) {
  const target = event.target as HTMLInputElement
  const selectedFile = target.files?.[0]
  target.value = ''

  const item = unitEvidences(unitNumber)[evidenceIndex]

  if (!selectedFile || !item) return

  uploadingEvidenceId.value = item.id
  markEvidenceSourceTouched(unitNumber, evidenceIndex)

  try {
    const uploaded = await upload('EVIDENCE', selectedFile)

    if (uploaded) {
      item.file = uploaded
    }
  } finally {
    uploadingEvidenceId.value = null
  }
}

function setEvidenceType(unitNumber: number, evidenceIndex: number, type: Evidence['type']) {
  const item = unitEvidences(unitNumber)[evidenceIndex]

  if (!item || item.type === type) return

  item.type = type
  item.file = null
  item.url = ''
  delete evidenceErrors.value[item.id]
}

function getUnitProgress(unitNumber: number) {
  const items = unitEvidences(unitNumber)

  return items.length > 0 && items.every(evidenceIsComplete)
    ? 100
    : 0
}

const totalEvidenceCount = computed(() =>
  competencyUnits.reduce(
    (total, unit) => total + unitEvidences(unit.number).length,
    0,
  ),
)

const completedEvidenceCount = computed(() =>
  competencyUnits.reduce(
    (total, unit) =>
      total + unitEvidences(unit.number).filter(evidenceIsComplete).length,
    0,
  ),
)

const remainingEvidenceCount = computed(() =>
  totalEvidenceCount.value - completedEvidenceCount.value,
)

const remainingLabel = computed(() =>
  remainingEvidenceCount.value === 0
    ? 'Lengkap'
    : `${remainingEvidenceCount.value} evidence belum lengkap`,
)

const progress = computed(() =>
  totalEvidenceCount.value === 0
    ? 0
    : Math.round(
        (completedEvidenceCount.value / totalEvidenceCount.value) * 100,
      ),
)

/* Preview file evidence */
const previewOpen = ref(false)
const previewEvidence = ref<Evidence | null>(null)

const evidencePreviewUrl = computed(() =>
  previewEvidence.value?.file ? previewUrl(previewEvidence.value.file.file_id) : '',
)

function openPreview(item: Evidence) {
  previewEvidence.value = item
  previewOpen.value = true
}

const evidenceAccept = SELF_ASSESSMENT_UPLOAD_ACCEPT.EVIDENCE

/* Preview link evidence: YouTube & file Drive di-embed, selain itu dibuka di tab baru. */
const linkPreviewOpen = ref(false)
const linkPreview = ref<{ info: EvidenceLinkInfo, title: string } | null>(null)

function openLinkPreview(item: Evidence) {
  const info = parseEvidenceLink(item.url)
  if (!info) return

  if (info.embedUrl) {
    linkPreview.value = { info, title: item.evidenceName.trim() || 'Preview Link Evidence' }
    linkPreviewOpen.value = true
    return
  }

  window.open(info.url, '_blank', 'noopener,noreferrer')
}

/** Data yang dikirim saat Simpan Draft. Urutan mengikuti tampilan. */
const payload = computed(() => ({
  evidences: competencyUnits.flatMap((unit) =>
    unitEvidences(unit.number).map((item) => ({
      unitCode: unit.code,
      evidenceName: item.evidenceName,
      type: item.type === 'url' ? 'URL' : 'FILE',
      fileId: item.type === 'file' ? item.file?.file_id ?? '' : '',
      url: item.type === 'url' ? item.url : '',
      description: item.description,
    })),
  ),
}))

/* Navigasi cepat ke card unit */
const UNIT_ID_PREFIX = 'cmsp02-unit-'

const navigatorUnits = computed(() =>
  competencyUnits.map((unit) => ({
    number: unit.number,
    code: unit.code,
    title: unit.title,
    // Peserta: unit lengkap diisi. Mode tinjau: unit yang sudah dinilai (bila diberikan).
    complete: props.reviewMode
      ? Boolean(props.completedUnitCodes?.includes(unit.code))
      : getUnitProgress(unit.number) === 100,
  })),
)

defineExpose({
  progress,
  payload,
})
</script>

<template>
  <div class="space-y-8">
    <section>
      <div class="flex items-start justify-between gap-5">
        <div class="min-w-0">
          <p class="text-sm font-medium text-primary">
            CMSP.02
          </p>

          <h1 class="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
            Self-Assessment Teknis
          </h1>

          <p v-if="!reviewMode" class="mt-2 text-sm leading-6 text-slate-500">
            Lengkapi evidence pada setiap unit kompetensi teknis. Satu unit dapat memiliki lebih dari satu evidence.
          </p>
        </div>

        <CertificationSelfAssessmentStatusBadge :status="status" class="mt-1" />
      </div>

      <div v-if="!reviewMode" class="mt-5">
        <div class="flex items-center justify-between gap-3 text-xs">
          <span class="font-medium text-slate-600">Kelengkapan CMSP-02</span>
          <span class="whitespace-nowrap font-semibold text-slate-900">
            {{ progress }}% · {{ remainingLabel }}
          </span>
        </div>
        <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            class="h-full rounded-full transition-all"
            :class="progress === 100 ? 'bg-success' : 'bg-primary'"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>
    </section>

    <section class="space-y-4">
      <UCard
        v-for="unit in competencyUnits"
        :id="`${UNIT_ID_PREFIX}${unit.number}`"
        :key="unit.number"
        class="scroll-mt-6 bg-white/90 shadow-sm"
      >
        <div class="space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-primary">
                Unit {{ unit.number }} · {{ unit.code }}
              </p>
              <h2 class="mt-1 text-lg font-semibold leading-6 text-slate-900">
                {{ unit.title }}
              </h2>
            </div>

            <UBadge
              v-if="!reviewMode"
              :label="getUnitProgress(unit.number) === 100 ? 'Lengkap' : 'Belum lengkap'"
              :color="getUnitProgress(unit.number) === 100 ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
              class="shrink-0"
            />
          </div>

          <!-- Slot opsional per unit, mis. penilaian K/BK oleh Asesor Teknis. -->
          <slot name="unit-header" :unit="unit" />

          <div>
            <p class="text-sm font-semibold text-slate-900">
              Elemen kompetensi
            </p>

            <ol class="mt-3 space-y-2 pl-5 text-sm leading-6 text-slate-600 list-decimal">
              <li
                v-for="element in unit.elements"
                :key="element"
              >
                {{ element }}
              </li>
            </ol>
          </div>

          <!-- Ditampilkan juga pada mode tinjau sebagai acuan Verifikator/Asesor. -->
          <div
  class="rounded-xl border border-primary/25 bg-primary/5 p-5"
>
  <p class="text-sm font-semibold text-primary">
    Contoh bukti yang relevan
  </p>

  <ul class="mt-3 space-y-2 text-sm leading-6 text-primary">
    <li
      v-for="evidenceExample in unit.relevantEvidence"
      :key="evidenceExample"
      class="flex gap-2"
    >
      <span
        class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
      />
      <span>{{ evidenceExample }}</span>
    </li>
  </ul>
</div>

          <div>
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  Evidence / Bukti yang Relevan
                </p>
                <p v-if="!reviewMode" class="mt-1 text-xs leading-5 text-slate-500">
                  Bukti dapat berupa file atau link eksternal.
                </p>
              </div>

              <UButton
                v-if="!readonly"
                label="Tambah Evidence"
                icon="i-lucide-plus"
                color="primary"
                variant="outline"
                size="sm"
                class="shrink-0"
                @click="addEvidence(unit.number)"
              />
            </div>

            <div class="mt-4 space-y-3">
              <div
                v-for="(evidence, evidenceIndex) in unitEvidences(unit.number)"
                :key="evidence.id"
                class="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <p class="text-sm font-medium text-slate-900">
                    Evidence {{ unitEvidences(unit.number).length - evidenceIndex }}
                  </p>

                  <UButton
                    v-if="!readonly && unitEvidences(unit.number).length > 1"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="sm"
                    square
                    aria-label="Hapus evidence"
                    @click="removeEvidence(unit.number, evidenceIndex)"
                  />
                </div>

                <div class="mt-4">
                  <label class="block text-sm font-medium text-slate-700">
                    Nama Evidence <span class="text-red-500">*</span>
                  </label>
                  <UInput
                    v-model="evidence.evidenceName"
                    :disabled="readonly"
                    placeholder="Masukkan nama/judul evidence"
                    class="mt-2 w-full"
                    @blur="markEvidenceNameTouched(unit.number, evidenceIndex)"
                  />
                  <p
                    v-if="evidenceNameTouched[evidence.id] && !evidence.evidenceName.trim()"
                    class="mb-2 mt-3 block text-xs font-medium text-red-500"
                  >
                    Nama evidence wajib diisi.
                  </p>
                </div>

                <div v-if="!readonly" class="mt-4 flex flex-wrap gap-2">
                  <UButton
                    label="Upload File"
                    :variant="evidence.type === 'file' ? 'solid' : 'outline'"
                    :color="evidence.type === 'file' ? 'primary' : 'neutral'"
                    size="sm"
                    @click="setEvidenceType(unit.number, evidenceIndex, 'file')"
                  />

                  <UButton
                    label="Gunakan Link"
                    :variant="evidence.type === 'url' ? 'solid' : 'outline'"
                    :color="evidence.type === 'url' ? 'primary' : 'neutral'"
                    size="sm"
                    @click="setEvidenceType(unit.number, evidenceIndex, 'url')"
                  />
                </div>

                <div class="mt-4">
                  <template v-if="evidence.type === 'file'">
                    <label class="block text-sm font-medium text-slate-700">
                      File Evidence
                    </label>
                    <p v-if="!reviewMode" class="mb-2 mt-1 text-xs text-slate-500">
                      Format PDF, DOC, atau DOCX. Maksimal 5 MB.
                    </p>
                    <div class="mt-2 flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p
                        class="min-w-0 truncate text-xs"
                        :class="evidence.file ? (readonly ? 'text-slate-600' : 'font-medium text-green-600') : 'text-slate-400'"
                      >
                        {{ formatFileInfo(evidence.file) }}
                      </p>

                      <div class="flex shrink-0 items-center gap-2">
                        <UButton
                          color="neutral"
                          variant="outline"
                          icon="i-lucide-eye"
                          class="min-w-28 justify-center"
                          :disabled="!evidence.file"
                          @click="openPreview(evidence)"
                        >
                          Lihat
                        </UButton>

                        <template v-if="!readonly">
                          <input
                            :id="`file-${evidence.id}`"
                            type="file"
                            :accept="evidenceAccept"
                            class="hidden"
                            :disabled="uploadingEvidenceId !== null"
                            @change="handleEvidenceFileChange($event, unit.number, evidenceIndex)"
                          />
                          <UButton
                            as="label"
                            :for="`file-${evidence.id}`"
                            variant="outline"
                            icon="i-lucide-upload"
                            :loading="uploadingEvidenceId === evidence.id"
                            :disabled="uploadingEvidenceId !== null"
                            class="min-w-28 cursor-pointer justify-center"
                          >
                            {{ evidence.file ? 'Ganti' : 'Pilih File' }}
                          </UButton>
                        </template>
                      </div>
                    </div>

                    <p
                      v-if="evidenceSourceTouched[evidence.id] && !evidence.file"
                      class="mb-2 mt-3 block text-xs font-medium text-red-500"
                    >
                      File evidence wajib diunggah.
                    </p>
                  </template>

                  <template v-else>
                    <label class="block text-sm font-medium text-slate-700">
                      Link Evidence
                    </label>
                    <p v-if="!reviewMode" class="mb-2 mt-1 text-xs text-slate-500">
                      Format link folder Google Drive, video Google Drive, atau YouTube.
                    </p>
                    <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <UInput
                        v-model="evidence.url"
                        :disabled="readonly"
                        type="url"
                        placeholder="https://drive.google.com/... atau https://youtu.be/..."
                        class="min-w-0 flex-1"
                        @blur="markEvidenceSourceTouched(unit.number, evidenceIndex)"
                      />
                      <UButton
                        color="neutral"
                        variant="outline"
                        icon="i-lucide-eye"
                        class="min-w-28 shrink-0 justify-center"
                        :disabled="!isValidUrl(evidence.url.trim())"
                        @click="openLinkPreview(evidence)"
                      >
                        Lihat
                      </UButton>
                    </div>
                    <p
                      v-if="evidenceSourceTouched[evidence.id] && !evidence.url.trim()"
                      class="mb-2 mt-3 block text-xs font-medium text-red-500"
                    >
                      Link evidence wajib diisi.
                    </p>

                    <p
                      v-else-if="evidence.url && !isValidUrl(evidence.url.trim())"
                      class="mb-2 mt-3 block text-xs font-medium text-red-500"
                    >
                      Masukkan link dengan format URL yang valid.
                    </p>
                  </template>

                  <div v-if="!reviewMode || evidence.description.trim()" class="mt-4">
                    <label class="block text-sm font-medium text-slate-700">
                      Deskripsi Evidence
                    </label>
                    <UTextarea
                      v-model="evidence.description"
                      :disabled="readonly"
                      :rows="3"
                      placeholder="Jelaskan secara singkat isi atau konteks evidence (opsional)."
                      class="mt-2 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <CertificationCmsp02UnitNavigator
      :units="navigatorUnits"
      :target-id-prefix="UNIT_ID_PREFIX"
    />

    <DocumentLinkPreviewModal
      v-model:open="linkPreviewOpen"
      :embed-url="linkPreview?.info.embedUrl ?? ''"
      :url="linkPreview?.info.url ?? ''"
      :title="linkPreview?.title"
      :description="linkPreview?.info.kind === 'YOUTUBE' ? 'Video YouTube' : 'Google Drive'"
    />

    <DocumentPreviewModal
      v-model:open="previewOpen"
      :url="evidencePreviewUrl"
      :title="previewEvidence?.file?.original_file_name"
      :description="previewEvidence?.evidenceName"
    />
  </div>
</template>