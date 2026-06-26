const LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

type CorsCallback = (err: Error | null, allow?: boolean) => void;

export function resolveCorsOrigin():
  | string
  | ((origin: string | undefined, callback: CorsCallback) => void) {
  const configured = process.env.CORS_ORIGIN?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return configured || 'http://localhost:5173';
  }

  return (origin: string | undefined, callback: CorsCallback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (configured && origin === configured) {
      callback(null, true);
      return;
    }
    if (LAN_ORIGIN.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  };
}
