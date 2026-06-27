import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

/** EnjaRole tidak memakai service worker — hapus SW stale yang bisa break video (206). */
async function clearStaleServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

void clearStaleServiceWorkers();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
