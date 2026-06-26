import { ref } from 'vue';
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { FaceLandmarks } from '@/data/cameraFaceEffects';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

function getWasmBase(): string {
  const base = import.meta.env.BASE_URL || '/';
  const path = `${base}mediapipe/wasm`.replace(/([^:]\/)\/+/g, '$1');
  return new URL(path, window.location.origin).href;
}

let landmarkerInstance: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker | null> | null = null;

export function useFaceLandmarks() {
  const ready = ref(false);
  const loading = ref(false);
  const faceDetected = ref(false);
  const initError = ref('');

  let detectRaf: number | null = null;
  let lastLandmarks: FaceLandmarks | null = null;
  let lastVideoTime = -1;

  async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<FaceLandmarker> {
    const wasmBase = getWasmBase();
    const vision = await FilesetResolver.forVisionTasks(wasmBase);
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate,
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  }

  async function init(): Promise<boolean> {
    if (landmarkerInstance) {
      ready.value = true;
      return true;
    }
    if (initPromise) {
      const lm = await initPromise;
      ready.value = !!lm;
      return !!lm;
    }

    loading.value = true;
    initError.value = '';

    initPromise = (async () => {
      try {
        return await createLandmarker('GPU');
      } catch (gpuErr) {
        console.warn('[face-landmarks] GPU delegate failed, trying CPU', gpuErr);
        try {
          return await createLandmarker('CPU');
        } catch (cpuErr) {
          console.error('[face-landmarks] init failed', cpuErr);
          initError.value = 'Gagal memuat efek wajah. Muat ulang halaman.';
          return null;
        }
      }
    })();

    landmarkerInstance = await initPromise;
    loading.value = false;
    ready.value = !!landmarkerInstance;
    return ready.value;
  }

  function toLandmarks(points: NormalizedLandmark[]): FaceLandmarks {
    return points.map((p) => ({ x: p.x, y: p.y }));
  }

  function startDetection(videoEl: HTMLVideoElement) {
    stopDetection();

    const tick = () => {
      if (!landmarkerInstance || !videoEl.videoWidth) {
        detectRaf = requestAnimationFrame(tick);
        return;
      }

      const now = videoEl.currentTime;
      if (now !== lastVideoTime) {
        lastVideoTime = now;
        try {
          const result = landmarkerInstance.detectForVideo(videoEl, performance.now());
          if (result.faceLandmarks?.[0]) {
            lastLandmarks = toLandmarks(result.faceLandmarks[0]);
            faceDetected.value = true;
          } else {
            lastLandmarks = null;
            faceDetected.value = false;
          }
        } catch {
          lastLandmarks = null;
          faceDetected.value = false;
        }
      }
      detectRaf = requestAnimationFrame(tick);
    };

    detectRaf = requestAnimationFrame(tick);
  }

  function stopDetection() {
    if (detectRaf != null) cancelAnimationFrame(detectRaf);
    detectRaf = null;
    lastLandmarks = null;
    lastVideoTime = -1;
    faceDetected.value = false;
  }

  function getLandmarks(): FaceLandmarks | null {
    return lastLandmarks;
  }

  return {
    ready,
    loading,
    faceDetected,
    initError,
    init,
    startDetection,
    stopDetection,
    getLandmarks,
  };
}
