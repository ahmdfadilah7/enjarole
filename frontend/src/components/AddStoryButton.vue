<template>
  <button
    v-if="auth.character"
    type="button"
    class="group flex shrink-0 cursor-pointer flex-col items-center gap-1.5 transition-transform hover:-translate-y-1"
    @click="showModal = true"
  >
    <div class="story-add-ring relative transition-transform group-hover:scale-105">
      <Avatar :character="auth.character" size="lg" />
      <div class="fab absolute -bottom-1 -right-1 h-7 w-7 border-2 transition-transform group-hover:rotate-90">
        <PlusIcon class="h-4 w-4" />
      </div>
    </div>
    <span class="max-w-[72px] truncate text-xs font-bold text-neo-black/60 group-hover:text-neo-black">
      Story Kamu
    </span>

    <CreateStoryModal v-model:open="showModal" @created="emit('created')" />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import Avatar from './Avatar.vue';
import CreateStoryModal from './CreateStoryModal.vue';
import { PlusIcon } from '@heroicons/vue/24/solid';

const auth = useAuthStore();
const emit = defineEmits<{ created: [] }>();
const showModal = ref(false);
</script>
