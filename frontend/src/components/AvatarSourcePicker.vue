<template>
  <div class="flex flex-wrap items-center gap-2">
    <label class="btn-secondary cursor-pointer" :class="{ 'pointer-events-none opacity-60': disabled }">
      <PhotoIcon class="mr-1 inline h-5 w-5" />
      {{ fileLabel }}
      <input
        type="file"
        accept="image/*"
        class="hidden"
        :disabled="disabled"
        @change="onFilePick"
      />
    </label>
    <button
      type="button"
      class="btn-secondary inline-flex items-center gap-1"
      :disabled="disabled"
      @click="showCamera = true"
    >
      <CameraIcon class="h-5 w-5" />
      Kamera
    </button>

    <CameraCaptureModal
      v-model:open="showCamera"
      capture-mode="photo"
      @capture="onCameraCapture"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CameraCaptureModal from './CameraCaptureModal.vue';
import { isImageFile } from '@/utils';
import { CameraIcon, PhotoIcon } from '@heroicons/vue/24/outline';

withDefaults(
  defineProps<{
    fileLabel?: string;
    disabled?: boolean;
  }>(),
  {
    fileLabel: 'Pilih Gambar',
    disabled: false,
  },
);

const emit = defineEmits<{
  select: [file: File];
  error: [message: string];
}>();

const showCamera = ref(false);

function emitFile(file: File) {
  if (!isImageFile(file)) {
    emit('error', 'File harus berupa gambar');
    return;
  }
  emit('select', file);
}

function onFilePick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) emitFile(file);
  (e.target as HTMLInputElement).value = '';
}

function onCameraCapture({ file, type }: { file: File; type: 'image' | 'video' }) {
  if (type !== 'image') {
    emit('error', 'Avatar harus berupa foto');
    return;
  }
  emitFile(file);
}
</script>
