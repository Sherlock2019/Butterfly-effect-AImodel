"use client";

import { useMemo } from "react";
import { STACK, type ButterflyView, type Hit } from "@/lib/butterfly";
import { color, worldById, type WorldId } from "@/lib/worlds";

/**
 * The world × ring radar. Angle = WORLD (ten sectors in stack order physical → earth, so
 * neighbouring worlds touch and the cascade ripples sideways; earth meets physical at the top: the
 * full circle). Radius = RING (self → … → earth). Colour = world only; the glyph is the effect.
 * The same bearings are used on the globe: each world has its compass direction.
 */

export const SECT = 360 / STACK.length;
export const sectorStart = (w: WorldId) => -90 + STACK.indexOf(w) * SECT;
/** Bearing on the map (0 = north, clockwise) for the k-th of n hits in a world. */
export const bearingOf = (w: WorldId, k: number, n: number) => sectorStart(w) + 90 + (SECT * (k + 1)) / (n + 1);

const R0 = 46;
const R = 250;
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, a: number) => [Math.cos(rad(a)) * r, Math.sin(rad(a)) * r] as const;

function arc(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
  return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`;
}

export const GLYPH: Record<Hit["tone"], string> = { pos: "+", neg: "−", risk: "!", neutral: "·" };

export function ButterflyRadar({ view, shown, selected, onSelect, playKey = 0, labels = true }: {
  view: ButterflyView; shown?: Set<string>; selected?: string | null; onSelect?: (id: string | null) => void; playKey?: number; labels?: boolean;
}) {
  const n = Math.max(view.rings.length, 1);
  const band = (R - R0) / n;
  const ringR = (i: number) => R0 + band * (i + 0.5);
  const origin = view.origin.world;

  const placed = useMemo(() => {
    const cells = new Map<string, Hit[]>();
    view.hits.forEach((h) => cells.set(`${h.world}|${h.ring}`, [...(cells.get(`${h.world}|${h.ring}`) ?? []), h]));
    const out: { h: Hit; x: number; y: number }[] = [];
    cells.forEach((hs) => hs.forEach((h, i) => {
      const [x, y] = pt(ringR(h.ring), sectorStart(h.world) + (SECT * (i + 1)) / (hs.length + 1));
      out.push({ h, x, y });
    }));
    return out;
  }, [view, ringR]);

  const worldsHit = new Set(view.hits.map((h) => h.world));

  return (
    <svg viewBox="-330 -330 660 660" className="block h-auto w-full" role="img"
      aria-label={`World by ring radar: ${view.hits.length} consequences across ${worldsHit.size} worlds`}>
      <defs>
        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#fff" strokeOpacity="0.09" strokeWidth="2" />
        </pattern>
      </defs>
      <g key={`p${playKey}`}>
        {STACK.map((w) => {
          const a1 = sectorStart(w), a2 = a1 + SECT;
          const d = view.ripple[w];
          const isOrigin = w === origin;
          const empty = !worldsHit.has(w);
          const [lx, ly] = pt(R + 34, a1 + SECT / 2);
          const W = worldById(w);
          return (
            <g key={w}>
              <path d={arc(R0, R, a1, a2)} fill={color(w)} className="sector-in" style={{ animationDelay: `${0.2 + d * 0.35}s`, ["--to" as string]: isOrigin ? 0.3 : empty ? 0.04 : 0.14 }} />
              {empty && <path d={arc(R0, R, a1, a2)} fill="url(#hatch)" />}
              <path d={arc(R0, R, a1, a2)} fill="none" stroke={color(w)} strokeOpacity={isOrigin ? 1 : 0.5} strokeWidth={isOrigin ? 2.5 : 1} />
              {labels && (
                <>
                  <text x={lx} y={ly - 4} textAnchor="middle" fontSize={15}>{W.icon}</text>
                  <text x={lx} y={ly + 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#e8eaed" fontFamily="JetBrains Mono, monospace" style={{ letterSpacing: ".08em" }}>
                    {isOrigin ? "★ " : ""}{W.short.toUpperCase()}
                  </text>
                  <text x={lx} y={ly + 25} textAnchor="middle" fontSize={9} fill="rgba(232,234,237,.5)" fontFamily="JetBrains Mono, monospace">
                    {isOrigin ? "WHERE" : `ripple ${d}`}
                  </text>
                </>
              )}
            </g>
          );
        })}
        {view.rings.map((r, i) => (
          <circle key={r.key} r={R0 + band * (i + 1)} fill="none" stroke="#fff" strokeOpacity={i === n - 1 ? 0.35 : 0.12} strokeDasharray={i === n - 1 ? undefined : "1 4"} />
        ))}
        {labels && view.rings.map((r, i) => (
          <text key={r.key} x={5} y={-ringR(i) + 3} fontSize={8.5} fill="rgba(232,234,237,.55)" fontFamily="JetBrains Mono, monospace">{r.title}</text>
        ))}
        {[0, 1, 2].map((k) => (
          <circle key={k} r={R} fill="none" stroke="var(--accent)" strokeWidth={1.2} className="wave" style={{ animationDelay: `${k * 0.9}s` }} />
        ))}
        {placed.map(({ h, x, y }) => {
          if (shown && !shown.has(h.id)) return null;
          const on = selected === h.id;
          const other = h.ringKey === "other_actors";
          return (
            <g key={h.id} className="pop cursor-pointer" onClick={() => onSelect?.(on ? null : h.id)} onMouseEnter={() => onSelect?.(h.id)}>
              <line x1={0} y1={0} x2={x} y2={y} stroke={color(h.world)} strokeOpacity={on ? 0.8 : 0.18} strokeWidth={on ? 1.5 : 1} />
              {on && <circle cx={x} cy={y} r={17} fill={color(h.world)} fillOpacity={0.3} />}
              <circle cx={x} cy={y} r={on ? 10 : 8} fill={color(h.world)} stroke={other ? "var(--accent)" : "#07080d"} strokeWidth={other ? 2.5 : 2} />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff" fontFamily="JetBrains Mono, monospace">
                {other && h.status ? (h.tone === "pos" ? "✓" : h.tone === "neg" ? "✕" : "!") : GLYPH[h.tone]}
              </text>
              <title>{`${worldById(h.world).name} · ${view.rings[h.ring]?.title}: ${h.about}: ${h.text}`}</title>
            </g>
          );
        })}
        <circle r={R0 - 4} fill="#07080d" stroke="#fff" strokeWidth={1.5} />
        <circle r={6} cy={-18} fill="#fff" />
        <text y={4} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#fff" fontFamily="JetBrains Mono, monospace" style={{ letterSpacing: ".12em" }}>1 ACTOR</text>
        <text y={17} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="var(--accent)" fontFamily="JetBrains Mono, monospace" style={{ letterSpacing: ".12em" }}>1 ACTION</text>
      </g>
    </svg>
  );
}
