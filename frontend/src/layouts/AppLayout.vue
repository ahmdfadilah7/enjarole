<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { useSocket } from '@/composables/useSocket';
import { useRequireAuth } from '@/composables/useRequireAuth';
import { useCreatePost } from '@/composables/useCreatePost';
import CreatePostModal from '@/components/CreatePostModal.vue';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';
import RightSidebar from '@/components/RightSidebar.vue';
import SidebarSearch from '@/components/SidebarSearch.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const socket = useSocket();
const notificationsStore = useNotificationsStore();
const { requireAuth } = useRequireAuth();
const { showCreatePost, openCreatePost, emitPostCreated } = useCreatePost();

const sidebarCollapsed = ref(
  localStorage.getItem('sidebarCollapsed') === 'true',
);
const showMobileSearch = ref(false);

const sidebarStyle = computed(() => ({
  '--width-sidebar-current': sidebarCollapsed.value
    ? 'var(--width-sidebar-collapsed)'
    : 'var(--width-sidebar)',
}));

const authNavItems = computed(() => [
  { to: '/feed', icon: HomeIcon, label: 'Beranda' },
  { to: '/messages', icon: ChatBubbleLeftRightIcon, label: 'Pesan' },
  { to: '/notifications', icon: BellIcon, label: 'Notifikasi', badge: true },
  { to: `/@${auth.character?.username}`, icon: UserCircleIcon, label: 'Profil', isProfile: true },
]);

const isWideLayout = computed(() => route.path.startsWith('/messages'));

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value));
}

function expandSidebar() {
  sidebarCollapsed.value = false;
  localStorage.setItem('sidebarCollapsed', 'false');
}

async function initAuthenticatedFeatures() {
  if (!auth.isAuthenticated) return;
  socket.connect();
  await notificationsStore.fetchUnreadCount();
  socket.onNotification((n) => {
    notificationsStore.setUnreadCount(n.unreadCount);
  });
}

onMounted(initAuthenticatedFeatures);

watch(
  () => auth.isAuthenticated,
  (loggedIn) => {
    if (loggedIn) {
      initAuthenticatedFeatures();
    } else {
      socket.disconnect();
      notificationsStore.setUnreadCount(0);
    }
  },
);

function logout() {
  socket.disconnect();
  auth.logout();
  notificationsStore.setUnreadCount(0);
  router.push('/feed');
}

function isNavActive(itemTo: string) {
  if (itemTo === '/feed') return route.path === '/feed';
  if (itemTo.startsWith('/@')) return route.path.startsWith('/@');
  return route.path.startsWith(itemTo);
}

function profileAvatarUrl(item: { isProfile?: boolean }) {
  if (!item.isProfile || !auth.character?.avatarUrl) return null;
  return auth.character.avatarUrl;
}

function handleCreatePost() {
  if (!requireAuth('/feed')) return;
  openCreatePost();
}

function onPostCreated() {
  emitPostCreated();
}
</script>

<template>
  <div
    class="page-bg min-h-screen overflow-x-hidden"
    :class="{ 'sidebar-is-collapsed': sidebarCollapsed }"
    :style="sidebarStyle"
  >
    <!-- Desktop sidebar -->
    <aside class="sidebar-nav">
      <RouterLink to="/feed" class="sidebar-logo">
        <div class="logo-box h-10 w-10 shrink-0 text-lg">E</div>
        <span class="sidebar-logo-text">EnjaRole</span>
      </RouterLink>

      <SidebarSearch :collapsed="sidebarCollapsed" @expand="expandSidebar" />

      <nav class="flex flex-1 flex-col gap-1">
        <template v-if="auth.isAuthenticated">
          <RouterLink
            v-for="item in authNavItems"
            :key="item.to"
            :to="item.to"
            class="sidebar-nav-link"
            :class="isNavActive(item.to) ? 'sidebar-nav-link-active' : ''"
            :title="sidebarCollapsed ? item.label : undefined"
          >
            <img
              v-if="profileAvatarUrl(item)"
              :src="profileAvatarUrl(item)!"
              :alt="auth.character!.displayName"
              class="sidebar-nav-avatar"
            />
            <component v-else :is="item.icon" class="h-7 w-7 shrink-0 stroke-[2]" />
            <span class="sidebar-nav-label">{{ item.label }}</span>
            <span
              v-if="item.badge && notificationsStore.unreadCount > 0"
              class="sidebar-nav-badge badge-dot ml-auto flex h-5 min-w-5 items-center justify-center px-1 text-xs"
            >
              {{ notificationsStore.unreadCount > 99 ? '99+' : notificationsStore.unreadCount }}
            </span>
          </RouterLink>

          <button
            type="button"
            class="sidebar-nav-link sidebar-create-btn"
            title="Buat Posting"
            @click="handleCreatePost"
          >
            <PlusIcon class="h-7 w-7 shrink-0 stroke-[2.5]" />
            <span class="sidebar-nav-label">Buat Posting</span>
          </button>

          <button
            @click="toggleSidebar"
            class="sidebar-toggle mt-2"
            :title="sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'"
          >
            <ChevronRightIcon v-if="sidebarCollapsed" class="h-5 w-5 shrink-0 stroke-[2.5]" />
            <ChevronLeftIcon v-else class="h-5 w-5 shrink-0 stroke-[2.5]" />
            <span class="sidebar-toggle-label overflow-hidden whitespace-nowrap">
              {{ sidebarCollapsed ? 'Buka' : 'Tutup' }}
            </span>
          </button>

          <button @click="logout" class="sidebar-nav-link mt-2 text-left" title="Keluar">
            <ArrowRightOnRectangleIcon class="h-7 w-7 shrink-0 stroke-[2]" />
            <span class="sidebar-nav-label">Keluar</span>
          </button>
        </template>
        <template v-else>
          <RouterLink
            to="/feed"
            class="sidebar-nav-link"
            :class="route.path === '/feed' ? 'sidebar-nav-link-active' : ''"
            title="Beranda"
          >
            <HomeIcon class="h-7 w-7 shrink-0 stroke-[2]" />
            <span class="sidebar-nav-label">Beranda</span>
          </RouterLink>
          <RouterLink to="/login" class="sidebar-nav-link" title="Masuk">
            <UserCircleIcon class="h-7 w-7 shrink-0 stroke-[2]" />
            <span class="sidebar-nav-label">Masuk</span>
          </RouterLink>
          <RouterLink to="/register" class="sidebar-nav-link" title="Daftar">
            <PlusIcon class="h-7 w-7 shrink-0 stroke-[2]" />
            <span class="sidebar-nav-label">Daftar</span>
          </RouterLink>

          <button
            @click="toggleSidebar"
            class="sidebar-toggle mt-4"
            :title="sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'"
          >
            <ChevronRightIcon v-if="sidebarCollapsed" class="h-5 w-5 shrink-0 stroke-[2.5]" />
            <ChevronLeftIcon v-else class="h-5 w-5 shrink-0 stroke-[2.5]" />
            <span class="sidebar-toggle-label overflow-hidden whitespace-nowrap">
              {{ sidebarCollapsed ? 'Buka' : 'Tutup' }}
            </span>
          </button>
        </template>
      </nav>
    </aside>

    <!-- Mobile top bar -->
    <header class="neo-header sticky top-0 z-40 lg:hidden">
      <div class="relative flex h-14 items-center justify-center px-4">
        <RouterLink to="/feed" class="flex items-center gap-2">
          <div class="logo-box h-9 w-9 text-base">E</div>
          <span class="text-xl font-bold logo-text">EnjaRole</span>
        </RouterLink>
        <button
          type="button"
          class="btn-ghost absolute right-3 p-2"
          title="Cari karakter"
          @click="showMobileSearch = true"
        >
          <MagnifyingGlassIcon class="h-5 w-5 stroke-[2]" />
        </button>
      </div>
    </header>

    <Teleport to="body">
      <div
        v-if="showMobileSearch"
        class="neo-modal-backdrop lg:hidden"
        @click.self="showMobileSearch = false"
      >
        <div class="neo-modal mx-4 max-w-md">
          <div class="neo-modal-header relative justify-center">
            <h3 class="font-bold uppercase tracking-wide">Cari Karakter</h3>
            <button @click="showMobileSearch = false" class="btn-ghost absolute right-4 p-1">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>
          <div class="p-4">
            <SidebarSearch inline @select="showMobileSearch = false" />
          </div>
        </div>
      </div>
    </Teleport>

    <div class="app-main-area">
      <div class="app-content-row">
        <main
          class="w-full min-w-0 shrink-0"
          :class="isWideLayout ? 'max-w-full lg:max-w-3xl' : 'feed-column'"
        >
          <RouterView />
        </main>

        <RightSidebar v-if="!isWideLayout" />
      </div>
    </div>

    <!-- Mobile bottom nav -->
    <nav class="neo-bottom-nav fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div class="flex items-end justify-around px-1 pt-2">
        <template v-if="auth.isAuthenticated">
          <RouterLink
            v-for="item in authNavItems.slice(0, 2)"
            :key="item.to"
            :to="item.to"
            class="relative flex min-w-0 flex-1 flex-col items-center px-1 py-1 text-[10px] font-bold"
            :class="isNavActive(item.to) ? 'text-neo-black' : 'text-neo-black/50'"
          >
            <component :is="item.icon" class="mb-0.5 h-6 w-6 shrink-0 stroke-[2.5]" />
            <span class="truncate">{{ item.label }}</span>
          </RouterLink>

          <button
            type="button"
            class="mobile-nav-fab mx-1 shrink-0"
            title="Buat Posting"
            @click="handleCreatePost"
          >
            <PlusIcon class="h-6 w-6 stroke-[2.5]" />
          </button>

          <RouterLink
            v-for="item in authNavItems.slice(2)"
            :key="item.to"
            :to="item.to"
            class="relative flex min-w-0 flex-1 flex-col items-center px-1 py-1 text-[10px] font-bold"
            :class="isNavActive(item.to) ? 'text-neo-black' : 'text-neo-black/50'"
          >
            <img
              v-if="profileAvatarUrl(item)"
              :src="profileAvatarUrl(item)!"
              :alt="auth.character!.displayName"
              class="mb-0.5 h-6 w-6 shrink-0 border-2 border-neo-black object-cover"
            />
            <component v-else :is="item.icon" class="mb-0.5 h-6 w-6 shrink-0 stroke-[2.5]" />
            <span class="truncate">{{ item.label }}</span>
            <span
              v-if="item.badge && notificationsStore.unreadCount > 0"
              class="badge-dot absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center text-[9px]"
            >
              {{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}
            </span>
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/feed" class="flex flex-1 flex-col items-center px-2 py-1.5 text-[10px] font-bold text-neo-black">
            <HomeIcon class="mb-0.5 h-6 w-6 stroke-[2.5]" />
            Feed
          </RouterLink>
          <RouterLink to="/login" class="flex flex-1 flex-col items-center px-2 py-1.5 text-[10px] font-bold text-neo-black/50">
            Masuk
          </RouterLink>
          <RouterLink to="/register" class="flex flex-1 flex-col items-center px-2 py-1.5 text-[10px] font-bold text-neo-black/50">
            Daftar
          </RouterLink>
        </template>
      </div>
    </nav>

    <CreatePostModal v-model:open="showCreatePost" @created="onPostCreated" />
  </div>
</template>
