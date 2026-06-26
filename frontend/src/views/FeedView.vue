<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRequireAuth } from '@/composables/useRequireAuth';
import { useCreatePost } from '@/composables/useCreatePost';
import api from '@/api/client';
import type { Post, StoryGroup } from '@/types';
import PostCard from '@/components/PostCard.vue';
import StoryRing from '@/components/StoryRing.vue';
import AddStoryButton from '@/components/AddStoryButton.vue';
import StoryViewer from '@/components/StoryViewer.vue';
import { PlusIcon } from '@heroicons/vue/24/solid';

const auth = useAuthStore();
const { requireAuth } = useRequireAuth();
const { openCreatePost, onPostCreated } = useCreatePost();

const mode = ref<'following' | 'explore'>('explore');
const posts = ref<Post[]>([]);
const storyGroups = ref<StoryGroup[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const showStoryViewer = ref(false);
const storyStartIndex = ref(0);

const isLoggedIn = computed(() => auth.isAuthenticated);

async function loadFeed(reset = false) {
  if (loading.value) return;
  loading.value = true;
  try {
    const { data } = await api.get('/feed', {
      params: {
        mode: mode.value,
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
}

async function loadStories() {
  if (!auth.isAuthenticated) return;
  try {
    const { data } = await api.get('/stories/feed');
    storyGroups.value = data;
  } catch {
    /* ignore */
  }
}

function onPostUpdated(index: number, updated: Post) {
  posts.value[index] = updated;
}

function onPostDeleted(index: number) {
  posts.value.splice(index, 1);
}

function openStory(index: number) {
  storyStartIndex.value = index;
  showStoryViewer.value = true;
}

function switchMode(newMode: 'following' | 'explore') {
  if (newMode === 'following' && !auth.isAuthenticated) {
    requireAuth('/feed');
    return;
  }
  mode.value = newMode;
  nextCursor.value = null;
  loadFeed(true);
}

function openCreatePostModal() {
  if (!requireAuth('/feed')) return;
  openCreatePost();
}

onPostCreated(() => loadFeed(true));

onMounted(() => {
  loadFeed(true);
  loadStories();
});
</script>

<template>
  <div class="space-y-4 pb-4">
    <div v-if="isLoggedIn" class="card overflow-hidden">
      <div class="flex items-center justify-between border-b-[3px] border-neo-black bg-neo-cream px-4 py-2">
        <span class="text-xs font-bold uppercase tracking-wider">✨ Stories</span>
        <span v-if="storyGroups.length" class="text-[10px] font-medium text-neo-black/50">
          {{ storyGroups.length }} aktif
        </span>
      </div>
      <div class="story-scroll flex gap-4 overflow-x-auto px-3 py-3">
        <AddStoryButton @created="loadStories" />
        <StoryRing v-if="storyGroups.length" :groups="storyGroups" @open="openStory" />
      </div>
    </div>

    <div class="flex items-center justify-between gap-2">
      <div class="flex gap-2">
        <button
          v-if="isLoggedIn"
          @click="switchMode('following')"
          class="px-5 py-2 text-sm transition-all"
          :class="mode === 'following' ? 'pill-active' : 'pill-inactive'"
        >
          Following
        </button>
        <button
          @click="switchMode('explore')"
          class="px-5 py-2 text-sm transition-all"
          :class="mode === 'explore' ? 'pill-active' : 'pill-inactive'"
        >
          Explore
        </button>
      </div>
      <button
        v-if="isLoggedIn"
        @click="openCreatePostModal"
        class="fab h-11 w-11 shrink-0"
        title="Buat posting"
      >
        <PlusIcon class="h-6 w-6" />
      </button>
    </div>

    <div v-if="!isLoggedIn" class="neo-banner flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm font-medium">Masuk untuk posting, like, dan berinteraksi.</p>
      <RouterLink to="/login" class="btn-primary shrink-0 text-xs">Masuk</RouterLink>
    </div>

    <div v-if="loading && !posts.length" class="py-16 text-center">
      <div class="neo-spinner mx-auto mb-3 h-8 w-8 animate-spin" />
      <p class="text-sm font-bold text-neo-black/60">Memuat feed...</p>
    </div>

    <div v-else-if="!posts.length" class="card border-dashed py-16 text-center">
      <p class="text-4xl">🌿</p>
      <p class="mt-3 font-bold uppercase tracking-wide">Feed masih kosong</p>
      <p class="mt-1 text-sm font-medium text-neo-black/60">Belum ada posting di platform ini.</p>
    </div>

    <div class="space-y-5">
      <PostCard
        v-for="(post, i) in posts"
        :key="post.id"
        :post="post"
        @updated="onPostUpdated(i, $event)"
        @deleted="onPostDeleted(i)"
      />
    </div>

    <div v-if="nextCursor" class="pb-2 text-center">
      <button @click="loadFeed()" :disabled="loading" class="btn-secondary">
        {{ loading ? 'Memuat...' : 'Muat Lebih Banyak' }}
      </button>
    </div>

    <StoryViewer
      v-if="showStoryViewer"
      :groups="storyGroups"
      :start-index="storyStartIndex"
      @close="showStoryViewer = false"
    />
  </div>
</template>
