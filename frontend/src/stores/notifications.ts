import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/client';

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0);

  async function fetchUnreadCount() {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 1 } });
      unreadCount.value = data.unreadCount;
    } catch {
      /* ignore */
    }
  }

  function setUnreadCount(count: number) {
    unreadCount.value = count;
  }

  async function markAsRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    if (unreadCount.value > 0) {
      unreadCount.value--;
    }
  }

  async function markAllAsRead() {
    await api.patch('/notifications/read-all');
    unreadCount.value = 0;
  }

  return {
    unreadCount,
    fetchUnreadCount,
    setUnreadCount,
    markAsRead,
    markAllAsRead,
  };
});
