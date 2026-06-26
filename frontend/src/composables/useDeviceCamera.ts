import { ref } from 'vue';
import {
  renderCameraFrame,
  needsCameraFramePipeline,
  type FrameRenderOptions,
} from '@/utils/cameraFrameRenderer';

export type CameraFacing = 'user' | 'environment';

export interface CapturePhotoOptions extends FrameRenderOptions {}

export interface PipelineOptions extends FrameRenderOptions {
  getFilterCss: () => string;
  drawOverlay?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

function getRecorderMime(): string {
  const types = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

function resolveFrameOptions(
  partial: PipelineOptions | CapturePhotoOptions,
  mirror: boolean,
): FrameRenderOptions {
  const pipeline = partial as PipelineOptions;
  return {
    filterCss: pipeline.getFilterCss?.() ?? partial.filterCss ?? 'none',
    mirror,
    drawOverlay: partial.drawOverlay,
  };
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
  let compositorRaf: number | null = null;
  let compositorCanvas: HTMLCanvasElement | null = null;

  function stopTracks() {
    stream.value?.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }

  function clearRecordTimer() {
    if (recordInterval) clearInterval(recordInterval);
    recordInterval = null;
  }

  function stopCompositor() {
    if (compositorRaf != null) cancelAnimationFrame(compositorRaf);
    compositorRaf = null;
    compositorCanvas = null;
  }

  function startCompositorPipeline(
    videoEl: HTMLVideoElement,
    options: PipelineOptions,
  ): MediaStream | null {
    stopCompositor();
    if (!videoEl.videoWidth) return null;

    const mirror = facingMode.value === 'user';
    const frameOptions = resolveFrameOptions(options, mirror);

    if (!needsCameraFramePipeline(frameOptions)) return null;

    compositorCanvas = document.createElement('canvas');
    compositorCanvas.width = videoEl.videoWidth;
    compositorCanvas.height = videoEl.videoHeight;
    const ctx = compositorCanvas.getContext('2d');
    if (!ctx) return null;

    const loop = () => {
      if (!compositorCanvas || !ctx) return;
      if (compositorCanvas.width !== videoEl.videoWidth) {
        compositorCanvas.width = videoEl.videoWidth;
        compositorCanvas.height = videoEl.videoHeight;
      }
      const current = resolveFrameOptions(options, facingMode.value === 'user');
      renderCameraFrame(ctx, videoEl, compositorCanvas.width, compositorCanvas.height, current);
      compositorRaf = requestAnimationFrame(loop);
    };
    loop();

    return compositorCanvas.captureStream(30);
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
    stopCompositor();
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

  function capturePhoto(videoEl: HTMLVideoElement, options: CapturePhotoOptions = {}): Promise<File> {
    const mirror = options.mirror ?? facingMode.value === 'user';
    const frameOptions = resolveFrameOptions(options, mirror);

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

      renderCameraFrame(ctx, videoEl, canvas.width, canvas.height, frameOptions);

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

  function startRecording(
    maxSeconds: number,
    videoEl: HTMLVideoElement,
    pipeline: PipelineOptions,
  ): boolean {
    if (!stream.value || isRecording.value) return false;
    const mimeType = getRecorderMime();
    recordChunks = [];
    shouldEmitRecording = false;

    const mirror = facingMode.value === 'user';
    const frameOptions = resolveFrameOptions(pipeline, mirror);

    let recordStream: MediaStream | null = stream.value;

    if (needsCameraFramePipeline(frameOptions)) {
      const canvasStream = startCompositorPipeline(videoEl, pipeline);
      if (canvasStream) {
        const audioTracks = stream.value.getAudioTracks();
        recordStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
      }
    }

    if (!recordStream) return false;

    try {
      mediaRecorder = mimeType
        ? new MediaRecorder(recordStream, { mimeType })
        : new MediaRecorder(recordStream);
    } catch {
      error.value = 'Perekaman video tidak didukung di perangkat ini';
      stopCompositor();
      return false;
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const emit = shouldEmitRecording;
      const recordedSeconds = Math.max(1, recordSeconds.value);
      shouldEmitRecording = false;
      isRecording.value = false;
      clearRecordTimer();
      stopCompositor();

      if (!emit || recordChunks.length === 0) {
        if (emit) {
          error.value = 'Gagal menyimpan video. Coba rekam lebih lama.';
        }
        recordChunks = [];
        return;
      }

      const mime = mediaRecorder?.mimeType || 'video/webm';
      const blob = new Blob(recordChunks, { type: mime });
      recordChunks = [];
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const normalizedType = mime.startsWith('video/') ? mime : 'video/webm';
      const file = new File([blob], `camera-${Date.now()}.${ext}`, { type: normalizedType });
      onRecorded?.(file, recordedSeconds);
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

  let onRecorded: ((file: File, durationSeconds: number) => void) | null = null;

  function setOnRecorded(callback: (file: File, durationSeconds: number) => void) {
    onRecorded = callback;
  }

  function stopRecording(emit = true) {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    shouldEmitRecording = emit;
    if (mediaRecorder.state === 'recording') {
      try {
        mediaRecorder.requestData();
      } catch {
        /* browser may not support requestData */
      }
    }
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
