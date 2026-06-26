export type FacePoint = { x: number; y: number };
export type FaceLandmarks = FacePoint[];

export interface FaceEffect {
  id: string;
  name: string;
  icon: string;
  animated?: boolean;
  generatesCartoon?: boolean;
}

const CARTOON_GENERATE_IDS = new Set(['cartoon']);

export function isCartoonGenerateEffect(id: string): boolean {
  return CARTOON_GENERATE_IDS.has(id);
}

export function needsFaceDetection(id: string): boolean {
  return id !== 'none' && !isCartoonGenerateEffect(id);
}

export function getVisibleFaceEffects(mode: 'photo' | 'video'): FaceEffect[] {
  return CAMERA_FACE_EFFECTS.filter((e) => !e.generatesCartoon || mode === 'photo');
}

function pt(landmarks: FaceLandmarks, i: number, w: number, h: number, mirror: boolean): FacePoint {
  const p = landmarks[i];
  if (!p) return { x: 0, y: 0 };
  return { x: (mirror ? 1 - p.x : p.x) * w, y: p.y * h };
}

function mid(landmarks: FaceLandmarks, a: number, b: number, w: number, h: number, mirror: boolean): FacePoint {
  const p1 = pt(landmarks, a, w, h, mirror);
  const p2 = pt(landmarks, b, w, h, mirror);
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function dist(a: FacePoint, b: FacePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function faceWidth(landmarks: FaceLandmarks, w: number, h: number, mirror: boolean): number {
  return dist(pt(landmarks, 127, w, h, mirror), pt(landmarks, 356, w, h, mirror));
}

function squiggle(
  ctx: CanvasRenderingContext2D,
  origin: FacePoint,
  length: number,
  amplitude: number,
  segments: number,
  angle: number,
) {
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const dx = Math.cos(angle) * length * t;
    const dy = Math.sin(angle) * length * t + Math.sin(t * Math.PI * 3) * amplitude;
    ctx.lineTo(origin.x + dx, origin.y + dy);
  }
  ctx.stroke();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color = '#ff4d8d') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 6);
  ctx.bezierCurveTo(12, 2, 6, 0, 6, 6);
  ctx.bezierCurveTo(6, 10, 12, 14, 12, 18);
  ctx.bezierCurveTo(12, 14, 18, 10, 18, 6);
  ctx.bezierCurveTo(18, 0, 12, 2, 12, 6);
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * size;
    const py = Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  seed: number,
) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.006 + seed);
  const s = size * (0.6 + pulse * 0.5);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(seed + time * 0.001);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.lineTo(s, 0);
  ctx.moveTo(0, -s);
  ctx.lineTo(0, s);
  ctx.stroke();
  ctx.restore();
}

function withGlow(ctx: CanvasRenderingContext2D, color: string, blur: number, fn: () => void) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

type Drawer = (
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmarks,
  w: number,
  h: number,
  mirror: boolean,
  time: number,
) => void;

function drawer(fn: Drawer) {
  return (ctx: CanvasRenderingContext2D, landmarks: FaceLandmarks, w: number, h: number, mirror: boolean, time = 0) => {
    if (landmarks.length < 300) return;
    fn(ctx, landmarks, w, h, mirror, time);
  };
}

// ─── Enhanced doodle (multi-color coretan) ───
const doodleDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const lw = Math.max(3, w * 0.0045);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const leftCheek = pt(landmarks, 234, w, h, mirror);
  const rightCheek = pt(landmarks, 454, w, h, mirror);
  const forehead = pt(landmarks, 10, w, h, mirror);
  const nose = pt(landmarks, 1, w, h, mirror);
  const mouthL = pt(landmarks, 61, w, h, mirror);
  const mouthR = pt(landmarks, 291, w, h, mirror);

  const colors = ['#ff4d8d', '#7c5cff', '#ffd93d', '#00d4aa', '#ff6b35'];
  ctx.lineWidth = lw;

  withGlow(ctx, '#ff4d8d', 8, () => {
    ctx.strokeStyle = colors[0];
    squiggle(ctx, { x: leftCheek.x - w * 0.05, y: leftCheek.y }, w * 0.08, w * 0.018, 6, -0.35);
    squiggle(ctx, { x: rightCheek.x + w * 0.05, y: rightCheek.y }, w * 0.08, w * 0.018, 6, Math.PI + 0.35);
  });

  ctx.strokeStyle = colors[1];
  squiggle(ctx, { x: forehead.x - w * 0.06, y: forehead.y - h * 0.025 }, w * 0.12, w * 0.014, 7, 0.15);
  squiggle(ctx, { x: forehead.x + w * 0.02, y: forehead.y - h * 0.04 }, w * 0.06, w * 0.01, 4, -0.5);

  ctx.strokeStyle = colors[2];
  ctx.beginPath();
  ctx.arc(nose.x, nose.y + h * 0.02, w * 0.02, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = colors[3];
  ctx.beginPath();
  ctx.moveTo(mouthL.x, mouthL.y + h * 0.012);
  ctx.quadraticCurveTo((mouthL.x + mouthR.x) / 2, mouthL.y + h * 0.05, mouthR.x, mouthR.y + h * 0.012);
  ctx.stroke();

  ctx.strokeStyle = colors[4];
  squiggle(ctx, { x: leftCheek.x, y: leftCheek.y + h * 0.03 }, w * 0.05, w * 0.01, 4, Math.PI / 2);
  squiggle(ctx, { x: rightCheek.x, y: rightCheek.y + h * 0.03 }, w * 0.05, w * 0.01, 4, Math.PI / 2);
});

// ─── Neon glow outline ───
const neonDraw = drawer((ctx, landmarks, w, h, mirror, time) => {
  const pulse = 0.6 + 0.4 * Math.sin(time * 0.005);
  const jaw = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323];
  const brow = [70, 63, 105, 66, 107, 55, 65, 52, 285, 295, 282, 283, 276, 300, 293, 334];

  const drawPath = (indices: number[], color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, w * 0.005) * pulse;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * pulse;
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const p = pt(landmarks, idx, w, h, mirror);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  drawPath(brow, `rgba(0, 255, 255, ${pulse})`);
  drawPath(jaw, `rgba(255, 0, 200, ${pulse})`);

  const nose = pt(landmarks, 1, w, h, mirror);
  withGlow(ctx, '#ffff00', 12, () => {
    ctx.fillStyle = `rgba(255, 255, 0, ${0.7 * pulse})`;
    ctx.beginPath();
    ctx.arc(nose.x, nose.y, w * 0.012, 0, Math.PI * 2);
    ctx.fill();
  });
});

// ─── Glitter / kilau ───
const glitterDraw = drawer((ctx, landmarks, w, h, mirror, time) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const center = mid(landmarks, 10, 1, w, h, mirror);
  const seeds = [
    { lx: -0.35, ly: -0.2, s: 1 },
    { lx: 0.3, ly: -0.25, s: 2 },
    { lx: -0.45, ly: 0.1, s: 3 },
    { lx: 0.42, ly: 0.05, s: 4 },
    { lx: 0, ly: -0.35, s: 5 },
    { lx: -0.2, ly: 0.25, s: 6 },
    { lx: 0.25, ly: 0.2, s: 7 },
    { lx: -0.1, ly: -0.1, s: 8 },
    { lx: 0.15, ly: -0.15, s: 9 },
    { lx: -0.3, ly: -0.35, s: 10 },
    { lx: 0.35, ly: -0.3, s: 11 },
    { lx: 0, ly: 0.3, s: 12 },
  ];

  for (const { lx, ly, s } of seeds) {
    drawSparkle(ctx, center.x + lx * fw, center.y + ly * fw, fw * 0.04, time, s);
  }

  ctx.fillStyle = 'rgba(255, 220, 100, 0.35)';
  const left = pt(landmarks, 234, w, h, mirror);
  const right = pt(landmarks, 454, w, h, mirror);
  drawStar(ctx, left.x, left.y, fw * 0.035, time * 0.002);
  drawStar(ctx, right.x, right.y, fw * 0.03, -time * 0.002);
});

// ─── Rainbow paint ───
const rainbowDraw = drawer((ctx, landmarks, w, h, mirror, time) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const forehead = pt(landmarks, 10, w, h, mirror);
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6', '#ff6bd6'];
  const offset = (time * 0.0005) % 1;

  ctx.lineWidth = Math.max(4, w * 0.006);
  ctx.lineCap = 'round';

  for (let i = 0; i < colors.length; i++) {
    ctx.strokeStyle = colors[(i + Math.floor(offset * colors.length)) % colors.length];
    const yOff = i * fw * 0.025;
    ctx.beginPath();
    ctx.moveTo(forehead.x - fw * 0.45, forehead.y - h * 0.05 + yOff);
    ctx.bezierCurveTo(
      forehead.x - fw * 0.2,
      forehead.y - h * 0.12 + yOff,
      forehead.x + fw * 0.2,
      forehead.y - h * 0.12 + yOff,
      forehead.x + fw * 0.45,
      forehead.y - h * 0.05 + yOff,
    );
    ctx.stroke();
  }

  const left = pt(landmarks, 234, w, h, mirror);
  const right = pt(landmarks, 454, w, h, mirror);
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeStyle = colors[2];
  squiggle(ctx, left, fw * 0.06, fw * 0.015, 5, Math.PI / 2);
  ctx.strokeStyle = colors[4];
  squiggle(ctx, right, fw * 0.06, fw * 0.015, 5, Math.PI / 2);
});

// ─── Devil horns ───
const devilDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const top = pt(landmarks, 10, w, h, mirror);
  const leftSide = pt(landmarks, 127, w, h, mirror);
  const rightSide = pt(landmarks, 356, w, h, mirror);
  const hornH = fw * 0.28;
  const hornW = fw * 0.12;

  const cheeks = [pt(landmarks, 234, w, h, mirror), pt(landmarks, 454, w, h, mirror)];
  for (const cheek of cheeks) {
    const g = ctx.createRadialGradient(cheek.x, cheek.y, 0, cheek.x, cheek.y, fw * 0.08);
    g.addColorStop(0, 'rgba(255, 40, 40, 0.45)');
    g.addColorStop(1, 'rgba(255, 40, 40, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cheek.x, cheek.y, fw * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#cc0000';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(2, w * 0.003);

  for (const [sx, curve] of [
    [leftSide.x - hornW * 0.3, -1],
    [rightSide.x + hornW * 0.3, 1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(sx, top.y);
    ctx.quadraticCurveTo(sx + curve * hornW, top.y - hornH * 0.6, sx + curve * hornW * 0.5, top.y - hornH);
    ctx.quadraticCurveTo(sx, top.y - hornH * 0.85, sx - curve * hornW * 0.3, top.y - hornH * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
});

// ─── Bunny ears ───
const bunnyDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const top = pt(landmarks, 10, w, h, mirror);
  const leftSide = pt(landmarks, 127, w, h, mirror);
  const rightSide = pt(landmarks, 356, w, h, mirror);
  const earH = fw * 0.55;
  const earW = fw * 0.14;

  const ears = [
    { x: leftSide.x - earW * 0.2, tilt: -0.15 },
    { x: rightSide.x + earW * 0.2, tilt: 0.15 },
  ];

  for (const ear of ears) {
    ctx.save();
    ctx.translate(ear.x, top.y - earH * 0.1);
    ctx.rotate(ear.tilt);
    ctx.fillStyle = '#f8f8f8';
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -earH * 0.35, earW, earH * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb6c1';
    ctx.beginPath();
    ctx.ellipse(0, -earH * 0.35, earW * 0.5, earH * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const nose = pt(landmarks, 1, w, h, mirror);
  ctx.fillStyle = '#ffb6c1';
  ctx.beginPath();
  ctx.ellipse(nose.x, nose.y, w * 0.018, w * 0.014, 0, 0, Math.PI * 2);
  ctx.fill();
});

// ─── Cool sunglasses ───
const sunglassesDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const left = mid(landmarks, 33, 133, w, h, mirror);
  const right = mid(landmarks, 263, 362, w, h, mirror);
  const eyeW = dist(left, right) * 0.26;
  const eyeH = eyeW * 0.65;

  for (const eye of [left, right]) {
    const g = ctx.createLinearGradient(eye.x - eyeW, eye.y, eye.x + eyeW, eye.y);
    g.addColorStop(0, '#1a1a2e');
    g.addColorStop(0.5, '#16213e');
    g.addColorStop(1, '#0f3460');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(3, w * 0.005);
    ctx.beginPath();
    ctx.roundRect(eye.x - eyeW, eye.y - eyeH, eyeW * 2, eyeH * 2, eyeH * 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(eye.x - eyeW * 0.3, eye.y - eyeH * 0.3, eyeW * 0.25, eyeH * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.beginPath();
  ctx.moveTo(left.x + eyeW, left.y);
  ctx.lineTo(right.x - eyeW, right.y);
  ctx.stroke();
});

// ─── Angel halo ───
const angelDraw = drawer((ctx, landmarks, w, h, mirror, time) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const top = pt(landmarks, 10, w, h, mirror);
  const pulse = 0.85 + 0.15 * Math.sin(time * 0.004);

  withGlow(ctx, '#fffacd', 20, () => {
    ctx.strokeStyle = `rgba(255, 250, 205, ${pulse})`;
    ctx.lineWidth = Math.max(4, w * 0.007);
    ctx.beginPath();
    ctx.ellipse(top.x, top.y - fw * 0.22, fw * 0.32 * pulse, fw * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  const left = pt(landmarks, 234, w, h, mirror);
  const right = pt(landmarks, 454, w, h, mirror);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  drawStar(ctx, left.x - fw * 0.05, left.y, fw * 0.025, 0);
  drawStar(ctx, right.x + fw * 0.05, right.y, fw * 0.025, 0.5);
});

// ─── Flower crown ───
const flowerDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const top = pt(landmarks, 10, w, h, mirror);
  const left = pt(landmarks, 127, w, h, mirror);
  const right = pt(landmarks, 356, w, h, mirror);
  const petalColors = ['#ff6b9d', '#c77dff', '#ffd93d', '#6bcb77', '#4d96ff'];

  const drawFlower = (x: number, y: number, size: number, color: string) => {
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(angle) * size * 0.5, y + Math.sin(angle) * size * 0.5, size * 0.45, size * 0.3, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
  };

  const positions = [
    { x: left.x, y: top.y - fw * 0.05 },
    { x: top.x - fw * 0.2, y: top.y - fw * 0.12 },
    { x: top.x, y: top.y - fw * 0.18 },
    { x: top.x + fw * 0.2, y: top.y - fw * 0.12 },
    { x: right.x, y: top.y - fw * 0.05 },
  ];

  positions.forEach((pos, i) => drawFlower(pos.x, pos.y, fw * 0.07, petalColors[i % petalColors.length]));

  ctx.strokeStyle = '#2d6a4f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(positions[0].x, positions[0].y);
  positions.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.stroke();
});

// ─── Dog face ───
const dogDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const top = pt(landmarks, 10, w, h, mirror);
  const leftSide = pt(landmarks, 127, w, h, mirror);
  const rightSide = pt(landmarks, 356, w, h, mirror);
  const nose = pt(landmarks, 1, w, h, mirror);
  const mouthMid = mid(landmarks, 13, 14, w, h, mirror);

  ctx.fillStyle = '#8B5E3C';
  ctx.strokeStyle = '#5c3d28';
  ctx.lineWidth = 2;

  for (const [sx, dir] of [[leftSide.x, -1], [rightSide.x, 1]] as const) {
    ctx.beginPath();
    ctx.ellipse(sx + dir * fw * 0.08, top.y + fw * 0.05, fw * 0.14, fw * 0.22, dir * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(nose.x, nose.y, w * 0.022, w * 0.018, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath();
  ctx.ellipse(mouthMid.x, mouthMid.y + h * 0.04, fw * 0.07, fw * 0.05, 0, 0, Math.PI);
  ctx.fill();
});

// ─── Butterfly ───
const butterflyDraw = drawer((ctx, landmarks, w, h, mirror, time) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const leftTemple = pt(landmarks, 127, w, h, mirror);
  const rightTemple = pt(landmarks, 356, w, h, mirror);
  const flap = Math.sin(time * 0.008) * 0.15;

  const drawWing = (x: number, y: number, flip: number, hue: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.85)`;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(fw * 0.06 * (1 + flap), -fw * 0.02, fw * 0.07, fw * 0.05, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(fw * 0.05 * (1 + flap), fw * 0.04, fw * 0.05, fw * 0.035, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  drawWing(leftTemple.x, leftTemple.y - fw * 0.1, -1, 280);
  drawWing(rightTemple.x, rightTemple.y - fw * 0.1, 1, 200);
});

// ─── Fire / api ───
const fireDraw = drawer((ctx, landmarks, w, h, mirror, time) => {
  const fw = faceWidth(landmarks, w, h, mirror);
  const top = pt(landmarks, 10, w, h, mirror);
  const flicker = (n: number) => Math.sin(time * 0.01 + n) * fw * 0.02;

  const flames = [
    { x: -0.25, color: '#ff6b35', h: 0.2 },
    { x: 0, color: '#ffd93d', h: 0.28 },
    { x: 0.22, color: '#ff4757', h: 0.18 },
  ];

  for (const [i, flame] of flames.entries()) {
    const fx = top.x + flame.x * fw;
    const fh = flame.h * fw + flicker(i);
    const g = ctx.createLinearGradient(fx, top.y - fh, fx, top.y);
    g.addColorStop(0, flame.color);
    g.addColorStop(0.6, '#ff9f43');
    g.addColorStop(1, 'rgba(255, 159, 67, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(fx, top.y);
    ctx.quadraticCurveTo(fx - fw * 0.05, top.y - fh * 0.5, fx, top.y - fh);
    ctx.quadraticCurveTo(fx + fw * 0.05, top.y - fh * 0.5, fx, top.y);
    ctx.fill();
  }
});

// ─── Existing effects (enhanced) ───
const blushDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const left = pt(landmarks, 234, w, h, mirror);
  const right = pt(landmarks, 454, w, h, mirror);
  const r = w * 0.065;
  for (const [p, color] of [[left, '#ff6b9d'], [right, '#ff8fab']] as const) {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `${color}99`);
    g.addColorStop(0.5, `${color}44`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
});

const catDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const top = pt(landmarks, 10, w, h, mirror);
  const leftSide = pt(landmarks, 127, w, h, mirror);
  const rightSide = pt(landmarks, 356, w, h, mirror);
  const fw = faceWidth(landmarks, w, h, mirror);
  const earH = fw * 0.25;
  const earW = earH * 0.65;

  for (const [sx] of [[leftSide.x], [rightSide.x]] as const) {
    ctx.fillStyle = '#ffb347';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - earW / 2, top.y);
    ctx.lineTo(sx, top.y - earH);
    ctx.lineTo(sx + earW / 2, top.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff8fab';
    ctx.beginPath();
    ctx.moveTo(sx - earW * 0.15, top.y - earH * 0.15);
    ctx.lineTo(sx, top.y - earH * 0.7);
    ctx.lineTo(sx + earW * 0.15, top.y - earH * 0.15);
    ctx.closePath();
    ctx.fill();
  }

  const nose = pt(landmarks, 1, w, h, mirror);
  ctx.fillStyle = '#ff8fab';
  ctx.strokeStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(nose.x - w * 0.014, nose.y);
  ctx.lineTo(nose.x, nose.y + h * 0.016);
  ctx.lineTo(nose.x + w * 0.014, nose.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(nose.x + side * w * 0.01, nose.y + h * 0.008);
    ctx.lineTo(nose.x + side * w * 0.06, nose.y + h * 0.005);
    ctx.stroke();
  }
});

const crownDraw = drawer((ctx, landmarks, w, h, mirror) => {
  const top = pt(landmarks, 10, w, h, mirror);
  const fw = faceWidth(landmarks, w, h, mirror);
  const crownW = fw * 0.85;
  const crownH = crownW * 0.32;
  const cx = top.x;
  const cy = top.y - crownH * 0.45;

  const g = ctx.createLinearGradient(cx, cy - crownH, cx, cy + crownH);
  g.addColorStop(0, '#ffe066');
  g.addColorStop(1, '#ff9f43');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(cx - crownW / 2, cy + crownH * 0.5);
  ctx.lineTo(cx - crownW / 2, cy);
  ctx.lineTo(cx - crownW * 0.25, cy - crownH);
  ctx.lineTo(cx, cy - crownH * 0.25);
  ctx.lineTo(cx + crownW * 0.25, cy - crownH);
  ctx.lineTo(cx + crownW / 2, cy);
  ctx.lineTo(cx + crownW / 2, cy + crownH * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ['#ff6b9d', '#7c5cff', '#00d4aa'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(cx + (i - 1) * crownW * 0.22, cy + crownH * 0.12, crownW * 0.045, 0, Math.PI * 2);
    ctx.fill();
  });
});

export const FACE_EFFECT_DRAWERS: Record<
  string,
  (ctx: CanvasRenderingContext2D, landmarks: FaceLandmarks, w: number, h: number, mirror: boolean, time?: number) => void
> = {
  doodle: doodleDraw,
  neon: neonDraw,
  glitter: glitterDraw,
  rainbow: rainbowDraw,
  devil: devilDraw,
  bunny: bunnyDraw,
  sunglasses: sunglassesDraw,
  angel: angelDraw,
  flower: flowerDraw,
  dog: dogDraw,
  butterfly: butterflyDraw,
  fire: fireDraw,
  blush: blushDraw,
  cat: catDraw,
  crown: crownDraw,
};

export const CAMERA_FACE_EFFECTS: FaceEffect[] = [
  { id: 'none', name: 'Tanpa', icon: '✨' },
  { id: 'cartoon', name: 'Adventurer', icon: '🧑‍🎨', generatesCartoon: true },
  { id: 'doodle', name: 'Coretan', icon: '🖍️' },
  { id: 'neon', name: 'Neon', icon: '💫', animated: true },
  { id: 'glitter', name: 'Kilau', icon: '✨', animated: true },
  { id: 'rainbow', name: 'Pelangi', icon: '🌈', animated: true },
  { id: 'sunglasses', name: 'Keren', icon: '😎' },
  { id: 'bunny', name: 'Kelinci', icon: '🐰' },
  { id: 'cat', name: 'Kucing', icon: '🐱' },
  { id: 'dog', name: 'Anjing', icon: '🐶' },
  { id: 'devil', name: 'Devil', icon: '😈' },
  { id: 'angel', name: 'Malaikat', icon: '😇', animated: true },
  { id: 'butterfly', name: 'Kupu-kupu', icon: '🦋', animated: true },
  { id: 'flower', name: 'Bunga', icon: '🌸' },
  { id: 'fire', name: 'Api', icon: '🔥', animated: true },
  { id: 'blush', name: 'Blush', icon: '💗' },
  { id: 'crown', name: 'Mahkota', icon: '👑' },
];

export function getFaceEffect(id: string): FaceEffect | undefined {
  return CAMERA_FACE_EFFECTS.find((e) => e.id === id);
}

export function drawFaceEffect(
  ctx: CanvasRenderingContext2D,
  effectId: string,
  landmarks: FaceLandmarks,
  w: number,
  h: number,
  mirror: boolean,
  time = performance.now(),
) {
  if (effectId === 'none') return;
  const drawerFn = FACE_EFFECT_DRAWERS[effectId];
  if (drawerFn) drawerFn(ctx, landmarks, w, h, mirror, time);
}
