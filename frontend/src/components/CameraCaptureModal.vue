<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="camera-modal"
      :class="{ 'camera-modal-busy': cartoonProcessing }"
      :aria-busy="cartoonProcessing"
    >
      <div class="camera-modal-header">
        <button
          type="button"
          class="camera-icon-btn"
          aria-label="Tutup"
          :disabled="cartoonProcessing"
          @click="close"
        >
          <XMarkIcon class="h-6 w-6" />
        </button>
        <span v-if="activeLabel" class="camera-filter-label">{{ activeLabel }}</span>
        <button
          type="button"
          class="camera-icon-btn"
          :class="{ 'camera-icon-btn-spin': isFlipping }"
          title="Balik kamera"
          aria-label="Balik kamera"
          :disabled="cartoonProcessing"
          @click="flipCamera"
        >
          <ArrowPathIcon class="h-6 w-6" />
        </button>
      </div>

      <div
        class="camera-preview-wrap"
        :class="{ 'camera-preview-wrap-busy': cartoonProcessing }"
        @dblclick.prevent="onPreviewDblClick"
        @touchend.passive="onPreviewTouchEnd"
      >
        <div class="camera-preview-frame" :class="{ 'camera-flip-anim': isFlipping }">
          <video
            ref="videoEl"
            class="camera-preview"
            :class="{ 'camera-preview-mirror': isFrontCamera }"
            :style="previewFilterStyle"
            autoplay
            playsinline
            muted
          />
          <canvas
            v-show="showOverlayCanvas && !cartoonPreviewUrl"
            ref="overlayEl"
            class="camera-preview camera-preview-overlay"
            :class="{ 'camera-preview-mirror': isFrontCamera }"
          />
          <img
            v-if="cartoonPreviewUrl"
            :src="cartoonPreviewUrl"
            class="camera-preview camera-cartoon-preview-img"
            alt="Hasil kartun"
          />
          <div v-if="showFlash" class="camera-flash" />
        </div>

        <div v-if="isRecording" class="camera-recording-badge">
          <span class="camera-rec-dot" />
          {{ recordSeconds }}s
        </div>

        <p
          v-if="isCartoonGenerateEffect(activeFaceEffectId) && !cartoonPreviewUrl && activeMode === 'photo'"
          class="camera-face-hint"
        >
          Foto diubah menjadi avatar Adventurer (gaya DiceBear) setelah diambil
        </p>

        <p
          v-if="needsFaceDetection(activeFaceEffectId) && !faceDetected && faceReady"
          class="camera-face-hint"
        >
          Posisikan wajah di kamera
        </p>

        <p v-if="faceLoading" class="camera-face-hint">Memuat efek wajah...</p>

        <p v-if="faceInitError" class="camera-error">{{ faceInitError }}</p>
        <p v-if="cartoonModelError" class="camera-error">{{ cartoonModelError }}</p>
        <p v-if="error" class="camera-error">{{ error }}</p>
      </div>

      <!-- Filter / Efek tabs -->
      <div v-if="!cartoonPreviewUrl && !cartoonProcessing" class="camera-picker-tabs">
        <button
          type="button"
          class="camera-picker-tab"
          :class="{ 'camera-picker-tab-active': pickerTab === 'filter' }"
          @click="pickerTab = 'filter'"
        >
          Filter
        </button>
        <button
          type="button"
          class="camera-picker-tab"
          :class="{ 'camera-picker-tab-active': pickerTab === 'effect' }"
          @click="pickerTab = 'effect'"
        >
          Efek Wajah
        </button>
      </div>

      <div v-if="!cartoonPreviewUrl && !cartoonProcessing && pickerTab === 'filter'" class="camera-filters">
        <div class="camera-filters-scroll">
          <button
            v-for="filter in CAMERA_FILTERS"
            :key="filter.id"
            type="button"
            class="camera-filter-item"
            :class="{ 'camera-filter-item-active': activeFilterId === filter.id }"
            @click="selectFilter(filter.id)"
          >
            <span
              class="camera-filter-thumb"
              :style="{ filter: filter.css === 'none' ? undefined : filter.css }"
            />
            <span class="camera-filter-name">{{ filter.name }}</span>
          </button>
        </div>
      </div>

      <div v-else-if="!cartoonPreviewUrl && !cartoonProcessing" class="camera-filters">
        <div class="camera-filters-scroll">
          <button
            v-for="effect in visibleFaceEffects"
            :key="effect.id"
            type="button"
            class="camera-filter-item"
            :class="{ 'camera-filter-item-active': activeFaceEffectId === effect.id }"
            @click="selectFaceEffect(effect.id)"
          >
            <span class="camera-effect-thumb">{{ effect.icon }}</span>
            <span class="camera-filter-name">{{ effect.name }}</span>
            <span v-if="effect.animated" class="camera-effect-animated">Live</span>
            <span v-else-if="effect.generatesCartoon" class="camera-effect-animated">AI</span>
          </button>
        </div>
      </div>

      <div v-if="!cartoonPreviewUrl && !cartoonProcessing && captureMode === 'both'" class="camera-mode-tabs">
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
        <template v-if="cartoonPreviewUrl">
          <div class="camera-cartoon-review-actions">
            <button type="button" class="camera-cartoon-btn camera-cartoon-btn-secondary" @click="retakeCartoon">
              Ulangi
            </button>
            <button type="button" class="camera-cartoon-btn camera-cartoon-btn-primary" @click="confirmCartoon">
              Gunakan
            </button>
          </div>
        </template>
        <template v-else-if="activeMode === 'photo' && !cartoonProcessing">
          <div class="camera-shutter-wrap">
            <button
              type="button"
              class="camera-shutter"
              :class="{ 'camera-shutter-pressed': shutterPressed }"
              aria-label="Ambil foto"
              :disabled="cartoonProcessing"
              @pointerdown="shutterPressed = true"
              @pointerup="shutterPressed = false"
              @pointerleave="shutterPressed = false"
              @click="takePhoto"
            />
          </div>
        </template>
        <template v-else-if="activeMode === 'video' && !cartoonProcessing">
          <div class="camera-shutter-wrap">
            <svg
              v-if="isRecording"
              class="camera-progress-ring"
              viewBox="0 0 80 80"
              aria-hidden="true"
            >
              <circle class="camera-progress-bg" cx="40" cy="40" r="36" />
              <circle
                class="camera-progress-fill"
                cx="40"
                cy="40"
                r="36"
                :style="{ strokeDashoffset: recordProgressOffset }"
              />
            </svg>
            <button
              type="button"
              class="camera-shutter"
              :class="isRecording ? 'camera-shutter-recording' : ''"
              :aria-label="isRecording ? 'Stop rekam' : 'Mulai rekam'"
              @click="toggleRecording"
            />
          </div>
          <p class="camera-hint">
            {{ isRecording ? 'Ketuk untuk berhenti' : `Maks. ${maxVideoSeconds} detik` }}
          </p>
        </template>
      </div>

      <div
        v-if="cartoonProcessing"
        class="camera-cartoon-blocker"
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-label="Sedang mengubah foto menjadi kartun 2D"
      >
        <div class="camera-cartoon-spinner" />
        <p class="camera-cartoon-blocker-title">Membuat avatar Adventurer...</p>
        <p class="camera-cartoon-processing-sub">Warna diambil dari foto Anda</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick, computed } from 'vue';
import { useDeviceCamera, type PipelineOptions } from '@/composables/useDeviceCamera';
import { useFaceLandmarks } from '@/composables/useFaceLandmarks';
import { useCartoonGenerator } from '@/composables/useCartoonGenerator';
import { CAMERA_FILTERS, getCameraFilterCss } from '@/data/cameraFilters';
import {
  drawFaceEffect,
  getVisibleFaceEffects,
  isCartoonGenerateEffect,
  needsFaceDetection,
} from '@/data/cameraFaceEffects';
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
  capture: [payload: { file: File; type: 'image' | 'video'; durationSeconds?: number }];
}>();

const open = defineModel<boolean>('open', { default: false });

const videoEl = ref<HTMLVideoElement | null>(null);
const overlayEl = ref<HTMLCanvasElement | null>(null);
const activeMode = ref<'photo' | 'video'>('photo');
const activeFilterId = ref('normal');
const activeFaceEffectId = ref('none');
const pickerTab = ref<'filter' | 'effect'>('filter');
const showFlash = ref(false);
const isFlipping = ref(false);
const shutterPressed = ref(false);
const cartoonProcessing = ref(false);
const cartoonPreviewUrl = ref('');
let cartoonResultFile: File | null = null;

let lastTapTime = 0;
let overlayRaf: number | null = null;

function onPreviewTouchEnd() {
  if (cartoonProcessing.value) return;
  const now = Date.now();
  if (now - lastTapTime < 320) {
    flipCamera();
    lastTapTime = 0;
  } else {
    lastTapTime = now;
  }
}

function onPreviewDblClick() {
  if (!cartoonProcessing.value) flipCamera();
}

const {
  stream,
  facingMode,
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

const {
  ready: faceReady,
  loading: faceLoading,
  faceDetected,
  init: initFaceLandmarks,
  startDetection,
  stopDetection,
  initError: faceInitError,
  getLandmarks,
} = useFaceLandmarks();

const {
  modelError: cartoonModelError,
  generateFromVideo,
} = useCartoonGenerator();

const isFrontCamera = computed(() => facingMode.value === 'user');

const visibleFaceEffects = computed(() => getVisibleFaceEffects(activeMode.value));

const showOverlayCanvas = computed(
  () => activeFaceEffectId.value !== 'none' && !isCartoonGenerateEffect(activeFaceEffectId.value),
);

const activeLabel = computed(() => {
  if (pickerTab.value === 'effect' && activeFaceEffectId.value !== 'none') {
    return visibleFaceEffects.value.find((e) => e.id === activeFaceEffectId.value)?.name ?? '';
  }
  if (activeFilterId.value !== 'normal') {
    return CAMERA_FILTERS.find((f) => f.id === activeFilterId.value)?.name ?? '';
  }
  return '';
});

const previewFilterStyle = computed(() => {
  const css = getCameraFilterCss(activeFilterId.value);
  return css === 'none' ? {} : { filter: css };
});

const recordProgressOffset = computed(() => {
  const circumference = 2 * Math.PI * 36;
  const progress = Math.min(recordSeconds.value / props.maxVideoSeconds, 1);
  return circumference * (1 - progress);
});

setOnRecorded((file, durationSeconds) => {
  emit('capture', { file, type: 'video', durationSeconds });
  open.value = false;
});

function withAudio() {
  return activeMode.value === 'video' || props.captureMode === 'video';
}

function getFilterCss() {
  return getCameraFilterCss(activeFilterId.value);
}

function drawFaceOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (activeFaceEffectId.value === 'none') return;
  const landmarks = getLandmarks();
  if (!landmarks) return;
  drawFaceEffect(ctx, activeFaceEffectId.value, landmarks, w, h, isFrontCamera.value, performance.now());
}

function getPipeline(): PipelineOptions {
  const effectId = activeFaceEffectId.value;
  return {
    getFilterCss,
    drawOverlay:
      effectId !== 'none' && !isCartoonGenerateEffect(effectId) ? drawFaceOverlay : undefined,
  };
}

function clearCartoonReview() {
  if (cartoonPreviewUrl.value) URL.revokeObjectURL(cartoonPreviewUrl.value);
  cartoonPreviewUrl.value = '';
  cartoonResultFile = null;
}

function stopOverlayLoop() {
  if (overlayRaf != null) cancelAnimationFrame(overlayRaf);
  overlayRaf = null;
  const canvas = overlayEl.value;
  const ctx = canvas?.getContext('2d');
  if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startOverlayLoop() {
  stopOverlayLoop();

  const tick = () => {
    const video = videoEl.value;
    const canvas = overlayEl.value;
    if (video && canvas && video.videoWidth && activeFaceEffectId.value !== 'none') {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const landmarks = getLandmarks();
        if (landmarks) {
          drawFaceEffect(
            ctx,
            activeFaceEffectId.value,
            landmarks,
            canvas.width,
            canvas.height,
            isFrontCamera.value,
            performance.now(),
          );
        }
      }
    }
    overlayRaf = requestAnimationFrame(tick);
  };
  tick();
}

async function initCamera() {
  await nextTick();
  if (videoEl.value) {
    const ok = await start(videoEl.value, withAudio());
    if (ok && needsFaceDetection(activeFaceEffectId.value)) {
      startDetection(videoEl.value);
    }
  }
}

function close() {
  if (cartoonProcessing.value) return;
  open.value = false;
}

function selectFilter(id: string) {
  if (cartoonProcessing.value) return;
  activeFilterId.value = id;
}

function selectFaceEffect(id: string) {
  if (cartoonProcessing.value) return;
  activeFaceEffectId.value = id;
  if (isCartoonGenerateEffect(id)) {
    stopDetection();
    if (activeMode.value === 'video') activeMode.value = 'photo';
  } else if (open.value && videoEl.value) {
    startDetection(videoEl.value);
  }
  startOverlayLoop();
}

function triggerFlash() {
  showFlash.value = true;
  setTimeout(() => {
    showFlash.value = false;
  }, 350);
}

async function flipCamera() {
  if (isFlipping.value || cartoonProcessing.value) return;
  isFlipping.value = true;
  stopDetection();
  if (videoEl.value) await flip(videoEl.value, withAudio());
  if (videoEl.value && needsFaceDetection(activeFaceEffectId.value)) {
    startDetection(videoEl.value);
  }
  setTimeout(() => {
    isFlipping.value = false;
  }, 420);
}

async function setMode(mode: 'photo' | 'video') {
  if (cartoonProcessing.value) return;
  if (isRecording.value) stopRecording(false);
  if (mode === 'video' && isCartoonGenerateEffect(activeFaceEffectId.value)) {
    activeFaceEffectId.value = 'none';
    stopOverlayLoop();
  }
  activeMode.value = mode;
  stopDetection();
  await initCamera();
}

async function takePhoto() {
  if (!videoEl.value || cartoonProcessing.value) return;
  triggerFlash();
  try {
    await new Promise((r) => setTimeout(r, 80));

    if (isCartoonGenerateEffect(activeFaceEffectId.value)) {
      cartoonProcessing.value = true;
      error.value = '';
      try {
        const file = await generateFromVideo(videoEl.value, {
          mirror: isFrontCamera.value,
          filterCss: getFilterCss(),
        });
        clearCartoonReview();
        cartoonResultFile = file;
        cartoonPreviewUrl.value = URL.createObjectURL(file);
      } catch {
        error.value = 'Gagal membuat avatar Adventurer';
      } finally {
        cartoonProcessing.value = false;
      }
      return;
    }

    const file = await capturePhoto(videoEl.value, getPipeline());
    emit('capture', { file, type: 'image' });
    open.value = false;
  } catch {
    error.value = 'Gagal mengambil foto';
  }
}

async function resumeLivePreview() {
  await nextTick();
  const video = videoEl.value;
  if (!video) return;

  if (stream.value && video.srcObject !== stream.value) {
    video.srcObject = stream.value;
    video.muted = true;
    video.playsInline = true;
    try {
      await video.play();
    } catch {
      await initCamera();
    }
  } else if (!stream.value || !video.videoWidth) {
    await initCamera();
  }

  startOverlayLoop();
}

function retakeCartoon() {
  clearCartoonReview();
  error.value = '';
  void resumeLivePreview();
}

function confirmCartoon() {
  if (!cartoonResultFile) return;
  emit('capture', { file: cartoonResultFile, type: 'image' });
  clearCartoonReview();
  open.value = false;
}

function toggleRecording() {
  if (!videoEl.value || cartoonProcessing.value) return;
  if (isRecording.value) {
    stopRecording(true);
    return;
  }
  const started = startRecording(props.maxVideoSeconds, videoEl.value, getPipeline());
  if (!started) {
    error.value = error.value || 'Gagal memulai perekaman video';
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    activeMode.value = props.captureMode === 'video' ? 'video' : 'photo';
    activeFilterId.value = 'normal';
    activeFaceEffectId.value = 'none';
    pickerTab.value = 'filter';
    clearCartoonReview();
    cartoonProcessing.value = false;
    await initFaceLandmarks();
    await initCamera();
    startOverlayLoop();
  } else {
    stopOverlayLoop();
    stopDetection();
    stop(videoEl.value);
    clearCartoonReview();
    cartoonProcessing.value = false;
    showFlash.value = false;
    isFlipping.value = false;
  }
});

onUnmounted(() => {
  stopOverlayLoop();
  stopDetection();
  stop(videoEl.value);
  clearCartoonReview();
});
</script>
