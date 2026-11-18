"use client";

/**
 * A small rotating wireframe globe (inline SVG, no library), sized in em so it matches the text it
 * sits next to. Meridians turn around a tilted axis; the half of each meridian on the far side is
 * drawn faint. With reduced motion it is a still globe.
 */
import { useEffect, useRef } from "react";

const R = 46;
const MERIDIANS = 8; // one every 22.5°
const LATS = [-60, -30, 0, 30, 60];
const PERIOD_MS = 12000; // one full turn

/** The half-ellipse path of the meridian at longitude `lon` (radians, 0 = facing the viewer). */
function meridian(lon: number): { d: string; front: boolean } {
  const s = Math.sin(lon);
  const rx = Math.abs(s) * R;
  const sweep = s >= 0 ? 1 : 0;
  return { d: `M 0 ${-R} A ${rx.toFixed(2)} ${R} 0 0 ${sweep} 0 ${R}`, front: Math.cos(lon) >= 0 };
}

export function SpinGlobe({ className = "" }: { className?: string }) {
  const paths = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const draw = (t: number) => {
      const rot = ((t % PERIOD_MS) / PERIOD_MS) * Math.PI * 2;
      paths.current.forEach((p, i) => {
        if (!p) return;
        // each meridian line is drawn as two halves (i even: lon, i odd: lon + π) so both sides show
        const lon = (Math.floor(i / 2) * Math.PI) / MERIDIANS + rot + (i % 2 ? Math.PI : 0);
        const m = meridian(lon);
        p.setAttribute("d", m.d);
        p.style.opacity = m.front ? "1" : "0.22";
      });
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { draw(PERIOD_MS / 10); return; }
    let raf = 0;
    const loop = (t: number) => { draw(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden
      style={{ filter: "drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 55%, transparent))" }}>
      <defs>
        <radialGradient id="spinglobe-fill" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity=".28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity=".04" />
        </radialGradient>
      </defs>
      <g transform="rotate(-23.4)" fill="none" stroke="var(--accent)" strokeLinecap="round">
        <circle r={R} fill="url(#spinglobe-fill)" strokeWidth="2.2" />
        {LATS.map((lat) => {
          const y = -R * Math.sin((lat * Math.PI) / 180);
          const half = R * Math.cos((lat * Math.PI) / 180);
          return <line key={lat} x1={-half} x2={half} y1={y} y2={y} strokeWidth={lat === 0 ? 1.6 : 1.1} opacity={lat === 0 ? 0.9 : 0.55} />;
        })}
        {Array.from({ length: MERIDIANS * 2 }, (_, i) => (
          <path key={i} ref={(el) => { paths.current[i] = el; }} strokeWidth="1.3" />
        ))}
        <line x1="0" x2="0" y1={-R - 3} y2={-R + 1} strokeWidth="2" opacity=".7" />
      </g>
    </svg>
  );
}
