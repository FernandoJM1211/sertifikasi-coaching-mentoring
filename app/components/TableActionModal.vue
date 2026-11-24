<script setup lang="ts">
/**
 * Modal pilihan aksi untuk baris tabel yang memiliki lebih dari satu aksi (gaya Manajemen Akun, docs/05).
 * Dibuka dari tombol ikon `i-lucide-settings-2` di kolom Aksi.
 *
 * Contoh:
 *   <TableActionModal v-model:open="open" title="Pilihan Aksi" :description="item.full_name" :actions="actions">
 *     <template #summary>...ringkasan baris...</template>
 *   </TableActionModal>
 */

import type { TableAction } from '~/utils/table-action'

defineProps<{
  title: string
  description?: string
  actions: TableAction[]
}>()

const open = defineModel<boolean>('open', { default: false })

const TONES: Record<NonNullable<TableAction['tone']>, { icon: string, hover: string }> = {
  blue: { icon: 'border-blue-300 bg-blue-50 text-blue-600', hover: 'hover:border-blue-300 hover:bg-blue-50' },
  amber: { icon: 'border-amber-300 bg-amber-50 text-amber-600', hover: 'hover:border-amber-300 hover:bg-amber-50' },
  red: { icon: 'border-rose-300 bg-rose-50 text-rose-600', hover: 'hover:border-rose-300 hover:bg-rose-50' },
  sky: { icon: 'border-sky-300 bg-sky-50 text-sky-600', hover: 'hover:border-sky-300 hover:bg-sky-50' },
}

const NuxtLink = resolveComponent('NuxtLink')
const toneOf = (action: TableAction) => TONES[action.tone ?? 'blue']
const isLink = (action: TableAction) => Boolean(action.to) && !action.disabledReason

function select(action: TableAction) {
  if (action.disabledReason) return
  open.value = false
  action.onSelect?.()
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #body>
      <div class="space-y-4">
        <div v-if="$slots.summary" class="rounded-xl border border-slate-300 bg-slate-50 p-4">
          <slot name="summary" />
        </div>

        <component
          :is="isLink(action) ? NuxtLink : 'button'"
          v-for="action in actions"
          :key="action.label"
          :type="isLink(action) ? undefined : 'button'"
          :to="isLink(action) ? action.to : undefined"
          :target="isLink(action) && action.newTab ? '_blank' : undefined"
          :disabled="action.disabledReason ? true : undefined"
          class="flex w-full items-center gap-3 rounded-xl border border-slate-300 p-4 text-left transition"
          :class="action.disabledReason ? 'cursor-not-allowed opacity-60' : toneOf(action).hover"
          @click="select(action)"
        >
          <div class="flex size-10 shrink-0 items-center justify-center rounded-lg border" :class="toneOf(action).icon">
            <UIcon :name="action.icon" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-medium text-slate-900">{{ action.label }}</p>
            <p class="mt-1 text-xs text-slate-600">{{ action.disabledReason || action.description }}</p>
          </div>
          <UIcon
            :name="action.newTab ? 'i-lucide-external-link' : 'i-lucide-chevron-right'"
            class="size-4 text-slate-500"
          />
        </component>
      </div>
    </template>
  </UModal>
</template>
