<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { uploadFile } from '@/utils';
import { getApiErrorMessage } from '@/utils/errors';
import { normalizeUsername, validateUsername } from '@/utils/username';
import api from '@/api/client';
import Avatar from '@/components/Avatar.vue';

const router = useRouter();
const auth = useAuthStore();

const username = ref('');
const displayName = ref('');
const bio = ref('');
const backstory = ref('');
const traitsInput = ref('');
const avatarUrl = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);
const usernameAvailable = ref<boolean | null>(null);
const checkingUsername = ref(false);

let usernameCheckTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (auth.character) {
    username.value = auth.character.username;
    displayName.value = auth.character.displayName;
    bio.value = auth.character.bio || '';
    backstory.value = auth.character.backstory || '';
    traitsInput.value = (auth.character.personalityTraits || []).join(', ');
    avatarUrl.value = auth.character.avatarUrl || '';
  }
});

watch(username, (value) => {
  usernameAvailable.value = null;
  if (usernameCheckTimer) clearTimeout(usernameCheckTimer);

  if (validateUsername(value)) return;

  const currentUsername = auth.character?.username ?? '';
  if (normalizeUsername(value) === normalizeUsername(currentUsername)) {
    usernameAvailable.value = true;
    return;
  }

  usernameCheckTimer = setTimeout(async () => {
    checkingUsername.value = true;
    try {
      const { data } = await api.get<{ available: boolean }>('/characters/username-available', {
        params: { username: value },
      });
      usernameAvailable.value = data.available;
    } catch {
      usernameAvailable.value = null;
    }
    checkingUsername.value = false;
  }, 400);
});

onUnmounted(() => {
  if (usernameCheckTimer) clearTimeout(usernameCheckTimer);
});

async function handleAvatar(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  loading.value = true;
  try {
    avatarUrl.value = await uploadFile(file);
  } catch {
    error.value = 'Gagal mengunggah avatar';
  }
  loading.value = false;
}

async function submit() {
  error.value = '';
  success.value = false;

  const usernameError = validateUsername(username.value);
  if (usernameError) {
    error.value = usernameError;
    return;
  }

  if (usernameAvailable.value === false) {
    error.value = 'Username sudah digunakan';
    return;
  }

  loading.value = true;
  const traits = traitsInput.value.split(',').map((t) => t.trim()).filter(Boolean);
  try {
    const updated = await auth.updateProfile({
      username: normalizeUsername(username.value),
      displayName: displayName.value,
      bio: bio.value,
      backstory: backstory.value,
      avatarUrl: avatarUrl.value || undefined,
      personalityTraits: traits,
    });
    success.value = true;
    setTimeout(() => router.push(`/@${updated.username}`), 1000);
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Gagal menyimpan profil');
  }
  loading.value = false;
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <h1 class="mb-6 text-2xl font-bold logo-text">Edit Profil Karakter</h1>

    <form @submit.prevent="submit" class="card space-y-4 p-6">
      <div class="flex items-center gap-4">
        <Avatar v-if="auth.character" :character="{ ...auth.character, avatarUrl }" size="lg" />
        <label class="btn-secondary cursor-pointer">
          Ganti Avatar
          <input type="file" accept="image/*" class="hidden" @change="handleAvatar" />
        </label>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Username</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neo-black/40">@</span>
          <input
            v-model="username"
            required
            class="input-field pl-8"
            placeholder="aldric_sw"
            autocomplete="username"
          />
        </div>
        <p class="mt-1 text-xs font-medium text-neo-black/50">
          Huruf, angka, dan underscore. Minimal 3 karakter.
        </p>
        <p v-if="checkingUsername" class="mt-1 text-xs font-medium text-neo-black/50">
          Memeriksa ketersediaan...
        </p>
        <p v-else-if="usernameAvailable === true && validateUsername(username) === null" class="neo-success mt-1 text-xs">
          Username tersedia
        </p>
        <p v-else-if="usernameAvailable === false" class="neo-error mt-1 text-xs">
          Username sudah digunakan
        </p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Nama Karakter</label>
        <input v-model="displayName" required class="input-field" />
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Bio</label>
        <textarea v-model="bio" rows="2" class="input-field" />
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Backstory</label>
        <textarea v-model="backstory" rows="5" class="input-field" />
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Sifat Kepribadian</label>
        <input v-model="traitsInput" class="input-field" placeholder="Pisahkan dengan koma" />
      </div>

      <p v-if="error" class="neo-error">{{ error }}</p>
      <p v-if="success" class="neo-success">Profil berhasil disimpan!</p>

      <div class="flex gap-3 pt-2">
        <RouterLink :to="`/@${auth.character?.username}`" class="btn-secondary flex-1 text-center">
          Batal
        </RouterLink>
        <button type="submit" :disabled="loading || usernameAvailable === false" class="btn-primary flex-1">
          {{ loading ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </div>
    </form>
  </div>
</template>
