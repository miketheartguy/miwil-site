import { Delaunay } from 'd3-delaunay';

interface Point {
  x: number;
  y: number;
  phase: number;   // offset for sinusoidal drift
  speed: number;   // drift speed multiplier
  ox: number;      // origin x (for bounded drift)
  oy: number;      // origin y
}

const POINT_COUNT     = 90;
const DRIFT_RADIUS    = 80;   // max drift from origin
const MOUSE_RADIUS    = 300;  // influence radius
const MOUSE_ATTRACT   = 0.004;
const MOUSE_REPEL_R   = 90;   // inside this radius, repel instead
const EDGE_LINE_WIDTH = 1.5;

export class DelaunayBg {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pts: Point[] = [];
  private mx = -9999;
  private my = -9999;
  private mvx = 0;   // mouse velocity x (for trail shimmer)
  private mvy = 0;
  private pmx = -9999;
  private pmy = -9999;
  private t = 0;
  private raf = 0;
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.resize();
    this.initPoints();
    this.bindEvents();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.initPoints();
    });
    this.resizeObserver.observe(document.documentElement);
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width  = window.innerWidth  * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width  = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
  }

  private initPoints() {
    this.pts = [];
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Scatter points with some margin so edges fill
    for (let i = 0; i < POINT_COUNT; i++) {
      const ox = -DRIFT_RADIUS + Math.random() * (W + DRIFT_RADIUS * 2);
      const oy = -DRIFT_RADIUS + Math.random() * (H + DRIFT_RADIUS * 2);
      this.pts.push({
        x: ox, y: oy, ox, oy,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      });
    }

    // Corner anchors to ensure triangulation covers full viewport
    const anchors: [number, number][] = [
      [-20, -20], [W + 20, -20], [-20, H + 20], [W + 20, H + 20],
      [W / 2, -20], [W / 2, H + 20], [-20, H / 2], [W + 20, H / 2],
    ];
    for (const [ox, oy] of anchors) {
      this.pts.push({ x: ox, y: oy, ox, oy, phase: 0, speed: 0 });
    }
  }

  private bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mvx = e.clientX - this.pmx;
      this.mvy = e.clientY - this.pmy;
      this.pmx = this.mx;
      this.pmy = this.my;
      this.mx = e.clientX;
      this.my = e.clientY;
    });

    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      this.mx = t.clientX;
      this.my = t.clientY;
    }, { passive: true });
  }

  private update() {
    this.t += 0.006;
    const ANCHOR_START = POINT_COUNT; // anchors don't move

    for (let i = 0; i < ANCHOR_START; i++) {
      const p = this.pts[i];

      // Lissajous-style drift around origin
      p.x = p.ox + Math.sin(this.t * p.speed + p.phase)             * DRIFT_RADIUS;
      p.y = p.oy + Math.cos(this.t * p.speed * 0.73 + p.phase + 1) * DRIFT_RADIUS;

      // Mouse influence
      const dx = this.mx - p.x;
      const dy = this.my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MOUSE_RADIUS) {
        const strength = 1 - dist / MOUSE_RADIUS;
        if (dist < MOUSE_REPEL_R) {
          // Repel when very close — creates interesting triangulation gaps
          const repel = (1 - dist / MOUSE_REPEL_R) * 1.5;
          p.x -= dx / dist * repel * 2;
          p.y -= dy / dist * repel * 2;
        } else {
          // Attract gently
          p.x += dx * MOUSE_ATTRACT * strength;
          p.y += dy * MOUSE_ATTRACT * strength;
        }
      }
    }
  }

  private triangleColor(
    cx: number, cy: number,
  ): { fill: string; stroke: string } {
    const W = window.innerWidth;
    const H = window.innerHeight;

    const dx = cx - this.mx;
    const dy = cy - this.my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mouseFactor = Math.max(0, 1 - dist / MOUSE_RADIUS);
    const hotspot     = Math.max(0, 1 - dist / 120);

    const speed = Math.min(Math.sqrt(this.mvx ** 2 + this.mvy ** 2) / 30, 1);

    const timeCycle = (this.t * 8) % 360;
    const posHue    = (cx / W) * 20 + (cy / H) * 20;
    const baseHue   = (185 + posHue + timeCycle) % 360;
    const hue       = (baseHue - mouseFactor * 160 * (1 + speed * 0.4) + 360) % 360;

    // Far from cursor: no saturation, fully transparent fill — background shows through
    // Near cursor: saturated colour blooms in
    const sat       = mouseFactor * 70 + hotspot * 15 + speed * 10;
    const lightness = 88 - mouseFactor * 38 - hotspot * 20;
    const alpha     = mouseFactor * 0.72 + hotspot * 0.22;

    // Stroke: heavy black lines everywhere, constant
    return {
      fill:   `hsla(${hue}, ${sat}%, ${lightness}%, ${alpha})`,
      stroke: `rgba(10, 10, 10, 0.55)`,
    };
  }

  private draw() {
    const ctx = this.ctx;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Light gray background
    ctx.fillStyle = '#d2d6d8';
    ctx.fillRect(0, 0, W, H);

    const delaunay  = Delaunay.from(this.pts, p => p.x, p => p.y);
    const triangles = delaunay.triangles;

    for (let i = 0; i < triangles.length; i += 3) {
      const a = this.pts[triangles[i]];
      const b = this.pts[triangles[i + 1]];
      const c = this.pts[triangles[i + 2]];

      const cx = (a.x + b.x + c.x) / 3;
      const cy = (a.y + b.y + c.y) / 3;

      const { fill, stroke } = this.triangleColor(cx, cy);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();

      ctx.fillStyle = fill;
      ctx.fill();

      ctx.strokeStyle = stroke;
      ctx.lineWidth = EDGE_LINE_WIDTH;
      ctx.stroke();
    }
  }

  start() {
    const loop = () => {
      this.update();
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
  }
}
