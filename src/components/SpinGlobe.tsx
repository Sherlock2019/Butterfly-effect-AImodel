"use client";

/**
 * A realistic rotating Earth, drawn on a canvas, sized in em so it matches the text beside it.
 * Texture: the Natural Earth II tiles Cesium already ships (public/cesium/Assets/Textures/NaturalEarthII,
 * level 2 = 8×4 tiles of 256 px, EPSG:4326, TMS origin bottom-left), stitched once into a 2048×1024
 * equirectangular map. Each frame, every pixel of the disk is mapped back to latitude/longitude
 * (orthographic projection, 23.4° axial tilt) and lit by a sun from the upper left.
 * With reduced motion it is a still Earth. Until the tiles load it shows a plain blue sphere.
 */
import { useEffect, useRef } from "react";

const TILES = "/cesium/Assets/Textures/NaturalEarthII/2";
const TX = 8, TY = 4, TS = 256;
const W = TX * TS, H = TY * TS;
const PERIOD_S = 24; // one full turn
const TILT = (23.4 * Math.PI) / 180;
const LIGHT = (() => { const v = [-0.55, 0.45, 0.7]; const n = Math.hypot(...v); return v.map((c) => c / n); })();

let mapPromise: Promise<Uint8ClampedArray> | null = null;
/** The stitched equirectangular map, loaded once per page and shared by every globe. */
function loadMap(): Promise<Uint8ClampedArray> {
  if (mapPromise) return mapPromise;
  mapPromise = (async () => {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const jobs: Promise<void>[] = [];
    for (let x = 0; x < TX; x++) for (let y = 0; y < TY; y++) {
      jobs.push(new Promise((ok, fail) => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, x * TS, (TY - 1 - y) * TS); ok(); };
        img.onerror = fail;
        img.src = `${TILES}/${x}/${y}.jpg`;
      }));
    }
    await Promise.all(jobs);
    return ctx.getImageData(0, 0, W, H).data;
  })();
  mapPromise.catch(() => { mapPromise = null; });
  return mapPromise;
}

export function SpinGlobe({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0, alive = true;
    let tex: Uint8ClampedArray | null = null;
    // per-size precomputed tables: for each disk pixel its texture row, base longitude and light
    let N = 0, idx: Int32Array, row: Int32Array, lon0: Float32Array, light: Float32Array, out: ImageData | null = null;

    const setup = () => {
      const css = canvas.clientWidth;
      if (!css) return false;
      const n = Math.round(css * Math.min(window.devicePixelRatio || 1, 2));
      if (n === N) return true;
      N = n; canvas.width = n; canvas.height = n;
      const ctx = canvas.getContext("2d")!;
      out = ctx.createImageData(n, n);
      const pi: number[] = [], pr: number[] = [], pl: number[] = [], ps: number[] = [];
      const r = n / 2, ct = Math.cos(TILT), st = Math.sin(TILT);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const sx = (i + 0.5 - r) / r, sy = (r - j - 0.5) / r;
        const d2 = sx * sx + sy * sy;
        if (d2 > 1) continue;
        const sz = Math.sqrt(1 - d2);
        // undo the axial tilt (screen-plane rotation) to get earth-frame coordinates
        const ex = sx * ct + sy * st, ey = -sx * st + sy * ct;
        const lat = Math.asin(Math.max(-1, Math.min(1, ey)));
        pi.push(j * n + i);
        pr.push(Math.min(H - 1, Math.floor((0.5 - lat / Math.PI) * H)));
        pl.push(Math.atan2(ex, sz));
        const lam = Math.max(0, sx * LIGHT[0] + sy * LIGHT[1] + sz * LIGHT[2]);
        const edge = Math.min(1, (1 - Math.sqrt(d2)) * r * 0.9); // 1-px soft edge
        ps.push((0.18 + 0.95 * Math.pow(lam, 0.8)) * edge);
      }
      idx = Int32Array.from(pi); row = Int32Array.from(pr); lon0 = Float32Array.from(pl); light = Float32Array.from(ps);
      return true;
    };

    const draw = (t: number) => {
      if (!tex || !setup() || !out) return;
      const rot = still ? 0.6 : ((t / 1000) % PERIOD_S) / PERIOD_S * Math.PI * 2;
      const o = out.data;
      for (let k = 0; k < idx.length; k++) {
        // west→east spin: features drift left to right, so the longitude under each pixel decreases
        let u = (lon0[k] - rot) / (2 * Math.PI) + 0.5;
        u -= Math.floor(u);
        const s = (row[k] * W + Math.floor(u * W)) * 4, p = idx[k] * 4, l = light[k];
        o[p] = tex[s] * l; o[p + 1] = tex[s + 1] * l; o[p + 2] = tex[s + 2] * l; o[p + 3] = 255;
      }
      canvas.getContext("2d")!.putImageData(out, 0, 0);
    };

    loadMap().then((m) => {
      if (!alive) return;
      tex = m;
      if (still) { draw(0); return; }
      const loop = (t: number) => { draw(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }).catch(() => { /* keep the plain sphere */ });

    const ro = new ResizeObserver(() => { if (still && tex) draw(0); });
    ro.observe(canvas);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <span className={`relative inline-block rounded-full ${className}`} aria-hidden
      style={{
        background: "radial-gradient(circle at 35% 30%, #2b6cb0, #0b1d3a 70%)",
        boxShadow: "0 0 18px 2px color-mix(in srgb, var(--accent) 45%, transparent), inset -6px -6px 14px rgba(0,0,0,.45)",
      }}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full rounded-full" />
      {/* atmosphere: a thin blue rim and a soft highlight on the lit side */}
      <span className="pointer-events-none absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,.16), transparent 45%), radial-gradient(circle, transparent 64%, rgba(90,170,255,.35) 71%, transparent 72%)" }} />
    </span>
  );
}
