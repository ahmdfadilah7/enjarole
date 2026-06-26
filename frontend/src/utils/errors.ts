import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Tidak dapat terhubung ke server. Pastikan backend berjalan dan dapat diakses dari jaringan ini.';
    }

    const data = error.response.data as { message?: string | string[] };
    if (Array.isArray(data?.message)) {
      return data.message.join(', ');
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }

    if (error.response.status === 409) {
      return typeof data?.message === 'string' ? data.message : 'Email atau username sudah digunakan';
    }
    if (error.response.status === 400) {
      return 'Data tidak valid. Periksa kembali formulir Anda';
    }
  }

  return fallback;
}
