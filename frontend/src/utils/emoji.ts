import { nextTick, type Ref } from 'vue';

/** True if string has visible text or emoji (not only whitespace). */
export function hasTextContent(value: string): boolean {
  return /\S/u.test(value);
}

export function insertAtCursor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  content: Ref<string>,
  text: string,
  maxLength?: number,
) {
  const current = content.value;

  if (!el) {
    const next = current + text;
    content.value = maxLength ? next.slice(0, maxLength) : next;
    return;
  }

  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? start;
  let next = current.slice(0, start) + text + current.slice(end);
  if (maxLength) next = next.slice(0, maxLength);

  content.value = next;
  el.value = next;

  const pos = Math.min(start + text.length, next.length);
  nextTick(() => {
    el.setSelectionRange(pos, pos);
    el.focus();
  });
}
