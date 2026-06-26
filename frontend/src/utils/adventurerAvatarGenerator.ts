import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';

const AVATAR_SIZE = 512;

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function sampleRegionAverage(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const sx = Math.floor(w * x0);
  const ex = Math.floor(w * x1);
  const sy = Math.floor(h * y0);
  const ey = Math.floor(h * y1);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = sy; y < ey; y += 2) {
    for (let x = sx; x < ex; x += 2) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 128) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }

  if (!count) return { r: 236, g: 205, b: 180 };
  return { r: r / count, g: g / count, b: b / count };
}

function hashFrame(data: Uint8ClampedArray): string {
  let h = 2166136261;
  for (let i = 0; i < data.length; i += 97) {
    h ^= data[i];
    h = Math.imul(h, 16777619);
  }
  return `adventurer-${(h >>> 0).toString(16)}`;
}

function captureImageData(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement('canvas');
  const sw = Math.min(320, width);
  const sh = Math.round((sw / width) * height);
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas tidak didukung');
  ctx.drawImage(source, 0, 0, sw, sh);
  return { data: ctx.getImageData(0, 0, sw, sh).data, w: sw, h: sh };
}

export interface AdventurerFromPhotoOptions {
  seed?: string;
  backgroundColor?: string;
}

export function buildAdventurerOptions(
  source: CanvasImageSource,
  width: number,
  height: number,
  extra: AdventurerFromPhotoOptions = {},
) {
  const { data, w, h } = captureImageData(source, width, height);
  const skin = sampleRegionAverage(data, w, h, 0.32, 0.38, 0.68, 0.72);
  const hair = sampleRegionAverage(data, w, h, 0.25, 0.05, 0.75, 0.32);
  const backgroundColor = extra.backgroundColor ?? 'e8e8e8';

  const skinColor = rgbToHex(skin.r, skin.g, skin.b);
  const hairColor = rgbToHex(
    Math.min(255, hair.r * 0.85),
    Math.min(255, hair.g * 0.85),
    Math.min(255, hair.b * 0.85),
  );

  return {
    seed: extra.seed ?? hashFrame(data),
    size: AVATAR_SIZE,
    skinColor: [skinColor],
    hairColor: [hairColor],
    backgroundColor: [backgroundColor],
    glassesProbability: 0,
    earringsProbability: 0,
  };
}

export function renderAdventurerSvg(
  source: CanvasImageSource,
  width: number,
  height: number,
  extra: AdventurerFromPhotoOptions = {},
): string {
  const options = buildAdventurerOptions(source, width, height, extra);
  return createAvatar(adventurer, options).toString();
}

async function svgToPngFile(svg: string): Promise<File> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Gagal merender avatar'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak didukung');
    ctx.drawImage(img, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Gagal menyimpan avatar'))),
        'image/png',
        1,
      );
    });

    return new File([pngBlob], `adventurer-${Date.now()}.png`, { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function generateAdventurerAvatarFromSource(
  source: CanvasImageSource,
  width: number,
  height: number,
  extra: AdventurerFromPhotoOptions = {},
): Promise<File> {
  const svg = renderAdventurerSvg(source, width, height, extra);
  return svgToPngFile(svg);
}
