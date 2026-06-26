export function hasTextContent(value?: string | null): boolean {
  if (!value) return false;
  return /\S/u.test(value);
}
