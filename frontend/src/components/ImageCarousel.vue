<template>
  <div class="relative bg-neo-black">
    <div
      v-if="urls.length > 1"
      class="neo-tag absolute right-3 top-3 z-10 bg-neo-black text-white"
    >
      {{ activeIndex + 1 }}/{{ urls.length }}
    </div>

    <div
      ref="trackRef"
      class="carousel-track flex overflow-x-auto"
      @scroll="onScroll"
    >
      <div
        v-for="(url, i) in urls"
        :key="i"
        class="w-full shrink-0 snap-center"
      >
        <img
          :src="url"
          class="aspect-square w-full object-cover"
          loading="lazy"
          :alt="`Gambar ${i + 1}`"
          draggable="false"
        />
      </div>
    </div>

    <template v-if="urls.length > 1">
      <button
        v-show="activeIndex > 0"
        type="button"
        class="carousel-arrow left-2"
        aria-label="Gambar sebelumnya"
        @click="goTo(activeIndex - 1)"
      >
        <ChevronLeftIcon class="h-5 w-5" />
      </button>
      <button
        v-show="activeIndex < urls.length - 1"
        type="button"
        class="carousel-arrow right-2"
        aria-label="Gambar berikutnya"
        @click="goTo(activeIndex + 1)"
      >
        <ChevronRightIcon class="h-5 w-5" />
      </button>

      <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        <button
          v-for="(_, i) in urls"
          :key="i"
          type="button"
          class="carousel-dot"
          :class="i === activeIndex ? 'carousel-dot-active' : ''"
          :aria-label="`Ke gambar ${i + 1}`"
          @click="goTo(i)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid';

defineProps<{ urls: string[] }>();

const trackRef = ref<HTMLElement | null>(null);
const activeIndex = ref(0);

function onScroll() {
  const track = trackRef.value;
  if (!track || track.clientWidth === 0) return;
  activeIndex.value = Math.round(track.scrollLeft / track.clientWidth);
}

function goTo(index: number) {
  const track = trackRef.value;
  if (!track) return;
  track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  activeIndex.value = index;
}
</script>
