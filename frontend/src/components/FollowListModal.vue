<template>
  <Teleport to="body">
    <div v-if="open" class="neo-modal-backdrop" @click.self="open = false">
      <div class="neo-modal max-h-[80vh] flex flex-col">
        <div class="neo-modal-header relative shrink-0 justify-center">
          <h3 class="font-bold uppercase tracking-wide">
            {{ mode === 'followers' ? 'Pengikut' : 'Mengikuti' }}
          </h3>
          <button @click="open = false" class="btn-ghost absolute right-4 p-1">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <div v-if="loading" class="py-12 text-center">
            <div class="neo-spinner mx-auto mb-3 h-8 w-8 animate-spin" />
            <p class="text-sm font-bold text-neo-black/60">Memuat...</p>
          </div>

          <div v-else-if="!users.length" class="py-12 text-center">
            <p class="text-sm font-bold text-neo-black/50">
              {{ mode === 'followers' ? 'Belum ada pengikut' : 'Belum mengikuti siapa pun' }}
            </p>
          </div>

          <ul v-else class="divide-y-[3px] divide-neo-black">
            <li
              v-for="user in users"
              :key="user.id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <RouterLink :to="`/@${user.username}`" class="shrink-0" @click="open = false">
                <Avatar :character="user" size="md" />
              </RouterLink>
              <RouterLink
                :to="`/@${user.username}`"
                class="min-w-0 flex-1"
                @click="open = false"
              >
                <p class="truncate font-bold">{{ user.displayName }}</p>
                <p class="truncate text-sm font-medium text-neo-black/50">@{{ user.username }}</p>
              </RouterLink>
              <button
                v-if="showFollowButton(user)"
                @click="toggleFollow(user)"
                class="shrink-0 text-xs"
                :class="user.isFollowing ? 'btn-secondary' : 'btn-primary'"
                :disabled="followingIds.has(user.id)"
              >
                {{ user.isFollowing ? 'Mengikuti' : 'Ikuti' }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import api from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { useRequireAuth } from '@/composables/useRequireAuth';
import type { Character } from '@/types';
import Avatar from './Avatar.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  username: string;
  mode: 'followers' | 'following';
}>();

const open = defineModel<boolean>('open', { default: false });

const auth = useAuthStore();
const { requireAuth } = useRequireAuth();

const users = ref<Character[]>([]);
const loading = ref(false);
const followingIds = ref(new Set<string>());

function showFollowButton(user: Character) {
  return auth.isAuthenticated && user.id !== auth.character?.id;
}

async function loadUsers() {
  if (!props.username) return;
  loading.value = true;
  try {
    const endpoint = props.mode === 'followers' ? 'followers' : 'following';
    const { data } = await api.get<Character[]>(`/characters/${props.username}/${endpoint}`);
    users.value = data;
  } catch {
    users.value = [];
  }
  loading.value = false;
}

async function toggleFollow(user: Character) {
  if (!requireAuth()) return;
  followingIds.value.add(user.id);
  try {
    const { data } = await api.post(`/follow/${user.username}`);
    user.isFollowing = data.following;
  } catch {
    /* ignore */
  }
  followingIds.value.delete(user.id);
}

watch(open, (isOpen) => {
  if (isOpen) loadUsers();
});
</script>
