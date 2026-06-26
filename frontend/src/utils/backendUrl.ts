/** Backend / Socket.io base URL. In dev, follows the page host so LAN devices work via Vite proxy. */
export function getBackendBaseUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}
