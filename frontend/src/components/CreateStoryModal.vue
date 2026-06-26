<template>
  <Teleport to="body">
    <div v-if="open" class="neo-modal-backdrop" @click.self="open = false">
      <div class="neo-modal max-w-md">
        <div class="neo-modal-header relative justify-center">
          <h3 class="font-bold uppercase tracking-wide">Buat Story</h3>
          <button @click="open = false" class="btn-ghost absolute right-4 p-1">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="flex border-b-[3px] border-neo-black">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="mode = tab.id"
            class="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wide transition-colors"
            :class="mode === tab.id ? 'bg-primary-300' : 'bg-white hover:bg-neo-cream'"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>

        <div class="p-5">
          <!-- Live phone preview -->
          <div class="story-viewer-shell mx-auto mb-4 aspect-[9/16] max-h-80 w-full max-w-[220px]">
            <div class="relative h-full w-full overflow-hidden bg-neo-black">
              <!-- Image preview -->
              <template v-if="mode === 'image'">
                <img
                  v-if="imagePreview"
                  :src="imagePreview"
                  class="h-full w-full object-cover"
                  alt="Preview"
                />
                <div v-else class="flex h-full flex-col items-center justify-center gap-2 bg-neo-cream text-neo-black/40">
                  <PhotoIcon class="h-10 w-10" />
                  <span class="text-xs font-bold">Pilih gambar</span>
                </div>
              </template>

              <!-- Video preview -->
              <template v-if="mode === 'video'">
                <video
                  v-if="videoPreview"
                  :src="videoPreview"
                  class="h-full w-full object-cover"
                  autoplay
                  loop
                  muted
                  playsinline
                />
                <div v-else class="flex h-full flex-col items-center justify-center gap-2 bg-neo-cream text-neo-black/40">
                  <VideoCameraIcon class="h-10 w-10" />
                  <span class="text-xs font-bold">Pilih video</span>
                </div>
              </template>

              <!-- Text preview -->
              <div
                v-if="mode === 'text'"
                class="flex h-full items-center justify-center p-5"
                :style="{ backgroundColor: backgroundColor }"
              >
                <p
                  class="story-text-pop emoji-rich text-center font-bold leading-snug break-words"
                  :class="[
                    backgroundColor === '#0a0a0a' || backgroundColor === '#b197fc' ? 'text-white' : 'text-neo-black',
                    textSizeClass,
                  ]"
                  style="text-shadow: 3px 3px 0 rgba(0,0,0,0.1)"
                >
                  {{ textContent || 'Ketik ceritamu...' }}
                </p>
              </div>

              <!-- Overlay text on image/video -->
              <div
                v-if="(mode === 'image' || mode === 'video') && hasTextContent(textContent)"
                class="absolute inset-0 z-10 flex items-center justify-center px-4"
              >
                <p class="story-sticker emoji-rich max-w-full text-sm font-bold leading-snug break-words">
                  {{ textContent }}
                </p>
              </div>

              <div
                v-if="mode === 'image' || mode === 'video'"
                class="pointer-events-none absolute inset-0 bg-gradient-to-b from-neo-black/40 via-transparent to-neo-black/20"
              />
            </div>
          </div>

          <!-- Image upload -->
          <template v-if="mode === 'image'">
            <label v-if="!imagePreview" class="flex cursor-pointer flex-col items-center border-[3px] border-dashed border-neo-black bg-neo-cream py-6 neo-shadow-sm transition-colors hover:bg-neo-yellow/40">
              <PhotoIcon class="mb-2 h-8 w-8" />
              <span class="text-sm font-bold">Pilih Gambar</span>
              <input type="file" accept="image/*" class="hidden" @change="onImagePick" />
            </label>
            <div v-if="!imagePreview" class="mt-2 grid grid-cols-2 gap-2">
              <button type="button" class="btn-secondary text-xs" @click="openCamera('photo')">
                Ambil Foto
              </button>
            </div>
            <button v-else type="button" @click="clearImage" class="btn-secondary w-full text-xs">
              Ganti Gambar
            </button>
          </template>

          <!-- Video upload -->
          <template v-if="mode === 'video'">
            <label v-if="!videoPreview" class="flex cursor-pointer flex-col items-center border-[3px] border-dashed border-neo-black bg-neo-cream py-6 neo-shadow-sm transition-colors hover:bg-neo-yellow/40">
              <VideoCameraIcon class="mb-2 h-8 w-8" />
              <span class="text-sm font-bold">Pilih Video</span>
              <span class="mt-1 text-xs font-medium text-neo-black/60">Maks. 30 detik</span>
              <input type="file" accept="video/*" class="hidden" @change="onVideoPick" />
            </label>
            <div v-if="!videoPreview" class="mt-2 grid grid-cols-2 gap-2">
              <button type="button" class="btn-secondary text-xs" @click="openCamera('video')">
                Rekam Video
              </button>
            </div>
            <div v-else class="flex items-center justify-between gap-2">
              <span class="neo-tag text-xs">{{ videoDuration.toFixed(1) }}s</span>
              <button type="button" @click="clearVideo" class="btn-secondary text-xs">
                Ganti Video
              </button>
            </div>
          </template>

          <!-- Text editor -->
          <template v-if="mode === 'text'">
            <textarea
              ref="textAreaRef"
              v-model="textContent"
              rows="3"
              maxlength="280"
              placeholder="Tulis teks story..."
              class="input-field emoji-rich resize-none"
            />
            <div class="mt-1.5 flex items-center justify-between gap-2">
              <EmojiPicker @select="onEmojiSelect" />
              <p class="text-[10px] font-medium text-neo-black/50">{{ textContent.length }}/280</p>
            </div>

            <div class="mt-3 flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wide">Warna Latar</span>
              <button type="button" @click="shuffleColor" class="text-xs font-bold text-primary-600 hover:underline">
                Acak ✨
              </button>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="color in STORY_BG_COLORS"
                :key="color"
                type="button"
                class="h-8 w-8 border-[3px] border-neo-black transition-transform hover:scale-110"
                :class="backgroundColor === color ? 'ring-2 ring-neo-pink ring-offset-2' : ''"
                :style="{ backgroundColor: color }"
                :title="color"
                @click="backgroundColor = color"
              />
            </div>
          </template>

          <!-- Text overlay for image/video -->
          <div v-if="mode === 'image' || mode === 'video'" class="mt-4">
            <label class="mb-1.5 block text-xs font-bold uppercase tracking-wide">Teks Stiker (opsional)</label>
            <div class="flex gap-2">
              <input
                ref="overlayInputRef"
                v-model="textContent"
                type="text"
                maxlength="120"
                placeholder="Tambahkan teks..."
                class="input-field emoji-rich min-w-0 flex-1"
              />
              <EmojiPicker @select="onEmojiSelect" />
            </div>
          </div>

          <p v-if="error" class="neo-error mt-3">{{ error }}</p>
        </div>

        <div class="border-t-[3px] border-neo-black px-5 py-4">
          <button @click="submit" :disabled="submitting || uploading" class="btn-primary w-full">
            {{ submitting || uploading ? 'Memposting...' : 'Bagikan Story' }}
          </button>
        </div>
      </div>
    </div>

    <CameraCaptureModal
      v-model:open="showCamera"
      :capture-mode="cameraMode"
      :max-video-seconds="MAX_STORY_VIDEO_SECONDS"
      @capture="onCameraCapture"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import api from '@/api/client';
import CameraCaptureModal from './CameraCaptureModal.vue';
import EmojiPicker from './EmojiPicker.vue';
import { insertAtCursor, hasTextContent } from '@/utils/emoji';
import {
  uploadFile,
  STORY_BG_COLORS,
  MAX_STORY_VIDEO_SECONDS,
  getVideoDuration,
} from '@/utils';
import {
  XMarkIcon,
  PhotoIcon,
  VideoCameraIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline';

const emit = defineEmits<{ created: [] }>();
const open = defineModel<boolean>('open', { default: false });

type StoryMode = 'image' | 'video' | 'text';

const tabs: { id: StoryMode; label: string; icon: typeof PhotoIcon }[] = [
  { id: 'image', label: 'Gambar', icon: PhotoIcon },
  { id: 'video', label: 'Video', icon: VideoCameraIcon },
  { id: 'text', label: 'Teks', icon: PencilSquareIcon },
];

const mode = ref<StoryMode>('image');
const imageFile = ref<File | null>(null);
const imagePreview = ref('');
const videoFile = ref<File | null>(null);
const videoPreview = ref('');
const videoDuration = ref(0);
const textContent = ref('');
const backgroundColor = ref<string>(STORY_BG_COLORS[0]);
const uploading = ref(false);
const submitting = ref(false);
const error = ref('');
const showCamera = ref(false);
const cameraMode = ref<'photo' | 'video'>('photo');
const textAreaRef = ref<HTMLTextAreaElement | null>(null);
const overlayInputRef = ref<HTMLInputElement | null>(null);

const TEXT_MAX = 280;
const OVERLAY_MAX = 120;

const textSizeClass = computed(() => {
  const len = textContent.value.length;
  if (len > 120) return 'text-base';
  if (len > 60) return 'text-lg';
  return 'text-xl';
});

function shuffleColor() {
  const options = STORY_BG_COLORS.filter((c) => c !== backgroundColor.value);
  backgroundColor.value = options[Math.floor(Math.random() * options.length)];
}

function onEmojiSelect(emoji: string) {
  const max = mode.value === 'text' ? TEXT_MAX : OVERLAY_MAX;
  const el = mode.value === 'text' ? textAreaRef.value : overlayInputRef.value;
  insertAtCursor(el, textContent, emoji, max);
}

function reset() {
  mode.value = 'image';
  imageFile.value = null;
  imagePreview.value = '';
  videoFile.value = null;
  videoPreview.value = '';
  videoDuration.value = 0;
  textContent.value = '';
  backgroundColor.value = STORY_BG_COLORS[0];
  error.value = '';
}

function onImagePick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
  (e.target as HTMLInputElement).value = '';
}

function clearImage() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = null;
  imagePreview.value = '';
}

function onVideoPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  error.value = '';
  getVideoDuration(file)
    .then((duration) => {
      if (duration > MAX_STORY_VIDEO_SECONDS) {
        error.value = `Video maksimal ${MAX_STORY_VIDEO_SECONDS} detik`;
        return;
      }
      videoFile.value = file;
      videoDuration.value = Math.ceil(duration);
      videoPreview.value = URL.createObjectURL(file);
    })
    .catch(() => {
      error.value = 'Gagal membaca file video';
    });
  (e.target as HTMLInputElement).value = '';
}

function clearVideo() {
  if (videoPreview.value) URL.revokeObjectURL(videoPreview.value);
  videoFile.value = null;
  videoPreview.value = '';
  videoDuration.value = 0;
}

function openCamera(mode: 'photo' | 'video') {
  cameraMode.value = mode;
  showCamera.value = true;
}

async function onCameraCapture({ file, type }: { file: File; type: 'image' | 'video' }) {
  error.value = '';
  if (type === 'image') {
    clearImage();
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
    return;
  }
  try {
    const duration = await getVideoDuration(file);
    if (duration > MAX_STORY_VIDEO_SECONDS) {
      error.value = `Video maksimal ${MAX_STORY_VIDEO_SECONDS} detik`;
      return;
    }
    clearVideo();
    videoFile.value = file;
    videoDuration.value = Math.ceil(duration);
    videoPreview.value = URL.createObjectURL(file);
  } catch {
    error.value = 'Gagal memproses video dari kamera';
  }
}

async function submit() {
  error.value = '';
  submitting.value = true;

  try {
    if (mode.value === 'text') {
      if (!hasTextContent(textContent.value)) {
        error.value = 'Tulis teks untuk story';
        submitting.value = false;
        return;
      }
      await api.post('/stories', {
        mediaType: 'text',
        textContent: textContent.value,
        backgroundColor: backgroundColor.value,
      });
    } else if (mode.value === 'image') {
      if (!imageFile.value) {
        error.value = 'Pilih gambar terlebih dahulu';
        submitting.value = false;
        return;
      }
      uploading.value = true;
      const mediaUrl = await uploadFile(imageFile.value);
      uploading.value = false;
      await api.post('/stories', {
        mediaType: 'image',
        mediaUrl,
        textContent: textContent.value.trim() || undefined,
      });
    } else {
      if (!videoFile.value) {
        error.value = 'Pilih video terlebih dahulu';
        submitting.value = false;
        return;
      }
      uploading.value = true;
      const mediaUrl = await uploadFile(videoFile.value);
      uploading.value = false;
      await api.post('/stories', {
        mediaType: 'video',
        mediaUrl,
        duration: videoDuration.value,
        textContent: textContent.value.trim() || undefined,
      });
    }

    reset();
    open.value = false;
    emit('created');
  } catch {
    error.value = 'Gagal membuat story';
  }

  submitting.value = false;
  uploading.value = false;
}

watch(open, (isOpen) => {
  if (!isOpen) reset();
});
</script>
