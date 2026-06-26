import api from '@/api/client';

export async function uploadFile(file: File): Promise<string> {
  const { data } = await api.post<{ uploadUrl: string; publicUrl: string }>('/media/upload', {
    filename: file.name,
    contentType: file.type,
  });

  await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  return data.publicUrl;
}

export function formatRelativeTime(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}j`;
  if (days < 7) return `${days}h`;
  return new Date(date).toLocaleDateString('id-ID');
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMessageDay(date: string): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(d, today)) return 'Hari ini';
  if (isSameDay(d, yesterday)) return 'Kemarin';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const STORY_BG_COLORS = [
  '#7bf1a8',
  '#ffe066',
  '#ff6b9d',
  '#74c0fc',
  '#b197fc',
  '#ff922b',
  '#ffffff',
  '#0a0a0a',
] as const;

export const MAX_STORY_VIDEO_SECONDS = 30;
export const STORY_IMAGE_SECONDS = 5;
export const STORY_TEXT_SECONDS = 7;

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Gagal membaca video'));
    };
    video.src = URL.createObjectURL(file);
  });
}

export function getStoryDuration(story: {
  mediaType: string;
  duration?: number | null;
}): number {
  if (story.mediaType === 'video') {
    return Math.min(story.duration || MAX_STORY_VIDEO_SECONDS, MAX_STORY_VIDEO_SECONDS);
  }
  if (story.mediaType === 'text') return STORY_TEXT_SECONDS;
  return STORY_IMAGE_SECONDS;
}
