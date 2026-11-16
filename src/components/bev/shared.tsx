"use client";

import type { ReactNode } from "react";
import { KIND_LABEL, PROV_LABEL, type GNode, type NodeKind } from "@/lib/graph";
import type { Provenance } from "@/lib/cascade";
import { color, worldById, type WorldId } from "@/lib/worlds";

export function ProvBadge({ p }: { p: Provenance }) {
  const cls = p === "engine" || p === "external" ? "prov-engine" : p === "unavailable" ? "prov-unk" : "prov-ill";
  return <span className={`prov ${cls}`}>{PROV_LABEL[p]}</span>;
}

export function KindBadge({ k }: { k: NodeKind }) {
  const icon = k === "direct" ? "●" : k === "possible" ? "◌" : "▣";
  return <span className="prov prov-unk !text-[var(--text-dim)]" title={KIND_LABEL[k]}>{icon} {KIND_LABEL[k]}</span>;
}

export function WorldChip({ id, active = false, suffix }: { id: WorldId | string; active?: boolean; suffix?: ReactNode }) {
  const w = worldById(id);
  return (
    <span className={`chip !gap-1 ${active ? "!text-[var(--text)]" : ""}`}>
      <span className="swatch" style={{ background: color(w.id) }} aria-hidden />
      <span aria-hidden>{w.icon}</span>
      {w.short}
      {suffix}
    </span>
  );
}

export function NodeLine({ n }: { n: GNode }) {
  return (
    <span>
      <b className="text-[var(--text)]">{n.entity}</b> <span className="dim">{n.change}</span>
    </span>
  );
}

/** The red action pulse, as an SVG group. Animated rings honour prefers-reduced-motion (globals.css). */
export function ActionPulse({ x, y, r = 46, label }: { x: number; y: number; r?: number; label?: string }) {
  return (
    <g aria-label={label ? `Action: ${label}` : "Action"} role="img">
      <circle className="redwave" cx={x} cy={y} r={r} fill="none" stroke="var(--action)" strokeWidth={3} />
      <circle className="redwave d2" cx={x} cy={y} r={r} fill="none" stroke="var(--action)" strokeWidth={2} />
      <circle className="redwave d3" cx={x} cy={y} r={r} fill="none" stroke="var(--action)" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={9} fill="var(--action)" stroke="#fff" strokeWidth={2} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fill="#fff" aria-hidden>⚡</text>
      {label && (() => {
        // below the pulse when it fits in a 390-high view, otherwise above
        const ly = y + r + 30 < 386 ? y + r + 6 : y - r - 26;
        const w = Math.min(300, 30 + Math.min(label.length, 34) * 6.6);
        const lx = Math.max(4, Math.min(x - w / 2, 716 - w));
        return (
          <g>
            <rect x={lx} y={ly} width={w} height={20} rx={10} fill="rgba(40,6,8,.92)" stroke="var(--action)" />
            <text x={lx + 10} y={ly + 14} fontSize={11} fill="#fff" fontFamily="JetBrains Mono, monospace" style={{ letterSpacing: ".04em" }}>
              ⚡ ACTION · {label.length > 34 ? label.slice(0, 33) + "…" : label}
            </text>
          </g>
        );
      })()}
    </g>
  );
}

/** A labelled hotspot in a world view. `state`: hit (the action lands here), effect (a consequence), idle. */
export function Spot({ x, y, icon, label, state = "idle", tint, sub }: { x: number; y: number; icon: string; label: string; state?: "hit" | "effect" | "idle"; tint: string; sub?: string }) {
  const stroke = state === "hit" ? "var(--action)" : state === "effect" ? tint : "rgba(255,255,255,.22)";
  return (
    <g>
      <rect x={x - 54} y={y - 30} width={108} height={sub ? 70 : 60} rx={12} fill={state === "idle" ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.07)"} stroke={stroke} strokeWidth={state === "idle" ? 1 : 2.2} strokeDasharray={state === "effect" ? "5 4" : undefined} />
      <text x={x} y={y - 2} textAnchor="middle" fontSize={22} aria-hidden>{icon}</text>
      <text x={x} y={y + 20} textAnchor="middle" fontSize={11} fill="#e8eaed" fontFamily="Inter, sans-serif" fontWeight={600}>{label}</text>
      {sub && <text x={x} y={y + 33} textAnchor="middle" fontSize={9} fill={state === "hit" ? "#ff8a8a" : "rgba(232,234,237,.6)"} fontFamily="JetBrains Mono, monospace">{sub}</text>}
    </g>
  );
}

export function Link2({ a, b, tint = "rgba(255,255,255,.25)", dashed = false, w = 1.5 }: { a: [number, number]; b: [number, number]; tint?: string; dashed?: boolean; w?: number }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={tint} strokeWidth={w} strokeDasharray={dashed ? "6 5" : undefined} />;
}

export const Illustrative = ({ children = "Illustrative view · not a simulation" }: { children?: ReactNode }) => (
  <span className="prov prov-ill">{children}</span>
);
