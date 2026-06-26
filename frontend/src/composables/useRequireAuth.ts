import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export function useRequireAuth() {
  const auth = useAuthStore();
  const router = useRouter();

  function requireAuth(redirectTo?: string): boolean {
    if (auth.isAuthenticated) return true;
    router.push({
      name: 'login',
      query: { redirect: redirectTo || router.currentRoute.value.fullPath },
    });
    return false;
  }

  return { requireAuth };
}
