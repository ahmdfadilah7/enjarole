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

          <div v-if="mediaUrls.length" class="mt-3 flex flex-wrap gap-2">
            <div v-for="(url, i) in mediaUrls" :key="i" class="relative">
              <img :src="url" class="h-24 w-24 border-[3px] border-neo-black object-cover neo-shadow-sm" />
              <button
                @click="removeImage(i)"
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
            <label class="btn-ghost cursor-pointer">
              <PhotoIcon class="h-6 w-6" />
              <input type="file" accept="image/*" multiple class="hidden" @change="handleFile" :disabled="uploading" />
            </label>
          </div>
          <button @click="submit" :disabled="submitting || uploading" class="btn-primary">
            {{ submitting ? 'Memposting...' : 'Posting' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import api from '@/api/client';
import { uploadFile } from '@/utils';
import { insertAtCursor, hasTextContent } from '@/utils/emoji';
import EmojiPicker from './EmojiPicker.vue';
import { XMarkIcon, PhotoIcon } from '@heroicons/vue/24/outline';

const emit = defineEmits<{ created: [] }>();
const open = defineModel<boolean>('open', { default: false });

const CONTENT_MAX = 2000;
const content = ref('');
const contentTextareaRef = ref<HTMLTextAreaElement | null>(null);
const mediaUrls = ref<string[]>([]);
const uploading = ref(false);
const submitting = ref(false);
const error = ref('');

function onEmojiSelect(emoji: string) {
  insertAtCursor(contentTextareaRef.value, content, emoji, CONTENT_MAX);
}

function reset() {
  content.value = '';
  mediaUrls.value = [];
  error.value = '';
}

async function handleFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files?.length) return;

  uploading.value = true;
  error.value = '';
  try {
    for (const file of files) {
      const url = await uploadFile(file);
      mediaUrls.value.push(url);
    }
  } catch {
    error.value = 'Gagal mengunggah gambar';
  }
  uploading.value = false;
  input.value = '';
}

function removeImage(index: number) {
  mediaUrls.value.splice(index, 1);
}

function getSubmitContent(): string {
  const fromRef = content.value;
  const fromDom = contentTextareaRef.value?.value ?? '';
  if (hasTextContent(fromDom)) return fromDom;
  return fromRef;
}

async function submit() {
  const text = getSubmitContent();
  content.value = text;

  if (!hasTextContent(text) && !mediaUrls.value.length) {
    error.value = 'Tambahkan teks, emoticon, atau gambar';
    return;
  }

  submitting.value = true;
  error.value = '';
  try {
    await api.post('/posts', { content: text, mediaUrls: mediaUrls.value });
    reset();
    open.value = false;
    emit('created');
  } catch {
    error.value = 'Gagal membuat posting';
  }
  submitting.value = false;
}

watch(open, (isOpen) => {
  if (!isOpen) reset();
});
</script>
