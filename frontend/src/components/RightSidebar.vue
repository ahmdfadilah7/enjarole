<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import api from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { useRequireAuth } from '@/composables/useRequireAuth';
import type { Character } from '@/types';
import Avatar from './Avatar.vue';

const auth = useAuthStore();
const { requireAuth } = useRequireAuth();

type SuggestedCharacter = Character & { followerCount?: number };

const suggested = ref<SuggestedCharacter[]>([]);
const loading = ref(true);
const followingIds = ref(new Set<string>());

async function loadProfileStats() {
  if (!auth.isAuthenticated) return;
  try {
    await auth.fetchMe();
  } catch {
    /* ignore */
  }
}

async function loadSuggested() {
  loading.value = true;
  try {
    const { data } = await api.get<SuggestedCharacter[]>('/characters/suggested', {
      params: { limit: 3 },
    });
    suggested.value = data;
  } catch {
    suggested.value = [];
  }
  loading.value = false;
}

async function toggleFollow(user: SuggestedCharacter) {
  if (!requireAuth()) return;
  followingIds.value.add(user.id);
  try {
    const { data } = await api.post(`/follow/${user.username}`);
    user.isFollowing = data.following;
    if (user.followerCount !== undefined) {
      user.followerCount += data.following ? 1 : -1;
    }
  } catch {
    /* ignore */
  }
  followingIds.value.delete(user.id);
}

onMounted(() => {
  loadProfileStats();
  loadSuggested();
});
</script>

<template>
  <aside class="right-sidebar">
    <div class="right-sidebar-inner">
      <!-- Profil singkat (login) -->
      <div v-if="auth.isAuthenticated && auth.character" class="card p-4">
        <RouterLink :to="`/@${auth.character.username}`" class="flex items-center gap-3">
          <Avatar :character="auth.character" size="md" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold">{{ auth.character.displayName }}</p>
            <p class="truncate text-sm font-medium text-neo-black/50">@{{ auth.character.username }}</p>
            <p
              v-if="auth.character.followerCount !== undefined || auth.character.followingCount !== undefined"
              class="mt-1 text-xs font-bold"
            >
              <span v-if="auth.character.followerCount !== undefined">{{ auth.character.followerCount }} pengikut</span>
              <span v-if="auth.character.followerCount !== undefined && auth.character.followingCount !== undefined"> · </span>
              <span v-if="auth.character.followingCount !== undefined">{{ auth.character.followingCount }} mengikuti</span>
            </p>
          </div>
        </RouterLink>
        <RouterLink to="/profile/edit" class="neo-link mt-3 inline-block text-xs">
          Edit profil
        </RouterLink>
      </div>

      <!-- CTA tamu -->
      <div v-else class="card p-4">
        <p class="font-bold uppercase tracking-wide">Bergabung</p>
        <p class="mt-2 text-sm font-medium text-neo-black/70">
          Buat karakter dan mulai berpetualang di dunia EnjaRole.
        </p>
        <div class="mt-3 flex gap-2">
          <RouterLink to="/register" class="btn-primary flex-1 text-center text-xs">Daftar</RouterLink>
          <RouterLink to="/login" class="btn-secondary flex-1 text-center text-xs">Masuk</RouterLink>
        </div>
      </div>

      <!-- Saran ikuti -->
      <div class="card overflow-hidden">
        <div class="border-b-[3px] border-neo-black bg-neo-blue px-4 py-3">
          <p class="font-bold uppercase tracking-wide">Saran Untukmu</p>
        </div>

        <div v-if="loading" class="py-8 text-center">
          <div class="neo-spinner mx-auto h-6 w-6 animate-spin" />
        </div>

        <ul v-else-if="suggested.length" class="divide-y-[3px] divide-neo-black">
          <li
            v-for="user in suggested"
            :key="user.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <RouterLink :to="`/@${user.username}`" class="shrink-0">
              <Avatar :character="user" size="sm" />
            </RouterLink>
            <RouterLink :to="`/@${user.username}`" class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold">{{ user.displayName }}</p>
              <p class="truncate text-xs font-medium text-neo-black/50">
                @{{ user.username }}
                <span v-if="user.followerCount !== undefined"> · {{ user.followerCount }} pengikut</span>
              </p>
            </RouterLink>
            <button
              v-if="auth.isAuthenticated && user.id !== auth.character?.id"
              type="button"
              @click="toggleFollow(user)"
              class="shrink-0 px-2 py-1 text-[10px]"
              :class="user.isFollowing ? 'btn-secondary' : 'btn-primary'"
              :disabled="followingIds.has(user.id)"
            >
              {{ user.isFollowing ? 'Mengikuti' : 'Ikuti' }}
            </button>
            <RouterLink
              v-else-if="!auth.isAuthenticated"
              to="/login"
              class="btn-primary shrink-0 px-2 py-1 text-[10px]"
            >
              Lihat
            </RouterLink>
          </li>
        </ul>

        <p v-else class="px-4 py-6 text-center text-xs font-medium text-neo-black/50">
          Belum ada saran saat ini
        </p>
      </div>

      <!-- Tips & fitur -->
      <div class="card p-4">
        <p class="mb-3 font-bold uppercase tracking-wide">Jelajahi</p>
        <div class="flex flex-wrap gap-2">
          <RouterLink to="/feed" class="neo-tag hover:bg-primary-200">Feed Explore</RouterLink>
          <span class="neo-tag !bg-neo-pink">Stories 24j</span>
          <span class="neo-tag !bg-neo-purple">Roleplay</span>
          <span class="neo-tag !bg-neo-blue">Direct Message</span>
        </div>
      </div>

      <!-- Footer -->
      <p class="px-2 text-center text-[10px] font-medium text-neo-black/40">
        © EnjaRole · Dunia karakter & cerita
      </p>
    </div>
  </aside>
</template>
