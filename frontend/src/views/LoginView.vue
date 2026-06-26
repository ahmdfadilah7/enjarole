<template>
  <div class="auth-bg">
    <div class="neo-deco -left-8 top-12 h-24 w-24 rotate-12 bg-neo-pink" />
    <div class="neo-deco -right-6 bottom-16 h-20 w-20 -rotate-6 bg-neo-blue" />
    <div class="neo-deco right-1/4 top-8 h-14 w-14 rotate-45 bg-primary-300" />

    <div class="relative w-full max-w-md">
      <div class="mb-8 text-center">
        <div class="logo-box mx-auto mb-4 h-16 w-16 text-3xl">E</div>
        <h1 class="text-4xl font-bold logo-text tracking-tight">EnjaRole</h1>
        <p class="mt-3 text-sm font-bold uppercase tracking-widest text-neo-black/70">Masuk sebagai karaktermu</p>
      </div>

      <form @submit.prevent="submit" class="card p-5 sm:p-8">
        <div class="mb-4">
          <label class="mb-2 block text-sm font-bold uppercase tracking-wide">Email</label>
          <input v-model="email" type="email" required class="input-field" placeholder="nama@email.com" />
        </div>
        <div class="mb-6">
          <label class="mb-2 block text-sm font-bold uppercase tracking-wide">Password</label>
          <input v-model="password" type="password" required class="input-field" placeholder="••••••••" />
        </div>

        <p v-if="error" class="neo-error mb-4">{{ error }}</p>

        <button type="submit" :disabled="loading" class="btn-primary w-full">
          {{ loading ? 'Masuk...' : 'Masuk →' }}
        </button>

        <p class="mt-6 text-center text-sm font-medium">
          Belum punya karakter?
          <RouterLink to="/register" class="neo-link ml-1">Daftar sekarang</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/errors';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || '/feed';
    router.push(redirect);
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'Email atau password salah');
  }
  loading.value = false;
}
</script>
