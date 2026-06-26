<template>
  <Teleport to="body">
    <div v-if="open" class="camera-modal">
      <div class="camera-modal-header">
        <button type="button" class="btn-ghost border-neo-black bg-white/90 p-2" @click="close">
          <XMarkIcon class="h-5 w-5" />
        </button>
        <span class="text-sm font-bold uppercase tracking-wide text-white">
          {{ activeMode === 'photo' ? 'Ambil Foto' : 'Rekam Video' }}
        </span>
        <button
          type="button"
          class="btn-ghost border-neo-black bg-white/90 p-2"
          title="Balik kamera"
          @click="flipCamera"
        >
          <ArrowPathIcon class="h-5 w-5" />
        </button>
      </div>

      <div class="camera-preview-wrap">
        <video ref="videoEl" class="camera-preview" autoplay playsinline muted />
        <div v-if="isRecording" class="camera-recording-badge">
          <span class="camera-rec-dot" />
          {{ recordSeconds }}s / {{ maxVideoSeconds }}s
        </div>
        <p v-if="error" class="camera-error">{{ error }}</p>
      </div>

      <div v-if="captureMode === 'both'" class="camera-mode-tabs">
        <button
          type="button"
          class="camera-mode-tab"
          :class="activeMode === 'photo' ? 'camera-mode-tab-active' : ''"
          @click="setMode('photo')"
        >
          Foto
        </button>
        <button
          type="button"
          class="camera-mode-tab"
          :class="activeMode === 'video' ? 'camera-mode-tab-active' : ''"
          @click="setMode('video')"
        >
          Video
        </button>
      </div>

      <div class="camera-controls">
        <template v-if="activeMode === 'photo'">
          <button type="button" class="camera-shutter" aria-label="Ambil foto" @click="takePhoto" />
        </template>
        <template v-else>
          <button
            type="button"
            class="camera-shutter"
            :class="isRecording ? 'camera-shutter-recording' : ''"
            :aria-label="isRecording ? 'Stop rekam' : 'Mulai rekam'"
            @click="toggleRecording"
          />
          <p class="text-center text-xs font-medium text-white/80">
            {{ isRecording ? 'Ketuk untuk berhenti' : `Maks. ${maxVideoSeconds} detik` }}
          </p>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { useDeviceCamera } from '@/composables/useDeviceCamera';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';

const props = withDefaults(
  defineProps<{
    captureMode?: 'photo' | 'video' | 'both';
    maxVideoSeconds?: number;
  }>(),
  {
    captureMode: 'both',
    maxVideoSeconds: 60,
  },
);

const emit = defineEmits<{
  capture: [payload: { file: File; type: 'image' | 'video' }];
}>();

const open = defineModel<boolean>('open', { default: false });

const videoEl = ref<HTMLVideoElement | null>(null);
const activeMode = ref<'photo' | 'video'>('photo');

const {
  error,
  isRecording,
  recordSeconds,
  start,
  stop,
  flip,
  capturePhoto,
  startRecording,
  stopRecording,
  setOnRecorded,
} = useDeviceCamera();

setOnRecorded((file) => {
  emit('capture', { file, type: 'video' });
  open.value = false;
});

function withAudio() {
  return activeMode.value === 'video' || props.captureMode === 'video';
}

async function initCamera() {
  await nextTick();
  if (videoEl.value) await start(videoEl.value, withAudio());
}

function close() {
  open.value = false;
}

async function flipCamera() {
  if (videoEl.value) await flip(videoEl.value, withAudio());
}

async function setMode(mode: 'photo' | 'video') {
  if (isRecording.value) stopRecording(false);
  activeMode.value = mode;
  await initCamera();
}

async function takePhoto() {
  if (!videoEl.value) return;
  try {
    const file = await capturePhoto(videoEl.value);
    emit('capture', { file, type: 'image' });
    open.value = false;
  } catch {
    error.value = 'Gagal mengambil foto';
  }
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording(true);
    return;
  }
  startRecording(props.maxVideoSeconds);
}

watch(open, (isOpen) => {
  if (isOpen) {
    activeMode.value = props.captureMode === 'video' ? 'video' : 'photo';
    initCamera();
  } else {
    stop(videoEl.value);
  }
});

onUnmounted(() => stop(videoEl.value));
</script>
