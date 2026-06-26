import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api/client';
import type { Character, AuthResponse } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const character = ref<Character | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const isAuthenticated = computed(() => !!accessToken.value);

  function setAuth(data: AuthResponse) {
    accessToken.value = data.accessToken;
    character.value = data.character;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  function logout() {
    accessToken.value = null;
    character.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async function register(payload: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    bio?: string;
    backstory?: string;
    personalityTraits?: string[];
  }) {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    setAuth(data);
    return data;
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    setAuth(data);
    return data;
  }

  async function fetchMe() {
    const { data } = await api.get<Character>('/characters/me');
    character.value = data;
    return data;
  }

  async function updateProfile(payload: Partial<Character>) {
    const { data } = await api.patch<Character>('/characters/me', payload);
    character.value = data;
    return data;
  }

  async function init() {
    if (accessToken.value && !character.value) {
      try {
        await fetchMe();
      } catch {
        logout();
      }
    }
  }

  return {
    character,
    accessToken,
    isAuthenticated,
    setAuth,
    logout,
    register,
    login,
    fetchMe,
    updateProfile,
    init,
  };
});
