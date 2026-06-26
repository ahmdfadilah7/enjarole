<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { ChevronLeftIcon } from '@heroicons/vue/24/outline';
import api from '@/api/client';
import type { Character, Post } from '@/types';
import Avatar from '@/components/Avatar.vue';
import PostCard from '@/components/PostCard.vue';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();

const profile = ref<Character | null>(null);
const posts = ref<Post[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(true);
const loadingMore = ref(false);

const username = ref('');
const highlightPostId = ref<string | null>(null);

async function loadProfile() {
  const { data } = await api.get<Character>(`/characters/${username.value}`);
  profile.value = data;
}

async function loadPosts(reset = false) {
  if (reset) {
    loading.value = true;
    posts.value = [];
    nextCursor.value = null;
  } else if (loadingMore.value || !nextCursor.value) {
    return;
  } else {
    loadingMore.value = true;
  }

  try {
    const { data } = await api.get(`/characters/${username.value}/posts`, {
      params: {
        cursor: reset ? undefined : nextCursor.value,
        limit: 20,
      },
    });
    if (reset) {
      posts.value = data.data;
    } else {
      posts.value.push(...data.data);
    }
    nextCursor.value = data.nextCursor;
  } catch {
    /* ignore */
  }

  loading.value = false;
  loadingMore.value = false;
}

function scrollToPost(postId: string) {
  nextTick(() => {
    const el = document.getElementById(`profile-post-${postId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function onPostUpdated(index: number, updated: Post) {
  posts.value[index] = updated;
}

function onPostDeleted(index: number, postId: string) {
  posts.value.splice(index, 1);
  if (profile.value?.postCount !== undefined) {
    profile.value.postCount -= 1;
  }
  if (route.name === 'profile-post' && highlightPostId.value === postId) {
    router.replace(`/@${username.value}/posts`);
  }
}

async function init() {
  username.value = route.params.username as string;
  highlightPostId.value = (route.params.postId as string) || null;
  await loadProfile();
  await loadPosts(true);
  if (highlightPostId.value) {
    scrollToPost(highlightPostId.value);
  }
}

onMounted(init);

watch(
  () => [route.params.username, route.params.postId],
  () => {
    if (route.name === 'profile-posts' || route.name === 'profile-post') {
      init();
    }
  },
);
</script>

<template>
  <div class="space-y-4">
    <div class="card flex items-center gap-3 px-4 py-3">
      <RouterLink :to="`/@${username}`" class="btn-ghost shrink-0 p-2" title="Kembali ke profil">
        <ChevronLeftIcon class="h-5 w-5 stroke-[2.5]" />
      </RouterLink>
      <RouterLink v-if="profile" :to="`/@${profile.username}`" class="flex min-w-0 flex-1 items-center gap-3">
        <Avatar :character="profile" size="md" />
        <div class="min-w-0">
          <p class="truncate font-bold">Posting @{{ profile.username }}</p>
          <p class="truncate text-sm font-medium text-neo-black/50">{{ profile.displayName }}</p>
        </div>
      </RouterLink>
    </div>

    <div v-if="profile" class="card overflow-hidden">
      <div class="grid grid-cols-2 border-b-[3px] border-neo-black">
        <RouterLink
          :to="`/@${profile.username}`"
          class="flex items-center justify-center gap-2 border-r-[3px] border-neo-black py-3 text-xs font-bold uppercase tracking-wider text-neo-black/50 transition-colors hover:bg-neo-cream hover:text-neo-black"
        >
          <Squares2X2Icon class="h-5 w-5" />
          Grid
        </RouterLink>
        <div class="flex items-center justify-center gap-2 bg-primary-100 py-3 text-xs font-bold uppercase tracking-wider">
          <ListBulletIcon class="h-5 w-5" />
          Feed
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center">
      <div class="neo-spinner mx-auto mb-3 h-8 w-8 animate-spin" />
      <p class="text-sm font-bold text-neo-black/60">Memuat posting...</p>
    </div>

    <div v-else-if="!posts.length" class="card border-dashed py-16 text-center font-bold text-neo-black/50">
      Belum ada posting
    </div>

    <div v-else class="space-y-5">
      <div
        v-for="(post, i) in posts"
        :key="post.id"
        :id="`profile-post-${post.id}`"
        class="scroll-mt-4"
      >
        <PostCard :post="post" @updated="onPostUpdated(i, $event)" @deleted="onPostDeleted(i, $event)" />
      </div>

      <div v-if="nextCursor" class="text-center pb-4">
        <button @click="loadPosts()" :disabled="loadingMore" class="btn-secondary">
          {{ loadingMore ? 'Memuat...' : 'Muat Lebih Banyak' }}
        </button>
      </div>
    </div>
  </div>
</template>
