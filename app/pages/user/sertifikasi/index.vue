<script setup lang="ts">
definePageMeta({
  layout: 'user',
})

const forms = [
  {
    code: 'CSMP.01',
    title: 'Permohonan Sertifikasi',
    description:
      'Data pemohon, pengalaman coaching dan mentoring, serta persyaratan administrasi.',
    status: 'completed',
    to: '/user/sertifikasi/csmp-01',
  },
  {
    code: 'CSMP.02',
    title: 'Asesmen Mandiri Kompetensi',
    description:
      'Pengisian bukti kompetensi coaching dan mentoring pada unit kompetensi yang dipersyaratkan.',
    status: 'completed',
    to: '/user/sertifikasi/csmp-02',
  },
  {
    code: 'CSMP.03',
    title: 'Asesmen Kepublikan',
    description:
      'Pengisian data dan bukti yang diperlukan untuk proses asesmen kepublikan.',
    status: 'draft',
    to: '/user/sertifikasi/csmp-03',
  },
]

const completedForms = forms.filter(
  (form) => form.status === 'completed',
).length

const progress = Math.round((completedForms / forms.length) * 100)

const canSubmit = completedForms === forms.length
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-8">

    <!-- Page Header -->
    <section>
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <p class="text-sm font-medium text-primary">
            SERTIFIKASI SAYA
          </p>

          <h1
            class="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900"
          >
            Sertifikasi Saya
          </h1>

          <p class="mt-2 text-sm text-slate-500">
            Lengkapi seluruh formulir sebelum melakukan submit final.
          </p>
        </div>

        <UBadge
          label="Draft"
          color="neutral"
          variant="subtle"
          class="shrink-0"
        />
      </div>
    </section>

    <!-- Certification Overview -->
    <UCard class="bg-white/90 shadow-sm">
      <div class="flex items-center">
        <!-- Information -->
        <div class="min-w-0 flex-1 pr-10">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-primary"
          >
            Kategori Sertifikasi
          </p>

          <h2
            class="mt-2 text-xl font-semibold leading-7 text-slate-900"
          >
            Certified Public Sector Performance Coach and Mentor
          </h2>

          <p class="mt-1.5 text-sm text-slate-500">
            Periode Sertifikasi September 2026
          </p>
        </div>

        <!-- Progress -->
        <div class="w-52 shrink-0">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-500">
              Progress
            </span>

            <span class="font-semibold text-slate-900">
              {{ progress }}%
            </span>
          </div>

          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full bg-primary transition-all"
              :style="{ width: `${progress}%` }"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Form Steps -->
    <section>
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-slate-900">
          Tahapan Pengisian
        </h2>

        <p class="mt-1 text-sm text-slate-500">
          Simpan formulir sebagai draft dan lakukan Submit Final setelah
          seluruh data lengkap.
        </p>
      </div>

      <div class="space-y-3">
        <UCard
          v-for="(form, index) in forms"
          :key="form.code"
          class="bg-white/90 shadow-sm transition-shadow hover:shadow-md"
        >
          <!-- Main Row -->
          <div class="flex items-center gap-2">

            <!-- Number -->
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary"
            >
              {{ String(index + 1).padStart(2, '0') }}
            </div>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-primary">
                  {{ form.code }}
                </span>

                <UBadge
                  v-if="form.status === 'completed'"
                  label="Tersimpan"
                  color="success"
                  variant="subtle"
                  size="sm"
                />

                <UBadge
                  v-else
                  label="Draft"
                  color="warning"
                  variant="subtle"
                  size="sm"
                />
              </div>

              <h3 class="mt-1 text-base font-semibold text-slate-900">
                {{ form.title }}
              </h3>

              <p class="mt-1 text-sm leading-5 text-slate-500">
                {{ form.description }}
              </p>
            </div>

            <!-- Action -->
            <div class="shrink-0">
              <UButton
                :to="form.to"
                label="Lanjutkan"
                trailing-icon="i-lucide-arrow-right"
                variant="outline"
                size="md"
                class="w-32 justify-center"
              />
            </div>

          </div>
        </UCard>
      </div>
    </section>

    <!-- Final Submit -->
    <UCard class="border-primary/15 bg-primary/[0.035] shadow-sm">
      <div class="flex items-center gap-2">

        <!-- Icon -->
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <UIcon
            name="i-lucide-send"
            class="size-5"
          />
        </div>

        <!-- Information -->
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-slate-900">
            Submit Final
          </h2>

          <p class="mt-1 text-sm leading-5 text-slate-500">
            Setelah submit final, seluruh formulir akan terkunci dan
            tersedia untuk proses assessment.
          </p>
        </div>

        <!-- Action -->
        <UButton
          label="Submit Final"
          trailing-icon="i-lucide-arrow-right"
          :disabled="!canSubmit"
          size="md"
          class="w-36 shrink-0 justify-center"
        />

      </div>
    </UCard>

  </div>
</template>