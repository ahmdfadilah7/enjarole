import { ref } from 'vue';

export type CameraFacing = 'user' | 'environment';

function getRecorderMime(): string {
  const types = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function useDeviceCamera() {
  const stream = ref<MediaStream | null>(null);
  const facingMode = ref<CameraFacing>('environment');
  const error = ref('');
  const isRecording = ref(false);
  const recordSeconds = ref(0);

  let mediaRecorder: MediaRecorder | null = null;
  let recordChunks: Blob[] = [];
  let recordInterval: ReturnType<typeof setInterval> | null = null;
  let shouldEmitRecording = false;

  function stopTracks() {
    stream.value?.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }

  function clearRecordTimer() {
    if (recordInterval) clearInterval(recordInterval);
    recordInterval = null;
  }

  async function start(videoEl: HTMLVideoElement, withAudio: boolean) {
    error.value = '';
    stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'Browser tidak mendukung kamera';
      return false;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode.value,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: withAudio,
      });
      stream.value = mediaStream;
      videoEl.srcObject = mediaStream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play();
      return true;
    } catch {
      error.value = 'Izinkan akses kamera dan mikrofon di pengaturan browser';
      return false;
    }
  }

  function stop(videoEl?: HTMLVideoElement | null) {
    clearRecordTimer();
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      shouldEmitRecording = false;
      mediaRecorder.stop();
    }
    mediaRecorder = null;
    recordChunks = [];
    isRecording.value = false;
    recordSeconds.value = 0;
    stopTracks();
    if (videoEl) videoEl.srcObject = null;
  }

  async function flip(videoEl: HTMLVideoElement, withAudio: boolean) {
    facingMode.value = facingMode.value === 'user' ? 'environment' : 'user';
    return start(videoEl, withAudio);
  }

  function capturePhoto(videoEl: HTMLVideoElement): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!videoEl.videoWidth) {
        reject(new Error('Kamera belum siap'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Gagal mengambil foto'));
        return;
      }
      ctx.drawImage(videoEl, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Gagal mengambil foto'));
            return;
          }
          resolve(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92,
      );
    });
  }

  function startRecording(maxSeconds: number): boolean {
    if (!stream.value || isRecording.value) return false;
    const mimeType = getRecorderMime();
    recordChunks = [];
    shouldEmitRecording = false;

    try {
      mediaRecorder = mimeType
        ? new MediaRecorder(stream.value, { mimeType })
        : new MediaRecorder(stream.value);
    } catch {
      error.value = 'Perekaman video tidak didukung di perangkat ini';
      return false;
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const emit = shouldEmitRecording;
      shouldEmitRecording = false;
      isRecording.value = false;
      clearRecordTimer();

      if (!emit || recordChunks.length === 0) {
        recordChunks = [];
        return;
      }

      const blob = new Blob(recordChunks, {
        type: mediaRecorder?.mimeType || 'video/webm',
      });
      recordChunks = [];
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `camera-${Date.now()}.${ext}`, { type: blob.type });
      onRecorded?.(file);
    };

    mediaRecorder.start(250);
    isRecording.value = true;
    recordSeconds.value = 0;
    recordInterval = setInterval(() => {
      recordSeconds.value += 1;
      if (recordSeconds.value >= maxSeconds) {
        stopRecording(true);
      }
    }, 1000);
    return true;
  }

  let onRecorded: ((file: File) => void) | null = null;

  function setOnRecorded(callback: (file: File) => void) {
    onRecorded = callback;
  }

  function stopRecording(emit = true) {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    shouldEmitRecording = emit;
    mediaRecorder.stop();
    clearRecordTimer();
  }

  return {
    stream,
    facingMode,
    error,
    isRecording,
    recordSeconds,
    start,
    stop,
    flip,
    capturePhoto,
    startRecording,
    stopRecording,
    setOnRecorded,
  };
}
