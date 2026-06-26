<template>
  <article class="card card-hover overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-3 px-3 py-3">
      <RouterLink :to="`/@${post.character.username}`">
        <Avatar :character="post.character" size="md" />
      </RouterLink>
      <div class="min-w-0 flex-1">
        <RouterLink
          :to="`/@${post.character.username}`"
          class="font-bold text-neo-black hover:bg-neo-yellow"
        >
          {{ post.character.displayName }}
        </RouterLink>
        <p class="truncate text-xs font-medium text-neo-black/50">@{{ post.character.username }} · {{ formatRelativeTime(post.createdAt) }}</p>
      </div>
      <button
        v-if="isOwnPost"
        type="button"
        class="btn-ghost shrink-0 p-1.5 text-neo-black/50 hover:bg-neo-pink hover:text-neo-black"
        title="Hapus posting"
        :disabled="deleting"
        @click="openDeleteConfirm"
      >
        <TrashIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- Media (Instagram: image first) -->
    <ImageCarousel v-if="post.mediaUrls?.length" :urls="post.mediaUrls" />

    <!-- Actions -->
    <div class="flex items-center gap-5 px-3 py-2.5">
      <button
        @click="toggleLike"
        class="flex items-center gap-1.5 text-sm font-bold transition-all hover:-translate-y-0.5"
        :class="post.isLiked ? 'text-neo-pink' : 'text-neo-black hover:text-neo-pink'"
      >
        <component :is="post.isLiked ? HeartSolid : HeartIcon" class="h-6 w-6" />
        {{ post.likeCount }}
      </button>
      <button
        @click="loadComments"
        class="flex items-center gap-1.5 text-sm font-bold text-neo-black transition-all hover:-translate-y-0.5"
      >
        <ChatBubbleLeftIcon class="h-6 w-6" />
        {{ post.commentCount }}
      </button>
    </div>

    <!-- Caption -->
    <div v-if="hasTextContent(post.content)" class="px-3 pb-3 text-sm leading-relaxed">
      <RouterLink
        :to="`/@${post.character.username}`"
        class="mr-1.5 font-bold hover:bg-neo-yellow"
      >
        {{ post.character.displayName }}
      </RouterLink>
      <span class="emoji-rich whitespace-pre-wrap font-medium">{{ post.content }}</span>
    </div>

    <!-- Comments -->
    <div v-if="showComments" class="neo-divider bg-neo-cream px-3 py-3">
      <div v-if="loadingComments" class="text-sm font-medium text-neo-black/50">Memuat komentar...</div>
      <div v-for="comment in comments" :key="comment.id" class="mb-3 flex gap-2">
        <Avatar :character="comment.character" size="sm" />
        <div class="neo-comment flex-1">
          <p class="text-sm font-bold">{{ comment.character.displayName }}</p>
          <p class="text-sm">{{ comment.content }}</p>
        </div>
      </div>
      <form v-if="auth.isAuthenticated" @submit.prevent="submitComment" class="mt-2 flex gap-2">
        <input
          v-model="newComment"
          type="text"
          placeholder="Tulis komentar..."
          class="input-field flex-1"
        />
        <button type="submit" :disabled="submitting" class="btn-primary shrink-0">
          Kirim
        </button>
      </form>
      <p v-else class="mt-2 text-center text-xs font-medium text-neo-black/50">
        <RouterLink to="/login" class="neo-link">Masuk</RouterLink>
        untuk berkomentar
      </p>
    </div>

    <p v-if="deleteError" class="neo-error px-3 pb-3 text-xs">{{ deleteError }}</p>

    <ConfirmModal
      v-model:open="showDeleteConfirm"
      title="Hapus Posting?"
      message="Posting ini akan dihapus permanen dari feed. Tindakan ini tidak dapat dibatalkan."
      confirm-label="Hapus"
      cancel-label="Batal"
      loading-label="Menghapus..."
      variant="danger"
      :loading="deleting"
      @confirm="deletePost"
    />
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import api from '@/api/client';
import { useRequireAuth } from '@/composables/useRequireAuth';
import { useAuthStore } from '@/stores/auth';
import type { Post, Comment } from '@/types';
import Avatar from './Avatar.vue';
import ImageCarousel from './ImageCarousel.vue';
import ConfirmModal from './ConfirmModal.vue';
import { formatRelativeTime } from '@/utils';
import { hasTextContent } from '@/utils/emoji';
import { HeartIcon, ChatBubbleLeftIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/vue/24/solid';

const props = defineProps<{ post: Post }>();
const emit = defineEmits<{ updated: [post: Post]; deleted: [postId: string] }>();
const { requireAuth } = useRequireAuth();
const auth = useAuthStore();

const showComments = ref(false);
const comments = ref<Comment[]>([]);
const newComment = ref('');
const loadingComments = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const deleteError = ref('');
const showDeleteConfirm = ref(false);

const isOwnPost = computed(() => auth.character?.id === props.post.character.id);

async function toggleLike() {
  if (!requireAuth()) return;
  const { data } = await api.post(`/posts/${props.post.id}/like`);
  const updated = { ...props.post, isLiked: data.liked, likeCount: data.likeCount };
  emit('updated', updated);
}

async function loadComments() {
  if (comments.value.length) {
    showComments.value = !showComments.value;
    return;
  }
  loadingComments.value = true;
  const { data } = await api.get(`/posts/${props.post.id}/comments`);
  comments.value = data.data;
  showComments.value = true;
  loadingComments.value = false;
}

async function submitComment() {
  if (!requireAuth()) return;
  if (!newComment.value.trim()) return;
  submitting.value = true;
  const { data } = await api.post(`/posts/${props.post.id}/comments`, {
    content: newComment.value,
  });
  comments.value.push(data);
  newComment.value = '';
  emit('updated', { ...props.post, commentCount: props.post.commentCount + 1 });
  submitting.value = false;
}

function openDeleteConfirm() {
  if (!requireAuth()) return;
  deleteError.value = '';
  showDeleteConfirm.value = true;
}

async function deletePost() {
  deleting.value = true;
  deleteError.value = '';
  try {
    await api.delete(`/posts/${props.post.id}`);
    showDeleteConfirm.value = false;
    emit('deleted', props.post.id);
  } catch {
    deleteError.value = 'Gagal menghapus posting';
    showDeleteConfirm.value = false;
  }
  deleting.value = false;
}
</script>
