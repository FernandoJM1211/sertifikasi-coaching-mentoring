<script setup lang="ts">
/**
 * Pengumuman Sertifikasi peserta (tahap 8) — docs/08 K-26.
 * Hasil akhir tampil sejak awal tahap Pengumuman; peserta Remedial mengirim link Google Drive
 * tugas remedial sampai akhir tahap Pengumuman (dapat diubah selama belum diputuskan panitia).
 */
import { isGoogleDriveLink, REMEDIAL_LINK_MAX, REMEDIAL_NOTE_MAX, type FinalStatus } from '~~/shared/utils/final-result'

definePageMeta({ layout: 'peserta' })
useHead({ title: 'Pengumuman Sertifikasi' })

type AnnouncementData = {
  application: { application_id: string }
  period: { period_id: string, period_name: string }
  stage: { open: boolean, startAt: string, endAt: string }
  announced: boolean
  decided: boolean
  status: FinalStatus | null
  remedial: { drive_link: string, note: string, submitted_at: string, updated_at: string, decided_at: string } | null
  canSubmitRemedial: boolean
}

const route = useRoute()
const toast = useToast()
const applicationId = computed(() => String(route.params.applicationId || ''))
const apiPath = computed(() => `/api/peserta/applications/${encodeURIComponent(applicationId.value)}/announcement`)

const loading = ref(true)
const errorMessage = ref('')
const data = ref<AnnouncementData | null>(null)

const form = reactive({ drive_link: '', note: '' })

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: AnnouncementData }>(apiPath.value, { credentials: 'include' })
    data.value = response.data
    form.drive_link = response.data.remedial?.drive_link ?? ''
    form.note = response.data.remedial?.note ?? ''
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Pengumuman sertifikasi belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------------- Narasi per status ---------------- */
type Notice = { icon: string, tone: string, iconTone: string, title: string, paragraphs: string[] }

const notice = computed<Notice | null>(() => {
  const value = data.value
  if (!value) return null
  const period = value.period.period_name || 'periode ini'

  if (!value.announced) {
    return {
      icon: 'i-lucide-hourglass',
      tone: 'border-blue-300 bg-blue-50',
      iconTone: 'border-blue-300 bg-white text-blue-500',
      title: 'Hasil Akhir Belum Diumumkan',
      paragraphs: [
        'Mohon menunggu keputusan akhir sertifikasi dari panitia.',
        value.stage.startAt ? `Hasil akan diumumkan mulai ${formatDateTimeId(value.stage.startAt)}.` : 'Hasil akan diumumkan pada tahap Pengumuman.',
      ],
    }
  }

  if (!value.decided || !value.status) {
    return {
      icon: 'i-lucide-hourglass',
      tone: 'border-blue-300 bg-blue-50',
      iconTone: 'border-blue-300 bg-white text-blue-500',
      title: 'Hasil Akhir Sedang Ditetapkan',
      paragraphs: ['Hasil akhir sertifikasi Anda belum ditetapkan panitia. Silakan periksa kembali halaman ini secara berkala.'],
    }
  }

  const passed: Notice = {
    icon: 'i-lucide-award',
    tone: 'border-emerald-300 bg-emerald-50',
    iconTone: 'border-emerald-300 bg-white text-emerald-600',
    title: 'Selamat, Anda Lulus Sertifikasi',
    paragraphs: [],
  }
  const notPassed: Notice = {
    icon: 'i-lucide-circle-x',
    tone: 'border-red-300 bg-red-50',
    iconTone: 'border-red-300 bg-white text-red-600',
    title: 'Anda Belum Lulus Sertifikasi',
    paragraphs: [],
  }
  const certificateInfo = 'Informasi penerimaan sertifikat akan disampaikan lebih lanjut oleh panitia.'
  const nextPeriod = 'Terima kasih atas partisipasi Anda. Anda dapat mendaftar kembali pada periode sertifikasi berikutnya.'

  switch (value.status) {
    case 'PASSED':
      return { ...passed, paragraphs: [`Anda dinyatakan lulus Sertifikasi Coaching dan Mentoring Sektor Publik ${period}.`, certificateInfo] }
    case 'REMEDIAL_PASSED':
      return { ...passed, paragraphs: [`Tugas remedial Anda dinyatakan memenuhi standar. Anda dinyatakan lulus Sertifikasi Coaching dan Mentoring Sektor Publik ${period}.`, certificateInfo] }
    case 'REMEDIAL_PENDING':
      return {
        icon: 'i-lucide-rotate-ccw',
        tone: 'border-amber-300 bg-amber-50',
        iconTone: 'border-amber-300 bg-white text-amber-600',
        title: 'Anda Belum Dapat Dinyatakan Lulus',
        paragraphs: [
          'Terdapat penilaian Anda yang belum memenuhi standar. Ikuti instruksi panitia terkait tugas remedial, lalu kirim link Google Drive berisi tugas tersebut melalui form di bawah.',
          'Remedial hanya dapat dilakukan satu kali. Untuk mengetahui bagian yang perlu diperbaiki, silakan hubungi panitia.',
        ],
      }
    case 'REMEDIAL_SUBMITTED':
      return {
        icon: 'i-lucide-send',
        tone: 'border-sky-300 bg-sky-50',
        iconTone: 'border-sky-300 bg-white text-sky-600',
        title: 'Tugas Remedial Terkirim',
        paragraphs: ['Tugas remedial Anda sedang ditinjau panitia. Hasilnya akan ditampilkan di halaman ini.'],
      }
    case 'REMEDIAL_FAILED':
      return { ...notPassed, paragraphs: [`Berdasarkan hasil peninjauan tugas remedial, Anda belum dapat dinyatakan lulus pada ${period}.`, nextPeriod] }
    case 'REMEDIAL_EXPIRED':
      return { ...notPassed, paragraphs: [`Anda tidak mengirim tugas remedial sampai batas waktu yang ditentukan, sehingga belum dapat dinyatakan lulus pada ${period}.`, nextPeriod] }
    case 'WITHDRAWN':
      return { ...notPassed, paragraphs: [`Anda tidak mengikuti seluruh tahapan asesmen, sehingga belum dapat dinyatakan lulus pada ${period}.`, nextPeriod] }
    default:
      return null
  }
})

/** Form remedial tampil untuk peserta Remedial yang belum diputuskan (termasuk saat pengiriman ditutup). */
const showRemedialForm = computed(() => data.value?.status === 'REMEDIAL_PENDING' || data.value?.status === 'REMEDIAL_SUBMITTED')
const remedialSent = computed(() => Boolean(data.value?.remedial?.submitted_at))

/* ---------------- Kirim tugas remedial ---------------- */
const saving = ref(false)
const linkError = computed(() => {
  const link = form.drive_link.trim()
  if (!link) return ''
  return isGoogleDriveLink(link) ? '' : 'Gunakan link Google Drive (https://drive.google.com/...).'
})
const canSave = computed(() => Boolean(data.value?.canSubmitRemedial && form.drive_link.trim() && !linkError.value))

async function saveRemedial() {
  if (!canSave.value) return
  saving.value = true

  try {
    const response = await $fetch<{ message: string }>(`${apiPath.value}/remedial`, {
      method: 'PUT',
      credentials: 'include',
      body: { drive_link: form.drive_link.trim(), note: form.note.trim() },
    })
    toast.add({ title: 'Berhasil', description: response.message, color: 'success', icon: 'i-lucide-circle-check' })
    await load()
  } catch (error) {
    toast.add({ title: 'Gagal mengirim', description: getApiErrorMessage(error, 'Silakan coba lagi.'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-6 pb-8">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-primary">Pengumuman Sertifikasi</p>
        <h1 class="mt-2 text-2xl font-bold tracking-tight text-blue-500 sm:text-3xl">
          {{ data?.period.period_name || 'Pengumuman Sertifikasi' }}
        </h1>
      </div>
      <UButton to="/peserta/announcement" color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm" class="shrink-0">
        Kembali
      </UButton>
    </div>

    <div v-if="loading && !data" class="flex items-center justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
      <span class="ml-3 text-sm text-slate-600">Memuat pengumuman...</span>
    </div>

    <UAlert v-else-if="errorMessage || !data" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorMessage || 'Pengumuman belum dapat dimuat.'">
      <template #actions>
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-refresh-cw" @click="load">Muat Ulang</UButton>
      </template>
    </UAlert>

    <template v-else>
      <!-- Pengumuman -->
      <div v-if="notice" class="rounded-2xl border px-6 py-10 text-center shadow-sm" :class="notice.tone">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full border" :class="notice.iconTone">
          <UIcon :name="notice.icon" class="size-8" />
        </div>
        <h2 class="mt-5 text-xl font-semibold text-slate-900">{{ notice.title }}</h2>
        <div class="mx-auto mt-3 max-w-xl space-y-2 text-sm leading-6 text-slate-700">
          <p v-for="paragraph in notice.paragraphs" :key="paragraph">{{ paragraph }}</p>
        </div>
      </div>

      <!-- Form tugas remedial -->
      <UCard v-if="showRemedialForm">
        <template #header>
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="font-semibold text-slate-900">Tugas Remedial</h2>
            <UBadge :color="data.canSubmitRemedial ? 'warning' : 'neutral'" variant="subtle" class="self-start sm:self-auto">
              Batas: {{ formatDateTimeId(data.stage.endAt) }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <UAlert
            v-if="!data.canSubmitRemedial"
            color="neutral"
            variant="subtle"
            icon="i-lucide-lock"
            title="Pengiriman tugas remedial sedang ditutup"
          />

          <p v-if="remedialSent" class="text-sm text-slate-600">
            Dikirim {{ formatDateTimeId(data.remedial?.submitted_at) }}<template v-if="data.remedial?.updated_at && data.remedial.updated_at !== data.remedial.submitted_at">, diperbarui {{ formatDateTimeId(data.remedial.updated_at) }}</template>.
            Link masih dapat diubah selama belum ditinjau panitia.
          </p>

          <UFormField label="Link Google Drive" required :error="linkError || undefined" help="Pastikan akses link diatur ke &quot;Siapa saja yang memiliki link&quot;.">
            <UInput
              v-model="form.drive_link"
              icon="i-lucide-link"
              placeholder="https://drive.google.com/..."
              :maxlength="REMEDIAL_LINK_MAX"
              :disabled="!data.canSubmitRemedial || saving"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Catatan" hint="Opsional">
            <UTextarea
              v-model="form.note"
              :rows="3"
              autoresize
              :maxlength="REMEDIAL_NOTE_MAX"
              placeholder="Keterangan tambahan untuk panitia"
              :disabled="!data.canSubmitRemedial || saving"
              class="w-full"
            />
          </UFormField>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <UButton
              v-if="data.remedial?.drive_link"
              :to="data.remedial.drive_link"
              target="_blank"
              color="neutral"
              variant="outline"
              icon="i-lucide-external-link"
            >
              Buka Link
            </UButton>
            <UButton icon="i-lucide-send" :loading="saving" :disabled="!canSave" @click="saveRemedial">
              {{ remedialSent ? 'Perbarui' : 'Kirim' }}
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
