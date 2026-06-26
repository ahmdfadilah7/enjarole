<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { uploadFile } from '@/utils';
import { getApiErrorMessage } from '@/utils/errors';

const router = useRouter();
const auth = useAuthStore();

const step = ref(1);
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const username = ref('');
const displayName = ref('');
const avatarFile = ref<File | null>(null);
const avatarPreview = ref('');
const bio = ref('');
const backstory = ref('');
const traitsInput = ref('');
const error = ref('');
const loading = ref(false);

async function handleAvatar(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  avatarFile.value = file;
  avatarPreview.value = URL.createObjectURL(file);
}

function nextStep() {
  error.value = '';
  if (step.value === 1) {
    if (password.value !== confirmPassword.value) {
      error.value = 'Password tidak cocok';
      return;
    }
    if (password.value.length < 8) {
      error.value = 'Password minimal 8 karakter';
      return;
    }
  }
  if (step.value === 2) {
    if (!username.value || !displayName.value) {
      error.value = 'Username dan nama karakter wajib diisi';
      return;
    }
    if (username.value.length < 3) {
      error.value = 'Username minimal 3 karakter';
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.value)) {
      error.value = 'Username hanya boleh huruf, angka, dan underscore (tanpa spasi)';
      return;
    }
  }
  step.value++;
}

async function submit() {
  error.value = '';
  loading.value = true;
  const traits = traitsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  try {
    await auth.register({
      email: email.value,
      password: password.value,
      username: username.value,
      displayName: displayName.value,
      bio: bio.value || undefined,
      backstory: backstory.value || undefined,
      personalityTraits: traits.length ? traits : undefined,
    });
    if (avatarFile.value) {
      try {
        const url = await uploadFile(avatarFile.value);
        await auth.updateProfile({ avatarUrl: url });
      } catch (e: unknown) {
        error.value = `Karakter berhasil dibuat, tetapi avatar gagal diunggah: ${getApiErrorMessage(e)}`;
        router.push('/feed');
        return;
      }
    }
    router.push('/feed');
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'Gagal mendaftar');
  }
  loading.value = false;
}
</script>

<template>
  <div class="auth-bg">
    <div class="neo-deco -left-6 top-16 h-20 w-20 rotate-6 bg-neo-purple" />
    <div class="neo-deco -right-4 bottom-20 h-16 w-16 -rotate-12 bg-neo-yellow" />

    <div class="relative w-full max-w-md">
      <div class="mb-8 text-center">
        <div class="logo-box mx-auto mb-4 h-14 w-14 text-xl">E</div>
        <h1 class="text-4xl font-bold logo-text">EnjaRole</h1>
        <p class="mt-2 text-sm font-bold uppercase tracking-widest text-neo-black/70">Buat karakter barumu</p>
        <div class="mt-5 flex justify-center gap-2">
          <div
            v-for="s in 3"
            :key="s"
            class="h-3 w-14 border-[3px] border-neo-black transition-all"
            :class="s <= step ? 'bg-primary-300 neo-shadow-sm' : 'bg-white'"
          />
        </div>
        <p class="neo-tag mt-3 inline-block">Langkah {{ step }} / 3</p>
      </div>

      <div class="card p-8">
        <div v-if="step === 1">
          <h2 class="mb-4 text-lg font-bold uppercase tracking-wide">Akun</h2>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Email</label>
            <input v-model="email" type="email" required class="input-field" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Password</label>
            <input v-model="password" type="password" required class="input-field" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Konfirmasi Password</label>
            <input v-model="confirmPassword" type="password" required class="input-field" />
          </div>
        </div>

        <div v-if="step === 2">
          <h2 class="mb-4 text-lg font-bold uppercase tracking-wide">Identitas Karakter</h2>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Nama Karakter</label>
            <input v-model="displayName" required class="input-field" placeholder="Aldric Stormwind" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Username</label>
            <div class="flex items-stretch">
              <span class="flex items-center border-[3px] border-r-0 border-neo-black bg-neo-yellow px-3 text-sm font-bold">@</span>
              <input v-model="username" required class="input-field !shadow-none rounded-none" placeholder="aldric_sw" />
            </div>
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Avatar</label>
            <div class="flex items-center gap-4">
              <img v-if="avatarPreview" :src="avatarPreview" class="h-16 w-16 border-[3px] border-neo-black object-cover neo-shadow-sm" />
              <div v-else class="logo-box h-16 w-16 text-2xl">?</div>
              <label class="btn-secondary cursor-pointer">
                Pilih Gambar
                <input type="file" accept="image/*" class="hidden" @change="handleAvatar" />
              </label>
            </div>
          </div>
        </div>

        <div v-if="step === 3">
          <h2 class="mb-4 text-lg font-bold uppercase tracking-wide">Lore Karakter</h2>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Bio</label>
            <textarea v-model="bio" rows="2" class="input-field" placeholder="Deskripsi singkat karakter..." />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Backstory</label>
            <textarea v-model="backstory" rows="4" class="input-field" placeholder="Kisah latar belakang karakter..." />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-bold uppercase tracking-wide">Sifat Kepribadian (pisahkan koma)</label>
            <input v-model="traitsInput" class="input-field" placeholder="Berani, Setia, Misterius" />
          </div>
        </div>

        <p v-if="error" class="neo-error mb-4">{{ error }}</p>

        <div class="flex gap-3">
          <button v-if="step > 1" @click="step--" class="btn-secondary flex-1">Kembali</button>
          <button v-if="step < 3" @click="nextStep" class="btn-primary flex-1">Lanjut</button>
          <button v-if="step === 3" @click="submit" :disabled="loading" class="btn-primary flex-1">
            {{ loading ? 'Membuat...' : 'Buat Karakter' }}
          </button>
        </div>

        <p class="mt-5 text-center text-sm font-medium">
          Sudah punya karakter?
          <RouterLink to="/login" class="neo-link">Masuk</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
