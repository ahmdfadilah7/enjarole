export function hasTextContent(value?: string | null): boolean {
  if (value == null) return false;
  return value.replace(/\s/gu, '').length > 0;
}
