<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api/client';
import type { Character } from '@/types';
import Avatar from './Avatar.vue';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  collapsed?: boolean;
  inline?: boolean;
}>();

const emit = defineEmits<{
  expand: [];
  select: [];
}>();

const router = useRouter();

const query = ref('');
const results = ref<Character[]>([]);
const loading = ref(false);
const showResults = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function runSearch() {
  const q = query.value.trim();
  if (!q) {
    results.value = [];
    showResults.value = false;
    return;
  }

  loading.value = true;
  showResults.value = true;
  try {
    const { data } = await api.get<Character[]>('/characters/search', {
      params: { q, limit: 8 },
    });
    results.value = data;
  } catch {
    results.value = [];
  }
  loading.value = false;
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSearch, 300);
}

function clearSearch() {
  query.value = '';
  results.value = [];
  showResults.value = false;
}

function goToProfile(username: string) {
  clearSearch();
  emit('select');
  router.push(`/@${username}`);
}

function openCollapsedSearch() {
  emit('expand');
  nextTick(() => inputRef.value?.focus());
}

function onBlur() {
  setTimeout(() => {
    showResults.value = false;
  }, 150);
}
</script>

<template>
  <div class="sidebar-search mx-2 mb-3">
    <button
      v-if="collapsed"
      type="button"
      class="sidebar-nav-link w-full justify-center"
      title="Cari karakter"
      @click="openCollapsedSearch"
    >
      <MagnifyingGlassIcon class="h-7 w-7 shrink-0 stroke-[2]" />
    </button>

    <div v-else class="relative">
      <div class="relative">
        <MagnifyingGlassIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-[2]" />
        <input
          ref="inputRef"
          v-model="query"
          type="search"
          placeholder="Cari karakter..."
          class="sidebar-search-input w-full"
          @input="onInput"
          @focus="query.trim() && (showResults = true)"
          @blur="onBlur"
        />
        <button
          v-if="query"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5"
          @mousedown.prevent
          @click="clearSearch"
        >
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>

      <div
        v-if="showResults && query.trim()"
        :class="inline ? 'sidebar-search-results-inline mt-2' : 'sidebar-search-results'"
      >
        <div v-if="loading" class="px-4 py-6 text-center">
          <div class="neo-spinner mx-auto h-5 w-5 animate-spin" />
        </div>
        <ul v-else-if="results.length">
          <li
            v-for="user in results"
            :key="user.id"
            class="sidebar-search-item"
            @mousedown.prevent="goToProfile(user.username)"
          >
            <Avatar :character="user" size="sm" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold">{{ user.displayName }}</p>
              <p class="truncate text-xs font-medium text-neo-black/50">@{{ user.username }}</p>
            </div>
          </li>
        </ul>
        <p v-else class="px-4 py-6 text-center text-xs font-medium text-neo-black/50">
          Tidak ada hasil untuk "{{ query }}"
        </p>
      </div>
    </div>
  </div>
</template>
