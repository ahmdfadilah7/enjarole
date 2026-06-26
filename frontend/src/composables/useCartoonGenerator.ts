import { ref } from 'vue';
import { generateAdventurerAvatarFromSource } from '@/utils/adventurerAvatarGenerator';

export interface CartoonSourceOptions {
  mirror?: boolean;
  filterCss?: string;
  seed?: string;
}

function captureFrame(
  video: HTMLVideoElement,
  options: CartoonSourceOptions = {},
): HTMLCanvasElement {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error('Kamera belum siap');

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Gagal menyiapkan gambar');

  ctx.save();
  const filterCss = options.filterCss ?? 'none';
  if (filterCss !== 'none') ctx.filter = filterCss;
  if (options.mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  return canvas;
}

export async function generateFlatCartoonFromVideo(
  video: HTMLVideoElement,
  options: CartoonSourceOptions = {},
): Promise<File> {
  const frame = captureFrame(video, options);
  return generateAdventurerAvatarFromSource(frame, frame.width, frame.height, {
    seed: options.seed,
  });
}

export function useCartoonGenerator() {
  const loading = ref(false);
  const modelError = ref('');

  async function generateFromVideo(
    video: HTMLVideoElement,
    options: CartoonSourceOptions = {},
  ): Promise<File> {
    loading.value = true;
    modelError.value = '';
    try {
      return await generateFlatCartoonFromVideo(video, options);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal membuat avatar adventurer';
      modelError.value = message;
      throw new Error(message);
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    modelError,
    generateFromVideo,
  };
}
