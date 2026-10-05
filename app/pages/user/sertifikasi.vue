<script setup lang="ts">
import { computed, ref } from 'vue'
import Cmsp01Form from '~/components/certification/Cmsp01Form.vue'
import Cmsp02Form from '~/components/certification/Cmsp02Form.vue'

definePageMeta({
  layout: 'user',
})

const activeTab = ref<'cmsp01' | 'cmsp02'>('cmsp01')

const cmsp01Ref = ref<InstanceType<typeof Cmsp01Form> | null>(null)

const cmsp01Progress = computed(() =>
  Number(cmsp01Ref.value?.progress ?? 0),
)

const cmsp01DeclarationAccepted = computed(() =>
  Boolean(cmsp01Ref.value?.declarationAccepted ?? false),
)

const cmsp02Ref = ref<InstanceType<typeof Cmsp02Form> | null>(null)

const cmsp02Progress = computed(() =>
  Number(cmsp02Ref.value?.progress ?? 0),
)

const cmsp02Complete = computed(() =>
  Boolean(cmsp02Ref.value?.complete ?? false),
)

const cmsp01Complete = computed(() =>
  cmsp01Progress.value === 100 && cmsp01DeclarationAccepted.value,
)

const allFormsComplete = computed(() =>
  cmsp01Complete.value &&
  cmsp02Complete.value,
)

const tabs = computed(() => [
  {
    id: 'cmsp01' as const,
    label: 'CMSP.01',
    title: 'Permohonan Sertifikasi',
    status: cmsp01Progress.value === 100
      ? 'Lengkap'
      : `${cmsp01Progress.value}%`,
  },
  {
    id: 'cmsp02' as const,
    label: 'CMSP.02',
    title: 'Self-Assessment Teknis',
    status: cmsp02Complete.value ? 'Lengkap' : `${cmsp02Progress.value}%`,
  },
])
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6 pb-10">
    <!-- Page Header -->
    <section>
      <div class="flex items-start justify-between gap-5">
        <div class="min-w-0">
          <p class="text-sm font-medium text-primary">
            Sertifikasi Coaching dan Mentoring
          </p>

          <h1 class="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
            Penyelesaian Sertifikasi
          </h1>

          <p class="mt-2 text-sm leading-6 text-slate-500">
            Lengkapi seluruh formulir sertifikasi sebelum melakukan Submit Final.
          </p>
        </div>

        <UBadge
          label="Periode September 2026"
          color="neutral"
          variant="subtle"
          class="shrink-0"
        />
      </div>
    </section>

    <!-- Tab Navigation -->
    <UCard class="bg-white/90 shadow-sm">
      <div class="grid gap-2 md:grid-cols-3">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-xl border px-4 py-3 text-left transition"
          :class="[
            activeTab === tab.id
              ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/10'
              : 'border-slate-200 bg-white hover:bg-slate-50',
          ]"
          @click="activeTab = tab.id"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p
                class="text-sm font-semibold"
                :class="activeTab === tab.id ? 'text-primary' : 'text-slate-900'"
              >
                {{ tab.label }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                {{ tab.title }}
              </p>
            </div>

            <UBadge
              :label="tab.status"
              :color="tab.status === 'Lengkap' ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            />
          </div>
        </button>
      </div>
    </UCard>

    <!-- Active Form -->
    <section v-show="activeTab === 'cmsp01'">
      <Cmsp01Form ref="cmsp01Ref" />
    </section>

    <section v-show="activeTab === 'cmsp02'">
      <Cmsp02Form ref="cmsp02Ref" />
    </section>

    <!-- Final Submit -->
    <UCard class="bg-white/90 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-900">
            Submit Final Sertifikasi
          </p>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            Submit Final hanya dapat dilakukan setelah CMSP.01 dan CMSP.02
            lengkap. Setelah disubmit, seluruh form akan terkunci.
          </p>
        </div>

        <UButton
          label="Submit Final"
          icon="i-lucide-send"
          size="lg"
          :disabled="!allFormsComplete"
          class="shrink-0"
        />
      </div>
    </UCard>
  </div>
</template>
