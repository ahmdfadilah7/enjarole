import { ref, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import { getBackendBaseUrl } from '@/utils/backendUrl';
import type { Message, Notification } from '@/types';

const socket = ref<Socket | null>(null);

export function useSocket() {
  const auth = useAuthStore();
  const notificationListeners = ref<((n: Notification & { unreadCount: number }) => void)[]>([]);
  const messageListeners = ref<((m: Message) => void)[]>([]);
  const typingListeners = ref<((data: { conversationId: string; characterId: string; typing: boolean }) => void)[]>([]);

  function connect() {
    if (socket.value?.connected || !auth.accessToken) return;

    socket.value = io(`${getBackendBaseUrl()}/events`, {
      auth: { token: auth.accessToken },
      path: '/socket.io',
    });

    socket.value.on('notification:new', (data: Notification & { unreadCount: number }) => {
      notificationListeners.value.forEach((fn) => fn(data));
    });

    socket.value.on('message:new', (data: Message) => {
      messageListeners.value.forEach((fn) => fn(data));
    });

    socket.value.on('typing:start', (data: { conversationId: string; characterId: string }) => {
      typingListeners.value.forEach((fn) => fn({ ...data, typing: true }));
    });

    socket.value.on('typing:stop', (data: { conversationId: string; characterId: string }) => {
      typingListeners.value.forEach((fn) => fn({ ...data, typing: false }));
    });
  }

  function disconnect() {
    socket.value?.disconnect();
    socket.value = null;
  }

  function onNotification(fn: (n: Notification & { unreadCount: number }) => void) {
    notificationListeners.value.push(fn);
    return () => {
      notificationListeners.value = notificationListeners.value.filter((f) => f !== fn);
    };
  }

  function onMessage(fn: (m: Message) => void) {
    messageListeners.value.push(fn);
    return () => {
      messageListeners.value = messageListeners.value.filter((f) => f !== fn);
    };
  }

  function onTyping(fn: (data: { conversationId: string; characterId: string; typing: boolean }) => void) {
    typingListeners.value.push(fn);
    return () => {
      typingListeners.value = typingListeners.value.filter((f) => f !== fn);
    };
  }

  function emitTyping(conversationId: string, typing: boolean) {
    socket.value?.emit(typing ? 'typing:start' : 'typing:stop', { conversationId });
  }

  onUnmounted(() => disconnect());

  return { connect, disconnect, onNotification, onMessage, onTyping, emitTyping };
}
