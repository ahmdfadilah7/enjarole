<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import type { StoryGroup } from '@/types';
import Avatar from './Avatar.vue';
import { getStoryDuration, formatRelativeTime } from '@/utils';
import { XMarkIcon, PhotoIcon, VideoCameraIcon, PencilSquareIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{ groups: StoryGroup[]; startIndex?: number }>();
const emit = defineEmits<{ close: [] }>();

const groupIndex = ref(props.startIndex || 0);
const storyIndex = ref(0);
const progress = ref(0);
const videoRef = ref<HTMLVideoElement | null>(null);
const isPaused = ref(false);
const swipeY = ref(0);
const isClosing = ref(false);

let timer: ReturnType<typeof setInterval> | null = null;
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let didHold = false;
let pointerDownAt = 0;
let pointerStartX = 0;
let pointerStartY = 0;
let tapZone: 'left' | 'center' | 'right' = 'center';

const shellRef = ref<HTMLElement | null>(null);

const currentGroup = computed(() => props.groups[groupIndex.value]);
const currentStory = computed(() => currentGroup.value?.stories[storyIndex.value]);

const storyDurationMs = computed(() => {
  if (!currentStory.value) return 5000;
  return getStoryDuration(currentStory.value) * 1000;
});

const isVideo = computed(() => currentStory.value?.mediaType === 'video');
const isText = computed(() => currentStory.value?.mediaType === 'text');
const isImage = computed(() => currentStory.value?.mediaType === 'image');

const overlayTextClass = computed(() => {
  const bg = currentStory.value?.backgroundColor;
  if (bg === '#0a0a0a' || bg === '#b197fc') return 'text-white';
  return 'text-neo-black';
});

const textStorySizeClass = computed(() => {
  const len = currentStory.value?.textContent?.length || 0;
  if (len > 120) return 'text-xl';
  if (len > 60) return 'text-2xl';
  return 'text-3xl';
});

const mediaTypeLabel = computed(() => {
  if (isVideo.value) return { icon: VideoCameraIcon, label: 'Video' };
  if (isText.value) return { icon: PencilSquareIcon, label: 'Teks' };
  return { icon: PhotoIcon, label: 'Foto' };
});

const shellStyle = computed(() => ({
  transform: swipeY.value > 0 ? `translateY(${swipeY.value}px) scale(${1 - swipeY.value / 800})` : undefined,
  opacity: swipeY.value > 0 ? 1 - swipeY.value / 400 : 1,
}));

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function clearHoldTimer() {
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = null;
}

function startImageTextTimer(resume = false) {
  stopTimer();
  if (!resume) progress.value = 0;

  const tickMs = 50;
  const increment = (tickMs / storyDurationMs.value) * 100;

  timer = setInterval(() => {
    if (isPaused.value) return;
    progress.value += increment;
    if (progress.value >= 100) next();
  }, tickMs);
}

function pause() {
  isPaused.value = true;
  stopTimer();
  videoRef.value?.pause();
}

function resume() {
  if (!isPaused.value) return;
  isPaused.value = false;
  if (isVideo.value && videoRef.value) {
    videoRef.value.play().catch(() => startImageTextTimer(true));
  } else {
    startImageTextTimer(true);
  }
}

function onVideoTimeUpdate() {
  const video = videoRef.value;
  if (!video || !video.duration || isPaused.value) return;
  progress.value = (video.currentTime / video.duration) * 100;
}

function onVideoEnded() {
  if (!isPaused.value) next();
}

async function playCurrentVideo() {
  stopTimer();
  progress.value = 0;
  isPaused.value = false;

  if (!isVideo.value) {
    startImageTextTimer();
    return;
  }

  await new Promise((r) => setTimeout(r, 50));
  const video = videoRef.value;
  if (!video) {
    startImageTextTimer();
    return;
  }
  video.currentTime = 0;
  try {
    await video.play();
  } catch {
    startImageTextTimer();
  }
}

function next() {
  stopTimer();
  if (storyIndex.value < currentGroup.value.stories.length - 1) {
    storyIndex.value++;
  } else if (groupIndex.value < props.groups.length - 1) {
    groupIndex.value++;
    storyIndex.value = 0;
  } else {
    closeViewer();
    return;
  }
  playCurrentVideo();
}

function prev() {
  stopTimer();
  if (storyIndex.value > 0) {
    storyIndex.value--;
  } else if (groupIndex.value > 0) {
    groupIndex.value--;
    storyIndex.value = props.groups[groupIndex.value].stories.length - 1;
  } else {
    progress.value = 0;
    playCurrentVideo();
    return;
  }
  playCurrentVideo();
}

function zoneFromClientX(clientX: number): 'left' | 'center' | 'right' {
  const el = shellRef.value;
  if (!el) return 'center';
  const rect = el.getBoundingClientRect();
  const ratio = (clientX - rect.left) / rect.width;
  if (ratio < 0.35) return 'left';
  if (ratio > 0.65) return 'right';
  return 'center';
}

function onTapPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  pointerStartX = e.clientX;
  pointerStartY = e.clientY;
  tapZone = zoneFromClientX(e.clientX);
  pointerDownAt = Date.now();
  didHold = false;
  clearHoldTimer();
  holdTimer = setTimeout(() => {
    didHold = true;
    pause();
  }, 200);
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onTapPointerUp(e: PointerEvent) {
  clearHoldTimer();

  const elapsed = Date.now() - pointerDownAt;
  const deltaX = Math.abs(e.clientX - pointerStartX);
  const deltaY = e.clientY - pointerStartY;

  if (didHold) {
    resume();
    swipeY.value = 0;
    return;
  }

  const isTap = elapsed < 350 && deltaX < 40 && Math.abs(deltaY) < 40;

  if (isTap) {
    if (tapZone === 'left') prev();
    else if (tapZone === 'right') next();
  } else if (deltaY > 120) {
    closeViewer();
    return;
  }

  swipeY.value = 0;
}

function onTapPointerMove(e: PointerEvent) {
  const deltaY = e.clientY - pointerStartY;
  if (deltaY > 0) swipeY.value = deltaY;
}

function onPointerLeave() {
  clearHoldTimer();
  if (didHold) resume();
  swipeY.value = 0;
}

function closeViewer() {
  isClosing.value = true;
  stopTimer();
  setTimeout(() => emit('close'), 180);
}

watch([groupIndex, storyIndex], () => {
  swipeY.value = 0;
  playCurrentVideo();
});

onMounted(playCurrentVideo);
onUnmounted(() => {
  stopTimer();
  clearHoldTimer();
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-neo-black/95 backdrop-blur-sm transition-opacity duration-200"
    :class="isClosing ? 'opacity-0' : 'opacity-100'"
    @keydown.escape="closeViewer"
    tabindex="0"
  >
    <button
      @click="closeViewer"
      class="btn-ghost absolute right-4 top-4 z-30 border-[3px] border-neo-black bg-neo-yellow neo-shadow-sm"
      aria-label="Tutup"
    >
      <XMarkIcon class="h-5 w-5" />
    </button>

    <div
      ref="shellRef"
      class="story-viewer-shell story-viewer-height mx-2 w-full max-w-[400px] transition-transform duration-150 sm:mx-4"
      :style="shellStyle"
    >
      <!-- Progress bars -->
      <div class="absolute left-0 right-0 top-0 z-20 flex gap-1 px-3 pt-3">
        <div
          v-for="(_, i) in currentGroup.stories"
          :key="i"
          class="story-progress-track"
        >
          <div
            class="story-progress-fill transition-[width] duration-75 ease-linear"
            :style="{
              width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%',
            }"
          />
        </div>
      </div>

      <!-- Header -->
      <div class="absolute left-0 right-0 top-8 z-20 flex items-center justify-between px-3">
        <RouterLink
          :to="`/@${currentGroup.character.username}`"
          class="flex min-w-0 items-center gap-2 border-[3px] border-neo-black bg-neo-yellow/95 px-2.5 py-1.5 neo-shadow-sm transition-transform hover:-translate-y-0.5"
          @click.stop
        >
          <Avatar :character="currentGroup.character" size="sm" />
          <div class="min-w-0">
            <p class="truncate text-sm font-bold leading-tight">{{ currentGroup.character.displayName }}</p>
            <p v-if="currentStory" class="text-[10px] font-medium opacity-70">
              {{ formatRelativeTime(currentStory.createdAt) }}
            </p>
          </div>
        </RouterLink>

        <div class="flex shrink-0 items-center gap-1.5 border-[3px] border-neo-black bg-white/95 px-2 py-1 neo-shadow-sm">
          <component :is="mediaTypeLabel.icon" class="h-3.5 w-3.5" />
          <span class="text-[10px] font-bold uppercase">{{ mediaTypeLabel.label }}</span>
        </div>
      </div>

      <!-- Pause indicator -->
      <Transition name="story-fade">
        <div
          v-if="isPaused"
          class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-neo-black/25"
        >
          <div class="border-[3px] border-neo-black bg-neo-yellow px-4 py-2 text-sm font-bold uppercase neo-shadow-sm">
            Jeda
          </div>
        </div>
      </Transition>

      <!-- Story content -->
      <div class="relative h-full w-full overflow-hidden bg-neo-black">
        <Transition name="story-fade" mode="out-in">
          <div v-if="currentStory" :key="currentStory.id" class="absolute inset-0">
            <!-- Text story -->
            <div
              v-if="isText"
              class="flex h-full w-full items-center justify-center p-8 pt-24"
              :style="{ backgroundColor: currentStory.backgroundColor || '#7bf1a8' }"
            >
              <p
                class="story-text-pop emoji-rich max-w-[90%] text-center font-bold leading-snug break-words"
                :class="[overlayTextClass, textStorySizeClass]"
                style="text-shadow: 4px 4px 0 rgba(0,0,0,0.12)"
              >
                {{ currentStory.textContent }}
              </p>
            </div>

            <!-- Video -->
            <video
              v-else-if="isVideo && currentStory.mediaUrl"
              ref="videoRef"
              :src="currentStory.mediaUrl"
              class="h-full w-full object-cover"
              playsinline
              muted
              @timeupdate="onVideoTimeUpdate"
              @ended="onVideoEnded"
            />

            <!-- Image with Ken Burns -->
            <img
              v-else-if="currentStory.mediaUrl"
              :src="currentStory.mediaUrl"
              class="story-ken-burns h-full w-full object-cover"
              alt="Story"
            />

            <!-- Floating text on image/video -->
            <div
              v-if="!isText && currentStory.textContent"
              class="absolute inset-0 z-10 flex items-center justify-center px-6 pt-16"
            >
              <p class="story-text-pop story-sticker emoji-rich max-w-[88%] text-lg font-bold leading-snug break-words">
                {{ currentStory.textContent }}
              </p>
            </div>

            <!-- Gradient vignette -->
            <div
              v-if="isImage || isVideo"
              class="pointer-events-none absolute inset-0 bg-gradient-to-b from-neo-black/50 via-transparent to-neo-black/30"
            />
          </div>
        </Transition>
      </div>

      <!-- Tap zones (unified pointer — kiri: prev, kanan: next, tengah: tahan jeda) -->
      <div
        class="story-tap-layer absolute inset-0 z-[15] touch-none"
        aria-hidden="true"
        @pointerdown="onTapPointerDown"
        @pointerup="onTapPointerUp"
        @pointermove="onTapPointerMove"
        @pointercancel="onPointerLeave"
        @pointerleave="onPointerLeave"
      />

      <!-- Story counter -->
      <div
        v-if="currentGroup.stories.length > 1"
        class="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 border-[3px] border-neo-black bg-white/90 px-3 py-1 text-[10px] font-bold uppercase neo-shadow-sm"
      >
        {{ storyIndex + 1 }} / {{ currentGroup.stories.length }}
      </div>
    </div>

    <p class="pointer-events-none absolute bottom-4 hidden px-4 text-center text-xs font-medium text-white/50 sm:block">
      Geser ke bawah atau tekan Esc untuk tutup · Ketuk kiri/kanan · Tahan untuk jeda
    </p>
  </div>
</template>
