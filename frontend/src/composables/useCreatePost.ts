import { ref, onScopeDispose } from 'vue';

const showCreatePost = ref(false);
const createdListeners = new Set<() => void>();

export function useCreatePost() {
  function openCreatePost() {
    showCreatePost.value = true;
  }

  function onPostCreated(callback: () => void) {
    createdListeners.add(callback);
    onScopeDispose(() => createdListeners.delete(callback));
  }

  function emitPostCreated() {
    createdListeners.forEach((cb) => cb());
  }

  return {
    showCreatePost,
    openCreatePost,
    onPostCreated,
    emitPostCreated,
  };
}
