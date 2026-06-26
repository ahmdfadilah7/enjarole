<template>
  <Teleport to="body">
    <div v-if="open" class="neo-modal-backdrop">
      <div class="neo-modal">
        <div class="neo-modal-header">
          <h3 class="font-bold uppercase tracking-wide">Buat Posting</h3>
          <button @click="open = false" class="btn-ghost p-1">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="p-5">
          <textarea
            ref="contentTextareaRef"
            v-model="content"
            rows="4"
            maxlength="2000"
            placeholder="Apa yang karaktermu lakukan hari ini?"
            class="input-field emoji-rich resize-none"
          />
          <div class="mt-1.5 flex items-center justify-between gap-2">
            <EmojiPicker @select="onEmojiSelect" />
            <p class="text-[10px] font-medium text-neo-black/50">{{ content.length }}/2000</p>
          </div>

          <div v-if="mediaItems.length" class="mt-3 flex flex-wrap gap-2">
            <div v-for="(item, i) in mediaItems" :key="item.url" class="relative">
              <video
                v-if="item.type === 'video'"
                :src="item.url"
                class="h-24 w-24 border-[3px] border-neo-black bg-neo-black object-cover neo-shadow-sm"
                muted
                playsinline
                preload="metadata"
              />
              <img
                v-else
                :src="item.url"
                class="h-24 w-24 border-[3px] border-neo-black object-cover neo-shadow-sm"
                alt="Preview"
              />
              <span
                v-if="item.type === 'video'"
                class="absolute bottom-1 left-1 neo-tag px-1 py-0 text-[9px]"
              >
                Video
              </span>
              <button
                type="button"
                @click="removeMedia(i)"
                class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center border-2 border-neo-black bg-neo-pink text-neo-black neo-shadow-sm"
              >
                <XMarkIcon class="h-3 w-3" />
              </button>
            </div>
          </div>

          <p v-if="error" class="neo-error mt-2">{{ error }}</p>
        </div>

        <div class="flex items-center justify-between border-t-[3px] border-neo-black px-5 py-4">
          <div class="flex items-center gap-2">
            <label class="btn-ghost cursor-pointer" title="Tambah gambar">
              <PhotoIcon class="h-6 w-6" />
              <input
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                :disabled="uploading"
                @change="handleImageFile"
              />
            </label>
            <label class="btn-ghost cursor-pointer" title="Tambah video">
              <VideoCameraIcon class="h-6 w-6" />
              <input
                type="file"
                accept="video/*"
                multiple
                class="hidden"
                :disabled="uploading"
                @change="handleVideoFile"
              />
            </label>
            <button
              type="button"
              class="btn-ghost"
              title="Buka kamera"
              :disabled="uploading"
              @click="showCamera = true"
            >
              <CameraIcon class="h-6 w-6" />
            </button>
          </div>
          <button @click="submit" :disabled="submitting || uploading" class="btn-primary">
            {{ submitting || uploading ? 'Memposting...' : 'Posting' }}
          </button>
        </div>
      </div>
    </div>

    <CameraCaptureModal
      v-model:open="showCamera"
      capture-mode="both"
      :max-video-seconds="MAX_POST_VIDEO_SECONDS"
      @capture="onCameraCapture"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import api from '@/api/client';
import {
  uploadFile,
  getVideoDuration,
  MAX_POST_VIDEO_SECONDS,
  isImageFile,
  isVideoFile,
} from '@/utils';
import { insertAtCursor, hasTextContent, readTextareaContent } from '@/utils/emoji';
import EmojiPicker from './EmojiPicker.vue';
import CameraCaptureModal from './CameraCaptureModal.vue';
import { XMarkIcon, PhotoIcon, VideoCameraIcon, CameraIcon } from '@heroicons/vue/24/outline';

type MediaItem = { url: string; type: 'image' | 'video' };

const emit = defineEmits<{ created: [] }>();
const open = defineModel<boolean>('open', { default: false });

const CONTENT_MAX = 2000;
const content = ref('');
const contentTextareaRef = ref<HTMLTextAreaElement | null>(null);
const mediaItems = ref<MediaItem[]>([]);
const uploading = ref(false);
const submitting = ref(false);
const error = ref('');
const showCamera = ref(false);

function onEmojiSelect(emoji: string) {
  insertAtCursor(contentTextareaRef.value, content, emoji, CONTENT_MAX);
}

function reset() {
  content.value = '';
  mediaItems.value = [];
  error.value = '';
}

async function handleImageFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files?.length) return;

  uploading.value = true;
  error.value = '';
  try {
    for (const file of files) {
      if (!isImageFile(file)) {
        error.value = 'File harus berupa gambar';
        continue;
      }
      const url = await uploadFile(file);
      mediaItems.value.push({ url, type: 'image' });
    }
  } catch {
    error.value = 'Gagal mengunggah gambar';
  }
  uploading.value = false;
  input.value = '';
}

async function handleVideoFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files?.length) return;

  uploading.value = true;
  error.value = '';
  try {
    for (const file of files) {
      if (!isVideoFile(file)) {
        error.value = 'File harus berupa video';
        continue;
      }
      const duration = await getVideoDuration(file);
      if (duration > MAX_POST_VIDEO_SECONDS) {
        error.value = `Video maksimal ${MAX_POST_VIDEO_SECONDS} detik`;
        continue;
      }
      const url = await uploadFile(file);
      mediaItems.value.push({ url, type: 'video' });
    }
  } catch {
    error.value = 'Gagal mengunggah video';
  }
  uploading.value = false;
  input.value = '';
}

function removeMedia(index: number) {
  mediaItems.value.splice(index, 1);
}

async function onCameraCapture({
  file,
  type,
  durationSeconds,
}: {
  file: File;
  type: 'image' | 'video';
  durationSeconds?: number;
}) {
  uploading.value = true;
  error.value = '';
  try {
    if (type === 'video') {
      const duration = await getVideoDuration(file, durationSeconds);
      if (duration > MAX_POST_VIDEO_SECONDS) {
        error.value = `Video maksimal ${MAX_POST_VIDEO_SECONDS} detik`;
        return;
      }
    }
    const url = await uploadFile(file);
    mediaItems.value.push({ url, type });
  } catch {
    error.value = type === 'video' ? 'Gagal mengunggah video' : 'Gagal mengunggah gambar';
  }
  uploading.value = false;
}

async function submit() {
  const text = readTextareaContent(contentTextareaRef.value, content);
  content.value = text;

  if (!hasTextContent(text) && !mediaItems.value.length) {
    error.value = 'Tambahkan teks, emoticon, gambar, atau video';
    return;
  }

  submitting.value = true;
  error.value = '';
  try {
    await api.post('/posts', {
      content: text,
      mediaUrls: mediaItems.value.map((m) => m.url),
    });
    reset();
    open.value = false;
    emit('created');
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
    error.value = Array.isArray(message) ? message[0] : message || 'Gagal membuat posting';
  }
  submitting.value = false;
}

watch(open, (isOpen) => {
  if (!isOpen) reset();
});
</script>
