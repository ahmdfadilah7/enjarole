<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { useRequireAuth } from '@/composables/useRequireAuth';
import type { Character, Post } from '@/types';
import Avatar from '@/components/Avatar.vue';
import FollowListModal from '@/components/FollowListModal.vue';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { requireAuth } = useRequireAuth();

const profile = ref<Character | null>(null);
const posts = ref<Post[]>([]);
const loading = ref(true);
const following = ref(false);
const isOwnProfile = ref(false);

const showFollowList = ref(false);
const followListMode = ref<'followers' | 'following'>('followers');

async function loadProfile() {
  loading.value = true;
  const username = route.params.username as string;
  const { data } = await api.get<Character>(`/characters/${username}`);
  profile.value = data;
  isOwnProfile.value = !!auth.character && data.id === auth.character.id;
  following.value = data.isFollowing || false;

  const postsRes = await api.get(`/characters/${username}/posts`);
  posts.value = postsRes.data.data;
  loading.value = false;
}

async function toggleFollow() {
  if (!requireAuth()) return;
  if (!profile.value) return;
  const { data } = await api.post(`/follow/${profile.value.username}`);
  following.value = data.following;
  if (profile.value.followerCount !== undefined) {
    profile.value.followerCount += data.following ? 1 : -1;
  }
}

async function startMessage() {
  if (!requireAuth()) return;
  if (!profile.value) return;
  const { data } = await api.post('/conversations', { username: profile.value.username });
  router.push(`/messages/${data.id}`);
}

function openFollowList(mode: 'followers' | 'following') {
  followListMode.value = mode;
  showFollowList.value = true;
}

onMounted(loadProfile);

watch(() => route.params.username, () => {
  if (route.name === 'profile') loadProfile();
});
</script>

<template>
  <div v-if="loading" class="py-16 text-center">
    <div class="neo-spinner mx-auto mb-3 h-8 w-8 animate-spin" />
    <p class="text-sm font-bold text-neo-black/60">Memuat profil...</p>
  </div>

  <div v-else-if="profile" class="space-y-6">
    <div class="card overflow-hidden p-6">
      <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <Avatar :character="profile" size="lg" />
        <div class="flex-1 text-center sm:text-left">
          <h1 class="text-2xl font-bold logo-text">{{ profile.displayName }}</h1>
          <p class="neo-tag mt-1 inline-block">@{{ profile.username }}</p>
          <p v-if="profile.bio" class="mt-3 leading-relaxed font-medium">{{ profile.bio }}</p>
          <details v-if="profile.backstory" class="mt-3">
            <summary class="neo-link cursor-pointer text-sm">Lihat Backstory</summary>
            <p class="mt-2 whitespace-pre-wrap border-[3px] border-neo-black bg-neo-cream p-3 text-sm leading-relaxed neo-shadow-sm">{{ profile.backstory }}</p>
          </details>
          <div v-if="profile.personalityTraits?.length" class="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span
              v-for="trait in profile.personalityTraits"
              :key="trait"
              class="neo-trait"
            >
              {{ trait }}
            </span>
          </div>
          <div class="mt-5 flex justify-center gap-6 text-sm font-bold sm:justify-start">
            <RouterLink
              :to="`/@${profile.username}/posts`"
              class="cursor-pointer transition-colors hover:text-neo-pink"
            >
              <strong>{{ profile.postCount }}</strong> posting
            </RouterLink>
            <button
              type="button"
              class="cursor-pointer transition-colors hover:text-neo-pink"
              @click="openFollowList('followers')"
            >
              <strong>{{ profile.followerCount }}</strong> pengikut
            </button>
            <button
              type="button"
              class="cursor-pointer transition-colors hover:text-neo-pink"
              @click="openFollowList('following')"
            >
              <strong>{{ profile.followingCount }}</strong> mengikuti
            </button>
          </div>
          <div class="mt-5 flex justify-center gap-3 sm:justify-start">
            <template v-if="isOwnProfile">
              <RouterLink to="/profile/edit" class="btn-secondary">Edit Profil</RouterLink>
            </template>
            <template v-else>
              <button
                @click="toggleFollow"
                class="btn-primary"
                :class="following ? '!bg-neo-cream' : ''"
              >
                {{ following ? 'Berhenti Ikuti' : 'Ikuti' }}
              </button>
              <button @click="startMessage" class="btn-secondary">Pesan</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="posts.length || profile.postCount" class="card overflow-hidden">
      <div class="grid grid-cols-2 border-b-[3px] border-neo-black">
        <div class="flex items-center justify-center gap-2 border-r-[3px] border-neo-black bg-primary-100 py-3 text-xs font-bold uppercase tracking-wider">
          <Squares2X2Icon class="h-5 w-5" />
          Grid
        </div>
        <RouterLink
          :to="`/@${profile.username}/posts`"
          class="flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider text-neo-black/50 transition-colors hover:bg-neo-cream hover:text-neo-black"
        >
          <ListBulletIcon class="h-5 w-5" />
          Feed
        </RouterLink>
      </div>

    <div v-if="posts.length" class="grid grid-cols-3 gap-2 p-2">
      <RouterLink
        v-for="post in posts"
        :key="post.id"
        :to="`/@${profile.username}/p/${post.id}`"
        class="aspect-square overflow-hidden border-[3px] border-neo-black bg-neo-cream transition-all hover:-translate-y-0.5 neo-shadow-sm hover:neo-shadow"
      >
        <img
          v-if="post.mediaUrls?.length"
          :src="post.mediaUrls[0] as string"
          class="h-full w-full object-cover"
          loading="lazy"
        />
        <div v-else class="flex h-full items-center justify-center p-2 text-center text-xs font-medium">
          {{ post.content.slice(0, 80) }}
        </div>
      </RouterLink>
    </div>
    <div v-else class="border-t-[3px] border-neo-black py-16 text-center font-bold text-neo-black/50">
      Belum ada posting
    </div>
    </div>

    <div v-else-if="!posts.length && !profile.postCount" class="card border-dashed py-16 text-center font-bold text-neo-black/50">
      Belum ada posting
    </div>

    <FollowListModal
      v-model:open="showFollowList"
      :username="profile.username"
      :mode="followListMode"
    />
  </div>
</template>
