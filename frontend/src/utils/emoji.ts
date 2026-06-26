import { nextTick, type Ref } from 'vue';

/** True if string has visible text or emoji (not only whitespace). */
export function hasTextContent(value?: string | null): boolean {
  if (value == null) return false;
  return value.replace(/\s/gu, '').length > 0;
}

function dispatchInput(el: HTMLTextAreaElement | HTMLInputElement) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function readTextareaContent(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  content: Ref<string>,
): string {
  const fromDom = el?.value ?? '';
  const fromRef = content.value ?? '';
  if (hasTextContent(fromDom)) return fromDom;
  if (hasTextContent(fromRef)) return fromRef;
  return fromDom || fromRef;
}

export function insertAtCursor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  content: Ref<string>,
  text: string,
  maxLength?: number,
) {
  const current = el?.value ?? content.value ?? '';
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? start;
  let next = current.slice(0, start) + text + current.slice(end);
  if (maxLength) next = next.slice(0, maxLength);

  content.value = next;

  if (!el) return;

  el.value = next;
  dispatchInput(el);

  const pos = Math.min(start + text.length, next.length);
  nextTick(() => {
    if (el.value !== next) {
      el.value = next;
      dispatchInput(el);
    }
    el.setSelectionRange(pos, pos);
    el.focus();
  });
}
