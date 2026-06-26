<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import api from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { useSocket } from '@/composables/useSocket';
import type { Conversation, Message } from '@/types';
import Avatar from '@/components/Avatar.vue';
import EmojiPicker from '@/components/EmojiPicker.vue';
import { formatRelativeTime, formatMessageDay } from '@/utils';
import { insertAtCursor, hasTextContent } from '@/utils/emoji';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  ChevronLeftIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const socket = useSocket();

const conversations = ref<Conversation[]>([]);
const messages = ref<Message[]>([]);
const activeId = ref<string | null>(null);
const newMessage = ref('');
const messageInputRef = ref<HTMLInputElement | null>(null);
const messagesEndRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');
const typingUser = ref<string | null>(null);
const sending = ref(false);
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

const activeConversation = computed(() =>
  conversations.value.find((c) => c.id === activeId.value),
);

const otherParticipant = computed(() => activeConversation.value?.participants[0]);

const totalUnread = computed(() =>
  conversations.value.reduce((sum, c) => sum + c.unreadCount, 0),
);

const filteredConversations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return conversations.value;
  return conversations.value.filter((c) => {
    const p = c.participants[0];
    return (
      p?.displayName.toLowerCase().includes(q) ||
      p?.username.toLowerCase().includes(q) ||
      c.lastMessage?.content.toLowerCase().includes(q)
    );
  });
});

type MessageGroup = { dateLabel: string; messages: Message[] };

const messageGroups = computed<MessageGroup[]>(() => {
  const groups: MessageGroup[] = [];
  let lastDay = '';

  for (const msg of messages.value) {
    const dayLabel = formatMessageDay(msg.createdAt);
    if (dayLabel !== lastDay) {
      groups.push({ dateLabel: dayLabel, messages: [msg] });
      lastDay = dayLabel;
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }

  return groups;
});

async function loadConversations() {
  const { data } = await api.get<Conversation[]>('/conversations');
  conversations.value = data;
}

async function loadMessages(id: string) {
  activeId.value = id;
  router.replace(`/messages/${id}`);
  const { data } = await api.get(`/conversations/${id}/messages`);
  messages.value = data.data;
  scrollToBottom();
}

function scrollToBottom() {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
  });
}

function backToList() {
  activeId.value = null;
  router.push('/messages');
}

const MESSAGE_MAX = 1000;

function onEmojiSelect(emoji: string) {
  insertAtCursor(messageInputRef.value, newMessage, emoji, MESSAGE_MAX);
  onInput();
}

function getMessageContent(): string {
  const fromRef = newMessage.value;
  const fromDom = messageInputRef.value?.value ?? '';
  if (hasTextContent(fromDom)) return fromDom;
  return fromRef;
}

async function sendMessage() {
  const content = getMessageContent();
  newMessage.value = content;
  if (!activeId.value || !hasTextContent(content) || sending.value) return;

  sending.value = true;
  newMessage.value = '';
  try {
    const { data } = await api.post(`/conversations/${activeId.value}/messages`, { content });
    messages.value.push(data);
    scrollToBottom();
    loadConversations();
  } catch {
    newMessage.value = content;
  }
  sending.value = false;
}

function onInput() {
  if (!activeId.value) return;
  socket.emitTyping(activeId.value, true);
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    if (activeId.value) socket.emitTyping(activeId.value, false);
  }, 2000);
}

function isOwnMessage(msg: Message) {
  return msg.sender.id === auth.character?.id;
}

watch(messages, () => scrollToBottom(), { deep: true });

onMounted(async () => {
  await loadConversations();
  socket.onMessage((msg) => {
    if (msg.conversationId === activeId.value) {
      messages.value.push(msg);
    }
    loadConversations();
  });
  socket.onTyping((data) => {
    if (data.conversationId === activeId.value && data.characterId !== auth.character?.id) {
      typingUser.value = data.typing ? data.characterId : null;
    }
  });

  const paramId = route.params.id as string;
  if (paramId) loadMessages(paramId);
});
</script>

<template>
  <div class="card flex h-[calc(100vh-8rem)] min-h-[520px] overflow-hidden">
    <!-- Daftar percakapan -->
    <aside
      class="flex w-full shrink-0 flex-col border-r-[3px] border-neo-black md:w-[300px]"
      :class="activeId ? 'hidden md:flex' : 'flex'"
    >
      <div class="flex items-center justify-between border-b-[3px] border-neo-black bg-neo-yellow px-4 py-3.5">
        <div class="flex items-center gap-2">
          <ChatBubbleLeftRightIcon class="h-5 w-5" />
          <span class="font-bold uppercase tracking-wide">Pesan</span>
        </div>
        <span
          v-if="totalUnread"
          class="badge-dot flex h-6 min-w-6 items-center justify-center px-1.5 text-xs"
        >
          {{ totalUnread }}
        </span>
      </div>

      <div class="border-b-[3px] border-neo-black bg-neo-cream px-3 py-2.5">
        <div class="relative">
          <MagnifyingGlassIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neo-black/40" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari percakapan..."
            class="input-field !py-2 pl-9 text-sm"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5"
            @click="searchQuery = ''"
          >
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div
          v-if="!conversations.length"
          class="flex flex-col items-center justify-center px-6 py-16 text-center"
        >
          <div class="neo-icon-box mb-4 h-16 w-16 text-3xl">💬</div>
          <p class="font-bold uppercase tracking-wide">Belum ada percakapan</p>
          <p class="mt-2 text-sm font-medium text-neo-black/50">
            Kunjungi profil karakter dan mulai chat dari tombol Pesan.
          </p>
        </div>

        <div
          v-else-if="!filteredConversations.length"
          class="px-6 py-12 text-center text-sm font-medium text-neo-black/50"
        >
          Tidak ada hasil untuk "{{ searchQuery }}"
        </div>

        <button
          v-for="conv in filteredConversations"
          :key="conv.id"
          type="button"
          @click="loadMessages(conv.id)"
          class="flex w-full items-center gap-3 border-b-[3px] border-neo-black px-4 py-3.5 text-left transition-all hover:bg-neo-cream"
          :class="[
            activeId === conv.id ? 'msg-conv-active' : '',
            conv.unreadCount && activeId !== conv.id ? 'msg-conv-unread' : '',
          ]"
        >
          <div class="relative shrink-0">
            <Avatar :character="conv.participants[0]" size="md" />
            <span
              v-if="conv.unreadCount"
              class="absolute -right-0.5 -top-0.5 h-3 w-3 border-2 border-neo-black bg-neo-pink"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <span
                class="truncate font-bold"
                :class="conv.unreadCount ? 'text-neo-black' : 'text-neo-black/90'"
              >
                {{ conv.participants[0]?.displayName }}
              </span>
              <span
                v-if="conv.lastMessage"
                class="shrink-0 text-[10px] font-bold text-neo-black/40"
              >
                {{ formatRelativeTime(conv.lastMessage.createdAt) }}
              </span>
            </div>
            <div class="mt-0.5 flex items-center justify-between gap-2">
              <p
                class="truncate text-sm"
                :class="conv.unreadCount ? 'font-bold text-neo-black' : 'font-medium text-neo-black/50'"
              >
                {{ conv.lastMessage?.content || 'Mulai percakapan ✨' }}
              </p>
              <span
                v-if="conv.unreadCount"
                class="badge-dot flex h-5 min-w-5 shrink-0 items-center justify-center px-1 text-[10px]"
              >
                {{ conv.unreadCount }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </aside>

    <!-- Area chat -->
    <section class="flex min-w-0 flex-1 flex-col bg-neo-bg" :class="!activeId ? 'hidden md:flex' : 'flex'">
      <template v-if="activeId && otherParticipant">
        <div class="flex items-center gap-3 border-b-[3px] border-neo-black bg-neo-yellow px-4 py-3">
          <button
            type="button"
            class="btn-ghost shrink-0 p-1.5 md:hidden"
            aria-label="Kembali"
            @click="backToList"
          >
            <ChevronLeftIcon class="h-5 w-5 stroke-[2.5]" />
          </button>
          <RouterLink :to="`/@${otherParticipant.username}`" class="flex min-w-0 flex-1 items-center gap-3">
            <Avatar :character="otherParticipant" size="sm" />
            <div class="min-w-0">
              <p class="truncate font-bold">{{ otherParticipant.displayName }}</p>
              <p class="truncate text-xs font-medium text-neo-black/50">@{{ otherParticipant.username }}</p>
            </div>
          </RouterLink>
          <RouterLink
            :to="`/@${otherParticipant.username}`"
            class="btn-secondary hidden shrink-0 px-3 py-1.5 text-xs sm:inline-flex"
          >
            Lihat Profil
          </RouterLink>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div v-if="!messages.length" class="flex h-full flex-col items-center justify-center text-center">
            <div class="neo-icon-box mb-4 h-14 w-14 text-2xl">👋</div>
            <p class="font-bold">Mulai percakapan</p>
            <p class="mt-1 max-w-xs text-sm font-medium text-neo-black/50">
              Kirim pesan pertama ke {{ otherParticipant.displayName }}!
            </p>
          </div>

          <template v-else>
            <div v-for="group in messageGroups" :key="group.dateLabel" class="mb-2">
              <div class="msg-date-divider">
                <span class="msg-date-label">{{ group.dateLabel }}</span>
              </div>

              <div
                v-for="msg in group.messages"
                :key="msg.id"
                class="msg-bubble-pop mb-3 flex items-end gap-2"
                :class="isOwnMessage(msg) ? 'flex-row-reverse' : 'flex-row'"
              >
                <RouterLink
                  v-if="!isOwnMessage(msg)"
                  :to="`/@${msg.sender.username}`"
                  class="shrink-0"
                >
                  <Avatar :character="msg.sender" size="sm" />
                </RouterLink>

                <div
                  class="emoji-rich max-w-[78%] px-4 py-2.5 text-sm font-medium leading-relaxed"
                  :class="isOwnMessage(msg) ? 'neo-bubble-sent' : 'neo-bubble-received'"
                >
                  <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
                  <p
                    class="mt-1.5 text-[10px] font-bold"
                    :class="isOwnMessage(msg) ? 'text-neo-black/50' : 'text-neo-black/40'"
                  >
                    {{ formatRelativeTime(msg.createdAt) }}
                  </p>
                </div>
              </div>
            </div>
          </template>

          <div
            v-if="typingUser"
            class="mb-2 flex items-end gap-2"
          >
            <Avatar :character="otherParticipant" size="sm" />
            <div class="neo-bubble-received px-4 py-3">
              <div class="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <div ref="messagesEndRef" class="h-1" />
        </div>

        <form class="messages-composer flex items-center gap-2" @submit.prevent="sendMessage">
          <EmojiPicker @select="onEmojiSelect" />
          <input
            ref="messageInputRef"
            v-model="newMessage"
            type="text"
            maxlength="1000"
            placeholder="Tulis pesan..."
            class="input-field emoji-rich min-w-0 flex-1 !py-2.5"
            @input="onInput"
          />
          <button
            type="submit"
            class="fab h-11 w-11 shrink-0"
            :disabled="sending || !hasTextContent(newMessage)"
            title="Kirim"
          >
            <PaperAirplaneIcon class="h-5 w-5" />
          </button>
        </form>
      </template>

      <div v-else class="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div class="neo-icon-box mb-5 h-20 w-20">
          <ChatBubbleLeftRightIcon class="h-10 w-10" />
        </div>
        <p class="text-lg font-bold uppercase tracking-wide">Pesan EnjaRole</p>
        <p class="mt-2 max-w-sm text-sm font-medium text-neo-black/50">
          Pilih percakapan di sebelah kiri untuk mulai roleplay chat dengan karakter lain.
        </p>
      </div>
    </section>
  </div>
</template>
