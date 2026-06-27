<template>
  <div class="relative inline-block">
    <div v-if="hasStory" class="story-ring">
      <img
        v-if="avatarSrc"
        :src="avatarSrc"
        :alt="character.displayName"
        class="neo-avatar"
        :class="sizeClasses[size || 'md']"
      />
      <div
        v-else
        class="neo-avatar-fallback"
        :class="sizeClasses[size || 'md']"
      >
        {{ getInitials(character.displayName) }}
      </div>
    </div>
    <template v-else>
      <img
        v-if="avatarSrc"
        :src="avatarSrc"
        :alt="character.displayName"
        class="neo-avatar"
        :class="sizeClasses[size || 'md']"
      />
      <div
        v-else
        class="neo-avatar-fallback"
        :class="sizeClasses[size || 'md']"
      >
        {{ getInitials(character.displayName) }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Character } from '@/types';
import { getInitials, resolveMediaUrl } from '@/utils';

const props = defineProps<{
  character: Character;
  size?: 'sm' | 'md' | 'lg';
  hasStory?: boolean;
}>();

const avatarSrc = computed(() => resolveMediaUrl(props.character.avatarUrl));

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-xl',
};
</script>
