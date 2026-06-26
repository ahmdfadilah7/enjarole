export interface FrameRenderOptions {
  filterCss?: string;
  mirror?: boolean;
  drawOverlay?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export function renderCameraFrame(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  width: number,
  height: number,
  options: FrameRenderOptions,
) {
  const filterCss = options.filterCss ?? 'none';
  const mirror = options.mirror ?? false;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.filter = filterCss === 'none' ? 'none' : filterCss;
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoEl, 0, 0, width, height);
  ctx.restore();

  if (options.drawOverlay) {
    options.drawOverlay(ctx, width, height);
  }
}

export function needsCameraFramePipeline(options: FrameRenderOptions): boolean {
  const filterCss = options.filterCss ?? 'none';
  return filterCss !== 'none' || !!options.mirror || !!options.drawOverlay;
}
