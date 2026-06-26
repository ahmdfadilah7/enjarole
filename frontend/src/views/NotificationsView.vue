<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api/client';
import { useNotificationsStore } from '@/stores/notifications';
import type { Notification } from '@/types';
import { formatRelativeTime } from '@/utils';
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  EnvelopeIcon,
} from '@heroicons/vue/24/outline';

const router = useRouter();
const notificationsStore = useNotificationsStore();
const notifications = ref<Notification[]>([]);
const loading = ref(true);

const iconMap = {
  like: HeartIcon,
  comment: ChatBubbleLeftIcon,
  follow: UserPlusIcon,
  message: EnvelopeIcon,
};

function getMessage(n: Notification): string {
  const p = n.payload;
  switch (n.type) {
    case 'like':
      return `${p.actorDisplayName} menyukai postingmu`;
    case 'comment':
      return `${p.actorDisplayName} mengomentari postingmu`;
    case 'follow':
      return `${p.actorDisplayName} mulai mengikutimu`;
    case 'message':
      return `${p.actorDisplayName} mengirim pesan`;
    default:
      return 'Notifikasi baru';
  }
}

function getLink(n: Notification): string {
  const p = n.payload;
  switch (n.type) {
    case 'like':
    case 'comment':
      return '/feed';
    case 'follow':
      return `/@${p.actorUsername}`;
    case 'message':
      return `/messages/${p.conversationId}`;
    default:
      return '/feed';
  }
}

async function openNotification(n: Notification) {
  if (!n.isRead) {
    try {
      await notificationsStore.markAsRead(n.id);
      n.isRead = true;
    } catch {
      /* navigate anyway */
    }
  }
  router.push(getLink(n));
}

async function load() {
  const { data } = await api.get('/notifications');
  notifications.value = data.data;
  notificationsStore.setUnreadCount(data.unreadCount);
  loading.value = false;
}

onMounted(load);
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold logo-text">Notifikasi</h1>

    <div v-if="loading" class="py-16 text-center">
      <div class="neo-spinner mx-auto mb-3 h-8 w-8 animate-spin" />
      <p class="text-sm font-bold text-neo-black/60">Memuat...</p>
    </div>

    <div v-else-if="!notifications.length" class="card border-dashed py-16 text-center">
      <p class="text-4xl">🔔</p>
      <p class="mt-2 text-sm font-bold text-neo-black/50">Belum ada notifikasi</p>
    </div>

    <div v-else class="card overflow-hidden">
      <button
        v-for="n in notifications"
        :key="n.id"
        type="button"
        @click="openNotification(n)"
        class="flex w-full items-center gap-3 border-b-[3px] border-neo-black px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-neo-cream"
        :class="!n.isRead ? 'bg-primary-100' : ''"
      >
        <div class="neo-icon-box h-10 w-10">
          <component :is="iconMap[n.type]" class="h-5 w-5" />
        </div>
        <div class="flex-1">
          <p class="text-sm" :class="!n.isRead ? 'font-bold' : 'font-medium'">{{ getMessage(n) }}</p>
          <p class="text-xs font-medium text-neo-black/50">{{ formatRelativeTime(n.createdAt) }}</p>
        </div>
        <div v-if="!n.isRead" class="badge-dot h-3 w-3" />
      </button>
    </div>
  </div>
</template>
