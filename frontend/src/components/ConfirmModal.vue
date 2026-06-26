<template>
  <Teleport to="body">
    <div v-if="open" class="neo-modal-backdrop" @click.self="onCancel">
      <div class="neo-modal max-w-sm" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <div class="neo-modal-header relative justify-center">
          <h3 :id="titleId" class="font-bold uppercase tracking-wide">{{ title }}</h3>
          <button type="button" class="btn-ghost absolute right-4 p-1" aria-label="Tutup" @click="onCancel">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="p-5">
          <p class="text-sm font-medium leading-relaxed text-neo-black/80">{{ message }}</p>
        </div>

        <div class="flex gap-3 border-t-[3px] border-neo-black px-5 py-4">
          <button type="button" class="btn-secondary flex-1" :disabled="loading" @click="onCancel">
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="flex-1 border-[3px] border-neo-black px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-50"
            :class="confirmClass"
            :disabled="loading"
            @click="emit('confirm')"
          >
            {{ loading ? loadingLabel : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

const props = withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loadingLabel?: string;
    variant?: 'danger' | 'primary';
    loading?: boolean;
  }>(),
  {
    title: 'Konfirmasi',
    message: 'Apakah Anda yakin?',
    confirmLabel: 'Ya',
    cancelLabel: 'Batal',
    loadingLabel: 'Memproses...',
    variant: 'primary',
    loading: false,
  },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();
const open = defineModel<boolean>('open', { default: false });

const titleId = useId();

const confirmClass = computed(() =>
  props.variant === 'danger'
    ? 'bg-neo-pink text-neo-black neo-shadow-sm hover:bg-neo-pink/90 active:translate-x-[2px] active:translate-y-[2px]'
    : 'btn-primary',
);

function onCancel() {
  if (props.loading) return;
  open.value = false;
  emit('cancel');
}
</script>
