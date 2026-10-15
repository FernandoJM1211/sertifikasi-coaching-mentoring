
<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <!-- Tombol kembali -->
    <div class="flex justify-end">
      <UButton
        to="/verifier/periods"
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
      >
        Kembali
      </UButton>
    </div>

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">
        Tambah Periode Sertifikasi
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Isi informasi periode sertifikasi yang akan dikelola.
      </p>
    </div>

    <!-- Pesan error -->
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="errorMessage"
    />

    <!-- Formulir -->
    <UCard>
      <form
        class="space-y-5"
        @submit.prevent="submitForm"
      >
        <!-- Jenis sertifikasi -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">
            Jenis Sertifikasi
            <span class="text-red-500">*</span>
          </label>

          <USelect
            :model-value="form.certificationTypeId"
            :items="certificationTypeOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih jenis sertifikasi"
            class="w-full"
            :disabled="loadingOptions || !optionsLoaded"
            @update:model-value="handleCertificationTypeChange"
          />
        </div>

        <!-- Kategori sertifikasi -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">
            Kategori Sertifikasi
            <span class="text-red-500">*</span>
          </label>

          <USelect
            :model-value="form.categoryId"
            :items="categoryOptions"
            value-key="value"
            label-key="label"
            placeholder="Pilih kategori sertifikasi"
            class="w-full"
            :disabled="
              loadingOptions ||
              !optionsLoaded ||
              !form.certificationTypeId ||
              categoryOptions.length === 0
            "
            @update:model-value="handleCategoryChange"
          />

          <p class="text-xs text-slate-500">
            Pilihan kategori mengikuti jenis sertifikasi yang dipilih.
          </p>
        </div>

        <!-- Nama periode -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">
            Nama Periode
            <span class="text-red-500">*</span>
          </label>

          <UInput
            v-model="form.periodName"
            class="w-full"
            placeholder="Contoh: Sertifikasi Coach dan Mentor Sektor Publik Periode 2027"
            :maxlength="150"
          />
        </div>

        <!-- Status periode -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">
            Status Periode
          </label>

          <UInput
            model-value="Draft"
            disabled
            class="w-full"
          />

          <p class="text-xs text-slate-500">
            Periode baru dibuat sebagai Draft dan belum dibuka untuk pendaftaran.
          </p>
        </div>

        <!-- Tombol aksi -->
        <div
          class="flex flex-col-reverse justify-end gap-2 border-t border-slate-200 pt-5 sm:flex-row"
        >
          <UButton
            to="/verifier/periods"
            color="neutral"
            variant="outline"
            :disabled="submitting"
          >
            Batal
          </UButton>

          <UButton
            type="submit"
            :loading="submitting"
            :disabled="
              loadingOptions ||
              !optionsLoaded ||
              submitting
            "
            icon="i-lucide-save"
          >
            Simpan Periode
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'

definePageMeta({
  layout: 'verifier',
})

type CertificationType = {
  certification_type_id: string
  type_name: string
}

type CertificationCategory = {
  category_id: string
  certification_type_id: string
  category_name: string
}

const certificationTypes = ref<CertificationType[]>([])
const categories = ref<CertificationCategory[]>([])

const loadingOptions = ref(false)
const optionsLoaded = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

const form = reactive({
  certificationTypeId: '',
  categoryId: '',
  periodName: '',
})

const certificationTypeOptions = computed(() =>
  certificationTypes.value.map((item) => ({
    label: item.type_name,
    value: item.certification_type_id,
  })),
)

const categoryOptions = computed(() =>
  categories.value
    .filter(
      (item) =>
        item.certification_type_id ===
        form.certificationTypeId,
    )
    .map((item) => ({
      label: item.category_name,
      value: item.category_id,
    })),
)

function handleCertificationTypeChange(value: unknown) {
  form.certificationTypeId = String(value ?? '')
  form.categoryId = ''
}

function handleCategoryChange(value: unknown) {
  form.categoryId = String(value ?? '')
}

async function loadOptions() {
  loadingOptions.value = true
  optionsLoaded.value = false
  errorMessage.value = ''

  try {
    const [typeResponse, categoryResponse] =
      await Promise.all([
        $fetch<{
          success: boolean
          data: CertificationType[]
        }>('/api/certification-types'),

        $fetch<{
          success: boolean
          data: CertificationCategory[]
        }>('/api/certification-categories'),
      ])

    certificationTypes.value = typeResponse.data
    categories.value = categoryResponse.data
    optionsLoaded.value = true
  } catch (error: any) {
    console.error(
      'Gagal memuat pilihan sertifikasi:',
      error,
    )

    errorMessage.value =
      error?.data?.statusMessage ||
      error?.data?.message ||
      'Gagal memuat jenis dan kategori sertifikasi.'
  } finally {
    loadingOptions.value = false
  }
}

async function submitForm() {
  errorMessage.value = ''

  if (!form.certificationTypeId) {
    errorMessage.value =
      'Silakan pilih jenis sertifikasi.'
    return
  }

  if (!form.categoryId) {
    errorMessage.value =
      'Silakan pilih kategori sertifikasi.'
    return
  }

  if (!form.periodName.trim()) {
    errorMessage.value =
      'Nama periode wajib diisi.'
    return
  }

  // Pastikan kategori memang milik jenis yang dipilih.
  const selectedCategory = categories.value.find(
    (item) =>
      item.category_id === form.categoryId &&
      item.certification_type_id ===
        form.certificationTypeId,
  )

  if (!selectedCategory) {
    errorMessage.value =
      'Kategori tidak sesuai dengan jenis sertifikasi yang dipilih.'
    return
  }

  submitting.value = true

  try {
    const response = await $fetch<{
      success: boolean
      message: string
      data: {
        period_id: string
      }
    }>('/api/certification-periods', {
      method: 'POST',
      body: {
        certificationTypeId:
          form.certificationTypeId,
        categoryId: form.categoryId,
        periodName: form.periodName.trim(),
        periodStatus: 'DRAFT',
        createdBy: 'USR-000001',
      },
    })

    // Kembali ke daftar periode setelah berhasil menyimpan.
    // Halaman konfigurasi timeline dibuat pada tahap berikutnya.
    await navigateTo('/verifier/periods')

  } catch (error: any) {
    console.error(
      'Gagal membuat periode sertifikasi:',
      error,
    )

    errorMessage.value =
      error?.data?.statusMessage ||
      error?.data?.message ||
      'Gagal membuat periode sertifikasi.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadOptions()
})
</script>
