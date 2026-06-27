<template>
  <div
    ref="rootEl"
    class="feed-video-player"
    @click="onTap"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <video
      ref="videoEl"
      class="feed-video-player__video"
      :src="src"
      :muted="isMuted"
      loop
      playsinline
      preload="auto"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onMediaReady"
      @loadeddata="onMediaReady"
      @canplay="onMediaReady"
      @play="onPlay"
      @pause="onPause"
      @waiting="buffering = true"
      @playing="buffering = false"
      @error="onVideoError"
    />

    <div v-if="loadError" class="feed-video-player__error">
      <p class="text-xs font-bold uppercase tracking-wide">{{ errorMessage }}</p>
      <p v-if="!codecError" class="mt-1 text-[10px] font-medium opacity-80">Klik untuk coba lagi</p>
    </div>

    <Transition name="feed-video-flash">
      <div v-if="flashIcon" class="feed-video-player__flash" aria-hidden="true">
        <PauseIcon v-if="flashIcon === 'pause'" class="h-14 w-14 stroke-[2]" />
        <PlayIcon v-else class="ml-1 h-14 w-14 stroke-[2]" />
      </div>
    </Transition>

    <button
      v-if="!loadError"
      type="button"
      class="feed-video-player__mute"
      :aria-label="isMuted ? 'Nyalakan suara' : 'Matikan suara'"
      @click.stop="toggleMute"
    >
      <SpeakerXMarkIcon v-if="isMuted" class="h-5 w-5 stroke-[2.5]" />
      <SpeakerWaveIcon v-else class="h-5 w-5 stroke-[2.5]" />
    </button>

    <div v-if="buffering && isPlaying && !loadError" class="feed-video-player__spinner" aria-hidden="true" />

    <div class="feed-video-player__progress" aria-hidden="true">
      <div class="feed-video-player__progress-fill" :style="{ width: `${progress}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import {
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/vue/24/solid';
import {
  registerFeedVideo,
  setActiveFeedVideo,
  unregisterFeedVideo,
} from '@/composables/useFeedVideoCoordinator';
import { canPlayWebM, isWebmUrl } from '@/utils';

const props = withDefaults(
  defineProps<{
    src: string;
    /** Carousel slide aktif — hanya autoplay jika true */
    active?: boolean;
    playerId?: string;
  }>(),
  { active: true },
);

const rootEl = ref<HTMLElement | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);
const isMuted = ref(true);
const isPlaying = ref(false);
const progress = ref(0);
const buffering = ref(false);
const inView = ref(false);
const loadError = ref(false);
const codecError = ref(false);
const errorMessage = ref('Video gagal dimuat');
const flashIcon = ref<'play' | 'pause' | null>(null);

const id = props.playerId ?? props.src;
let observer: IntersectionObserver | null = null;
let flashTimer: ReturnType<typeof setTimeout> | null = null;
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let didHold = false;

function checkInitialVisibility() {
  const el = rootEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0) return;
  const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  const ratio = visible / rect.height;
  if (ratio >= 0.25 && rect.top < window.innerHeight) {
    inView.value = true;
    syncPlayback();
  }
}

function checkCodecSupport() {
  if (isWebmUrl(props.src) && !canPlayWebM()) {
    codecError.value = true;
    loadError.value = true;
    errorMessage.value = 'Browser ini tidak mendukung WebM (Safari). Gunakan Chrome/Edge atau upload MP4.';
  }
}

function syncProgress() {
  const video = videoEl.value;
  if (!video?.duration) return;
  progress.value = (video.currentTime / video.duration) * 100;
}

function onTimeUpdate() {
  syncProgress();
}

function showFlash(type: 'play' | 'pause') {
  flashIcon.value = type;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flashIcon.value = null;
  }, 450);
}

function paintFirstFrame() {
  const video = videoEl.value;
  if (!video || video.readyState < 2) return;
  if (video.currentTime === 0) {
    try {
      video.currentTime = 0.001;
    } catch {
      /* ignore seek errors before metadata */
    }
  }
}

async function play() {
  const video = videoEl.value;
  if (!video || !props.active || !inView.value || loadError.value) return;
  try {
    await video.play();
    loadError.value = false;
  } catch {
    paintFirstFrame();
  }
}

function pause() {
  videoEl.value?.pause();
}

function onPlay() {
  isPlaying.value = true;
  loadError.value = false;
  setActiveFeedVideo(id);
}

function onPause() {
  isPlaying.value = false;
}

function onMediaReady() {
  buffering.value = false;
  loadError.value = false;
  paintFirstFrame();
  syncPlayback();
}

function onVideoError() {
  if (codecError.value) return;
  loadError.value = true;
  errorMessage.value = 'Video gagal dimuat';
  buffering.value = false;
  isPlaying.value = false;
}

function shouldAutoplay() {
  return props.active && inView.value && !loadError.value;
}

function syncPlayback() {
  if (shouldAutoplay()) {
    void play();
  } else if (!inView.value || !props.active) {
    pause();
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value;
  if (videoEl.value) videoEl.value.muted = isMuted.value;
}

function onTap() {
  if (didHold) return;
  const video = videoEl.value;
  if (!video) return;

  if (loadError.value) {
    if (codecError.value) return;
    loadError.value = false;
    errorMessage.value = 'Video gagal dimuat';
    video.load();
    void play();
    return;
  }

  if (video.paused) {
    void video.play();
    showFlash('play');
  } else {
    video.pause();
    showFlash('pause');
  }
}

function onPointerDown() {
  didHold = false;
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    didHold = true;
    const video = videoEl.value;
    if (video && !video.paused) {
      video.pause();
      showFlash('pause');
    }
  }, 220);
}

function onPointerUp() {
  if (holdTimer) clearTimeout(holdTimer);
  if (didHold) {
    didHold = false;
    if (shouldAutoplay()) void play();
  }
}

watch(() => props.active, syncPlayback);

watch(
  () => props.src,
  () => {
    loadError.value = false;
    codecError.value = false;
    errorMessage.value = 'Video gagal dimuat';
    progress.value = 0;
    checkCodecSupport();
  },
);

onMounted(() => {
  registerFeedVideo(id, { pause });
  checkCodecSupport();

  observer = new IntersectionObserver(
    ([entry]) => {
      inView.value = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      syncPlayback();
    },
    { threshold: [0, 0.25, 0.5, 0.75] },
  );

  if (rootEl.value) observer.observe(rootEl.value);
  requestAnimationFrame(checkInitialVisibility);
});

onUnmounted(() => {
  observer?.disconnect();
  if (flashTimer) clearTimeout(flashTimer);
  if (holdTimer) clearTimeout(holdTimer);
  pause();
  unregisterFeedVideo(id);
});

defineExpose({ pause, play });
</script>
