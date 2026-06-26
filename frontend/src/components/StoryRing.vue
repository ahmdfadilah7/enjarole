<script setup lang="ts">
import type { StoryGroup } from '@/types';
import Avatar from './Avatar.vue';

defineProps<{ groups: StoryGroup[] }>();
const emit = defineEmits<{ open: [groupIndex: number] }>();
</script>

<template>
  <button
    v-for="(group, i) in groups"
    :key="group.character.id"
    type="button"
    @click="emit('open', i)"
    class="group flex shrink-0 flex-col items-center gap-1.5 transition-transform hover:-translate-y-1 active:translate-y-0"
  >
    <div class="relative">
      <Avatar :character="group.character" size="lg" has-story />
      <span
        v-if="group.stories.length > 1"
        class="badge-dot absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center px-1 text-[10px]"
      >
        {{ group.stories.length }}
      </span>
    </div>
    <span class="max-w-[72px] truncate text-xs font-bold text-neo-black/70 group-hover:text-neo-black">
      {{ group.character.displayName }}
    </span>
  </button>
</template>
