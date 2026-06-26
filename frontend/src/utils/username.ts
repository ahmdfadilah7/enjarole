export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (!value) return 'Username wajib diisi';
  if (value.length < USERNAME_MIN_LENGTH) return 'Username minimal 3 karakter';
  if (!USERNAME_PATTERN.test(value)) {
    return 'Username hanya boleh huruf, angka, dan underscore (tanpa spasi)';
  }
  return null;
}
