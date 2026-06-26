<template>
  <div ref="rootRef" class="relative inline-flex">
    <button
      type="button"
      class="btn-ghost flex h-9 w-9 items-center justify-center border-[3px] border-neo-black bg-neo-cream p-0 text-lg neo-shadow-sm transition-transform hover:bg-neo-yellow active:translate-x-[2px] active:translate-y-[2px]"
      :title="title"
      aria-label="Pilih emoticon"
      @click.stop="toggle"
    >
      <FaceSmileIcon class="h-5 w-5" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="emoji-picker-panel fixed z-[100]"
        :style="panelStyle"
        @click.stop
      >
        <div class="flex items-center justify-between border-b-[3px] border-neo-black bg-neo-yellow px-2 py-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wide">Emoticon</span>
          <button type="button" class="btn-ghost p-0.5" @click="open = false">
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>

        <div class="flex gap-0.5 overflow-x-auto border-b-[3px] border-neo-black bg-neo-cream px-1 py-1">
          <button
            v-for="cat in EMOJI_CATEGORIES"
            :key="cat.id"
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center text-base transition-colors"
            :class="activeCategory === cat.id ? 'border-[2px] border-neo-black bg-primary-300' : 'hover:bg-neo-yellow'"
            :title="cat.label"
            @click="activeCategory = cat.id"
          >
            {{ cat.icon }}
          </button>
        </div>

        <div class="emoji-picker-grid p-1">
          <button
            v-for="emoji in activeEmojis"
            :key="emoji"
            type="button"
            class="emoji-picker-btn"
            @click="select(emoji)"
          >
            {{ emoji }}
          </button>
        </div>

        <div class="border-t-[3px] border-neo-black bg-white px-2 py-1.5">
          <p class="mb-1 text-[9px] font-bold uppercase tracking-wide text-neo-black/50">Cepat</p>
          <div class="flex flex-wrap gap-0.5">
            <button
              v-for="emoji in QUICK_EMOJIS"
              :key="`quick-${emoji}`"
              type="button"
              class="emoji-picker-btn h-7 w-7 text-base"
              @click="select(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { EMOJI_CATEGORIES, QUICK_EMOJIS } from '@/data/emojis';
import { FaceSmileIcon, XMarkIcon } from '@heroicons/vue/24/outline';

withDefaults(
  defineProps<{
    title?: string;
  }>(),
  { title: 'Tambah emoticon' },
);

const emit = defineEmits<{ select: [emoji: string] }>();

const rootRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const open = ref(false);
const activeCategory = ref(EMOJI_CATEGORIES[0].id);
const panelStyle = ref<Record<string, string>>({});

const activeEmojis = computed(
  () => EMOJI_CATEGORIES.find((c) => c.id === activeCategory.value)?.emojis ?? [],
);

function updatePosition() {
  const el = rootRef.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const panelWidth = 288;
  const panelHeight = 320;
  const gap = 8;

  let left = rect.left;
  let top = rect.bottom + gap;

  if (left + panelWidth > window.innerWidth - 12) {
    left = window.innerWidth - panelWidth - 12;
  }
  if (left < 12) left = 12;

  if (top + panelHeight > window.innerHeight - 12) {
    top = rect.top - panelHeight - gap;
  }
  if (top < 12) top = 12;

  panelStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${panelWidth}px`,
  };
}

function toggle() {
  open.value = !open.value;
  if (open.value) {
    nextTick(() => {
      updatePosition();
      document.addEventListener('click', onDocumentClick);
      window.addEventListener('resize', updatePosition);
    });
  } else {
    removeListeners();
  }
}

function select(emoji: string) {
  emit('select', emoji);
  open.value = false;
  removeListeners();
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node;
  if (rootRef.value?.contains(target) || panelRef.value?.contains(target)) return;
  open.value = false;
  removeListeners();
}

function removeListeners() {
  document.removeEventListener('click', onDocumentClick);
  window.removeEventListener('resize', updatePosition);
}

watch(open, (isOpen) => {
  if (!isOpen) removeListeners();
});

onUnmounted(removeListeners);
</script>
