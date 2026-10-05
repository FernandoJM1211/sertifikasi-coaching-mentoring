<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Evidence = {
  type: 'file' | 'url'
  evidenceName: string
  description: string
  file: File | null
  url: string
}

type CompetencyUnit = {
  number: number
  code: string
  title: string
  elements: string[]
  relevantEvidence: string[]
}

const competencyUnits: CompetencyUnit[] = [
  {
    number: 1,
    code: 'UK.CMSP.1',
    title: 'Memahami Praktik Coaching dan Mentoring pada Sektor Publik',
    elements: [
      'Menyampaikan pengertian, tujuan, dan Prinsip Coaching dan Mentoring pada sektor publik',
      'Menyampaikan tahapan dan peran yang terlibat dalam proses Coaching dan Mentoring pada sektor publik.',
    ],
    relevantEvidence: [
      'Sertifikat pelatihan coaching dan mentoring',
      'Modul atau materi terkait coaching/mentoring yang pernah dibuat',
      'Presentasi atau bahan paparan yang pernah digunakan untuk menjelaskan coaching dan mentoring',
    ],
  },
  {
    number: 2,
    code: 'UK.CMSP.2',
    title: 'Membangun Hubungan Coaching dan Mentoring yang Efektif',
    elements: [
      'Mengidentifikasi kebutuhan dan tujuan pengembangan individu',
      'Menciptakan suasana aman, nyaman dan mendukung proses Coaching/Mentoring',
      'Melakukan komunikasi yang efektif dalam konteks Coaching/Mentoring',
      'Menetapkan kesepakatan sesi Coaching/Mentoring.',
    ],
    relevantEvidence: [
      'Form/lembar identifikasi profil dan kebutuhan coachee/mentee',
      'Rekaman video proses Coaching/mentoring',
      'Form kontrak pembelajaran atau kesepakatan sesi coaching/mentoring',
    ],
  },
  {
    number: 3,
    code: 'UK.CMSP.3',
    title: 'Memfasilitasi Proses Pencapaian Tujuan',
    elements: [
      'Menetapkan Tujuan Pengembangan Individu yang Jelas dan Relevan',
      'Mengembangkan Rencana Aksi yang Terukur',
    ],
    relevantEvidence: [
      'Rekaman video proses Coaching/mentoring',
      'Form penetapan tujuan pengembangan individu (Bukti perumusan tujuan menggunakan prinsip SMART atau pendekatan sejenis/lainnya)',
      'Form Action Plan/Rencana Aksi/Pengembangan',
    ],
  },
  {
    number: 4,
    code: 'UK.CMSP.4',
    title: 'Memfasilitasi Pemantauan dan Evaluasi',
    elements: [
      'Mengidentifikasi Indikator Keberhasilan Proses Coaching/Mentoring',
      'Memantau Kemajuan dan Perkembangan Coachee/Mentee',
      'Memfasilitasi Refleksi dan Umpan Balik Positif terhadap Proses dan Hasil Coaching/Mentoring',
    ],
    relevantEvidence: [
      'Rekaman video proses Coaching/mentoring',
      'Form monitoring dan evaluasi coaching dan mentoring',
    ],
  },
  {
    number: 5,
    code: 'UK.CSP.1',
    title: 'Mendengarkan Aktif dan Kehadiran Penuh (Active Listening and Presence)',
    elements: [
      'Menggunakan keterampilan mendengarkan aktif (Active Listening).',
      'Menciptakan Kehadiran Penuh (Establish Presence)',
    ],
    relevantEvidence: [
      'Rekaman video praktik coaching yang menunjukkan unit kompetensi',
    ],
  },
  {
    number: 6,
    code: 'UK.CSP.2',
    title: 'Menggunakan Teknik Bertanya Reflektif dan Mendalam (Powerfull Questioning)',
    elements: [
      'Mengajukan Pertanyaan yang Membuka Wawasan.',
      'Mengajukan Pertanyaan yang Reflektif dan Memberdayakan',
    ],
    relevantEvidence: [
      'Rekaman video praktik coaching yang menunjukkan unit kompetensi',
    ],
  },
  {
    number: 7,
    code: 'UK.CSP.3',
    title: 'Menerapkan Model dan Kerangka Sistematis dalam Proses Coaching',
    elements: [
      'Mengidentifikasi Model dan Kerangka Coaching yang Relevan',
      'Melaksanakan Tahapan Coaching secara Sistematis',
    ],
    relevantEvidence: [
      'Form/dokumen praktik coaching yang menggunakan model dan kerangka coaching, misalnya GROW, CLEAR, OSCAR, atau model lain beserta karakteristik dan penggunaannya',
    ],
  },
  {
    number: 8,
    code: 'UK.MSP.1',
    title: 'Menggunakan Teknik Berbagi Pengetahuan dan Pengalaman',
    elements: [
      'Memilih Teknik Berbagi Pengetahuan dan Pengalaman yang Sesuai dengan Karakter Mentee.',
      'Menyampaikan Pengetahuan dan Pengalaman secara Inspiratif dan Aplikatif.',
    ],
    relevantEvidence: [
      'Rencana Sesi Mentoring yang memuat karakteristik/kebutuhan mentee dan teknik berbagi yang dipilih',
      'Rekaman video sesi mentoring yang menunjukkan unit kompetensi',
    ],
  },
  {
    number: 9,
    code: 'UK.MSP.2',
    title: 'Memberikan Bimbingan dan Dukungan Peningkatan Kinerja',
    elements: [
      'Mengidentifikasi Data dan Informasi Kinerja',
      'Melakukan Analisis Kebutuhan Peningkatan Kinerja',
      'Memberikan Bimbingan Peningkatan Kemampuan dan Hasil Kerja',
    ],
    relevantEvidence: [
      'Log Book atau Catatan Sesi Mentoring yang terkait dengan memberikan bimbingan dan dukungan peningkatan kinerja',
    ],
  },
  {
    number: 10,
    code: 'UK.MSP.3',
    title: 'Memberikan Bimbingan Adaptasi dan Penyesuaian Peran',
    elements: [
      'Mengidentifikasi Kebutuhan Adaptasi dan Penyesuaian Peran Mentee',
      'Memberikan Dukungan Adaptasi dan Penyesuaian Peran Mentee',
    ],
    relevantEvidence: [
      'Log Book atau Catatan Sesi Mentoring yang terkait dengan bimbingan adaptasi dan penyesuaian peran',
    ],
  },
]

const formStatus = ref<'draft' | 'saved'>('draft')

const evidenceByUnit = ref<Record<number, Evidence[]>>(
  Object.fromEntries(
    competencyUnits.map((unit) => [
      unit.number,
      [{ type: 'file', evidenceName: '', description: '', file: null, url: '' }],
    ]),
  ) as Record<number, Evidence[]>,
)

const savedMessage = ref('')
const evidenceErrors = ref<Record<string, { name?: string; file?: string; url?: string }>>({})
const evidenceNameTouched = ref<Record<string, boolean>>({})
const evidenceSourceTouched = ref<Record<string, boolean>>({})

const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024

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
  evidenceNameTouched.value[`${unitNumber}-${evidenceIndex}`] = true
}

function markEvidenceSourceTouched(unitNumber: number, evidenceIndex: number) {
  evidenceSourceTouched.value[`${unitNumber}-${evidenceIndex}`] = true
}

function addEvidence(unitNumber: number) {
  evidenceByUnit.value[unitNumber].push({
    type: 'file',
    evidenceName: '',
    description: '',
    file: null,
    url: '',
  })
}

function removeEvidence(unitNumber: number, index: number) {
  const items = evidenceByUnit.value[unitNumber]

  if (items.length === 1) return

  items.splice(index, 1)
  delete evidenceErrors.value[`${unitNumber}-${index}`]
  delete evidenceNameTouched.value[`${unitNumber}-${index}`]
  delete evidenceSourceTouched.value[`${unitNumber}-${index}`]
}

function handleEvidenceFileChange(
  event: Event,
  unitNumber: number,
  evidenceIndex: number,
) {
  const target = event.target as HTMLInputElement
  const selectedFile = target.files?.[0] ?? null
  const errorKey = `${unitNumber}-${evidenceIndex}`

  if (!evidenceErrors.value[errorKey]) {
    evidenceErrors.value[errorKey] = {}
  }

  delete evidenceErrors.value[errorKey].file

  if (!selectedFile) {
    evidenceByUnit.value[unitNumber][evidenceIndex].file = null
    return
  }

  if (selectedFile.size > MAX_EVIDENCE_FILE_SIZE) {
    evidenceByUnit.value[unitNumber][evidenceIndex].file = null
    evidenceErrors.value[errorKey].file = 'Ukuran file maksimal 5 MB.'
    target.value = ''
    return
  }

  evidenceByUnit.value[unitNumber][evidenceIndex].file = selectedFile
}

function setEvidenceType(unitNumber: number, evidenceIndex: number, type: Evidence['type']) {
  const item = evidenceByUnit.value[unitNumber][evidenceIndex]

  item.type = type
  item.file = null
  item.url = ''
  delete evidenceErrors.value[`${unitNumber}-${evidenceIndex}`]
}

function getUnitProgress(unitNumber: number) {
  const items = evidenceByUnit.value[unitNumber]

  return items.length > 0 && items.every(evidenceIsComplete)
    ? 100
    : 0
}

const totalEvidenceCount = computed(() =>
  competencyUnits.reduce(
    (total, unit) => total + evidenceByUnit.value[unit.number].length,
    0,
  ),
)

const completedEvidenceCount = computed(() =>
  competencyUnits.reduce(
    (total, unit) =>
      total +
      evidenceByUnit.value[unit.number].filter(evidenceIsComplete).length,
    0,
  ),
)

const progress = computed(() =>
  totalEvidenceCount.value === 0
    ? 0
    : Math.round(
        (completedEvidenceCount.value / totalEvidenceCount.value) * 100,
      ),
)

const complete = computed(() => progress.value === 100)

const formContainerRef = ref<HTMLElement | null>(null)
const draftBarRef = ref<HTMLElement | null>(null)
const isDraftBarFloating = ref(false)

function updateDraftBarState() {
  const container = formContainerRef.value
  const draftBar = draftBarRef.value

  if (!container || !draftBar) return

  const bottomOffset = 16
  const draftBarRect = draftBar.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const stickyBottom = window.innerHeight - bottomOffset
  const containerBottom = window.scrollY + containerRect.bottom
  const viewportBottomTarget = window.scrollY + stickyBottom

  isDraftBarFloating.value =
    Math.abs(draftBarRect.bottom - stickyBottom) <= 2 &&
    containerBottom > viewportBottomTarget + 2
}

function saveDraft() {
  formStatus.value = 'saved'

  for (const unit of competencyUnits) {
    evidenceByUnit.value[unit.number].forEach((_, evidenceIndex) => {
      markEvidenceNameTouched(unit.number, evidenceIndex)
      markEvidenceSourceTouched(unit.number, evidenceIndex)
    })
  }

  const draftData = {
    evidenceByUnit: Object.fromEntries(
      competencyUnits.map((unit) => [
        unit.number,
        evidenceByUnit.value[unit.number].map((item) => ({
          type: item.type,
          evidenceName: item.evidenceName,
          description: item.description,
          fileName: item.file?.name ?? null,
          url: item.url,
        })),
      ]),
    ),
    savedAt: new Date().toISOString(),
  }

  localStorage.setItem('cmsp-02-draft', JSON.stringify(draftData))
  savedMessage.value = 'Draft CMSP.02 berhasil disimpan.'

  window.setTimeout(() => {
    savedMessage.value = ''
  }, 3000)
}

onMounted(() => {
  const savedDraft = localStorage.getItem('cmsp-02-draft')

  if (!savedDraft) return

  try {
    const draftData = JSON.parse(savedDraft)

    formStatus.value = 'saved'

    if (!draftData.evidenceByUnit) return

    for (const unit of competencyUnits) {
      const savedItems = draftData.evidenceByUnit[unit.number]

      if (!Array.isArray(savedItems) || savedItems.length === 0) continue

      evidenceByUnit.value[unit.number] = savedItems.map((item: any) => ({
        type: item.type === 'url' ? 'url' : 'file',
        evidenceName: item.evidenceName ?? '',
        description: item.description ?? '',
        file: null,
        url: item.url ?? '',
      }))
    }
  } catch (error) {
    console.error('Gagal memulihkan draft CMSP.02:', error)
  }
})

onMounted(() => {
  updateDraftBarState()
  window.addEventListener('scroll', updateDraftBarState, { passive: true })
  window.addEventListener('resize', updateDraftBarState)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateDraftBarState)
  window.removeEventListener('resize', updateDraftBarState)
})

defineExpose({
  progress,
  complete,
  formStatus,
  saveDraft,
})
</script>

<template>
  <div ref="formContainerRef" class="space-y-8">
    <section>
      <div class="flex items-start justify-between gap-5">
        <div class="min-w-0">
          <p class="text-sm font-medium text-primary">
            CMSP.02
          </p>

          <h1 class="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
            Self-Assessment Teknis
          </h1>

          <p class="mt-2 text-sm leading-6 text-slate-500">
            Lengkapi evidence pada setiap unit kompetensi teknis. Satu unit dapat memiliki lebih dari satu evidence.
          </p>
        </div>

        <UBadge
          :label="formStatus === 'saved' ? 'Tersimpan' : 'Draft'"
          :color="formStatus === 'saved' ? 'success' : 'warning'"
          variant="subtle"
          class="shrink-0"
        />
      </div>
    </section>

    <section class="space-y-4">
      <UCard
        v-for="unit in competencyUnits"
        :key="unit.number"
        class="bg-white/90 shadow-sm"
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
              :label="getUnitProgress(unit.number) === 100 ? 'Lengkap' : 'Belum lengkap'"
              :color="getUnitProgress(unit.number) === 100 ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
              class="shrink-0"
            />
          </div>

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
                <p class="mt-1 text-xs leading-5 text-slate-500">
                  Bukti dapat berupa file atau link eksternal.
                </p>
              </div>

              <UButton
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
                v-for="(evidence, evidenceIndex) in evidenceByUnit[unit.number]"
                :key="`${unit.number}-${evidenceIndex}`"
                class="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <p class="text-sm font-medium text-slate-900">
                    Evidence {{ evidenceIndex + 1 }}
                  </p>

                  <UButton
                    v-if="evidenceByUnit[unit.number].length > 1"
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
                    placeholder="Masukkan nama/judul evidence"
                    class="mt-2 w-full"
                    @blur="markEvidenceNameTouched(unit.number, evidenceIndex)"
                  />
                  <p
                    v-if="evidenceNameTouched[`${unit.number}-${evidenceIndex}`] && !evidence.evidenceName.trim()"
                    class="mb-2 mt-3 block text-xs font-medium text-red-500"
                  >
                    Nama evidence wajib diisi.
                  </p>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
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
                    <p class="mb-2 mt-1 text-xs text-slate-500">
                      Format PDF, DOC, atau DOCX. Maksimal 5 MB.
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      class="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-medium file:text-primary hover:file:bg-primary/15"
                      @change="handleEvidenceFileChange($event, unit.number, evidenceIndex)"
                      @blur="markEvidenceSourceTouched(unit.number, evidenceIndex)"
                    />

                    <p
                      v-if="evidenceErrors[`${unit.number}-${evidenceIndex}`]?.file"
                      class="mb-2 mt-3 block text-xs font-medium text-red-500"
                    >
                      {{ evidenceErrors[`${unit.number}-${evidenceIndex}`]?.file }}
                    </p>

                    <p
                      v-if="evidence.file"
                      class="mt-3 text-xs font-medium text-success-600"
                    >
                      {{ evidence.file.name }}
                    </p>

                    <p
                      v-if="evidenceSourceTouched[`${unit.number}-${evidenceIndex}`] && !evidence.file"
                      class="mb-2 mt-3 block text-xs font-medium text-red-500"
                    >
                      File evidence wajib diunggah.
                    </p>
                  </template>

                  <template v-else>
                    <label class="block text-sm font-medium text-slate-700">
                      Link Evidence
                    </label>
                    <UInput
                      v-model="evidence.url"
                      type="url"
                      placeholder="https://..."
                      class="mt-2 w-full"
                      @blur="markEvidenceSourceTouched(unit.number, evidenceIndex)"
                    />
                    <p
                      v-if="evidenceSourceTouched[`${unit.number}-${evidenceIndex}`] && !evidence.url.trim()"
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

                  <div class="mt-4">
                    <label class="block text-sm font-medium text-slate-700">
                      Deskripsi Evidence
                    </label>
                    <UTextarea
                      v-model="evidence.description"
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

    <div class="w-full">
      <div class="rounded-xl bg-slate-50 p-4">

        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-500">
            Kelengkapan CMSP.02
          </span>

          <span class="font-semibold text-slate-900">
            {{ progress }}%
          </span>
        </div>

        <div
          class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
        >
          <div
            class="h-full rounded-full bg-primary transition-all"
            :style="{ width: `${progress}%` }"
          />
        </div>

      </div>
    </div>

    <!-- ========================================
     SIMPAN DRAFT
     ======================================== -->

<div
  ref="draftBarRef"
  class="sticky bottom-4 z-10 transition-shadow duration-200"
>
  <UCard
    class="bg-white/90"
    :class="isDraftBarFloating ? 'shadow-lg' : 'shadow-sm'"
  >
    <div class="flex items-center gap-6">

    <!-- Informasi -->
    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium text-slate-900">
        Simpan perkembangan pengisian
      </p>

      <p class="mt-1 text-xs text-slate-500">
        Form belum perlu lengkap untuk disimpan sebagai draft.
      </p>

      <p
        v-if="savedMessage"
        class="mt-1 text-xs font-medium text-success-600"
      >
        {{ savedMessage }}
      </p>
    </div>

    <!-- Tombol -->
    <UButton
      label="Simpan Draft"
      icon="i-lucide-save"
      size="lg"
      class="ml-auto shrink-0"
      @click="saveDraft"
    />

    </div>
  </UCard>
</div>
  </div>
</template>
