import type { ReactNode } from "react";
import { color, worldById, type Status, type WorldId } from "@/lib/worlds";

export function Mark({ size = 30 }: { size?: number }) {
  // A butterfly: two pairs of wings (four worlds' colours) around one point, the action.
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden className="flex-none">
      <g className="flap">
        <path d="M0 0 C -6 -16, -19 -15, -17 -4 C -16 2, -7 3, 0 0 Z" fill="var(--w-earth)" />
        <path d="M0 0 C 6 -16, 19 -15, 17 -4 C 16 2, 7 3, 0 0 Z" fill="var(--w-society)" />
        <path d="M0 0 C -5 4, -14 8, -11 14 C -8 18, -2 10, 0 0 Z" fill="var(--w-physical)" />
        <path d="M0 0 C 5 4, 14 8, 11 14 C 8 18, 2 10, 0 0 Z" fill="var(--w-behaviour)" />
      </g>
      <circle r="2.6" fill="#fff" />
    </svg>
  );
}

export function WorldTag({ id, full = false }: { id: WorldId; full?: boolean }) {
  const w = worldById(id);
  return (
    <span className="chip">
      <span className="swatch" style={{ background: color(id) }} />
      {w.icon} {full ? w.name : w.short}
    </span>
  );
}

const STATUS: Record<Status, { label: string; icon: string; c: string }> = {
  working: { label: "working", icon: "●", c: "var(--good)" },
  partly: { label: "partly", icon: "◐", c: "var(--warn)" },
  planned: { label: "planned", icon: "○", c: "var(--text-faint)" },
};
export function StatusPill({ s }: { s: Status }) {
  return <span className="chip"><span style={{ color: STATUS[s].c }}>{STATUS[s].icon}</span> {STATUS[s].label}</span>;
}
export const statusIcon = (s: Status) => <span style={{ color: STATUS[s].c }} title={STATUS[s].label}>{STATUS[s].icon}</span>;

const GOAL: Record<string, { label: string; icon: string; c: string }> = {
  advanced: { label: "advanced", icon: "✓", c: "var(--good)" },
  enabled: { label: "enabled", icon: "+", c: "var(--good)" },
  blocked: { label: "blocked", icon: "✕", c: "var(--bad)" },
  at_risk: { label: "at risk", icon: "!", c: "var(--warn)" },
  hindered: { label: "hindered", icon: "−", c: "var(--warn)" },
  unaffected: { label: "unaffected", icon: "·", c: "var(--text-faint)" },
};
export function GoalPill({ status }: { status: string }) {
  const g = GOAL[status] ?? { label: status.replace("_", " "), icon: "•", c: "var(--text-faint)" };
  return (
    <span className="chip !text-[var(--text)]">
      <span className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-black text-black" style={{ background: g.c }}>{g.icon}</span>
      {g.label.toUpperCase()}
    </span>
  );
}

const BASIS: Record<string, [string, string]> = {
  rule: ["§", "rule"], simulation: ["∿", "simulation"], observation: ["◉", "observed"], scenario_fact: ["✎", "script fact"],
  authored_demo: ["✍", "authored"], generated_inference: ["✦", "model-generated"], assumed: ["≈", "assumed"], unknown: ["?", "unknown"],
  relation: ["⇄", "goal check"], observed: ["◉", "observed"], inferred: ["≈", "inferred"],
};
export function Basis({ b }: { b?: string | null }) {
  if (!b) return null;
  const [i, l] = BASIS[b] ?? ["•", b];
  return <span className="chip" title="where this claim comes from">{i} {l}</span>;
}

export function Panel({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass p-4 ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="hud-label !text-[var(--accent)]">{title}</h3>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Plain({ children }: { children: ReactNode }) {
  return (
    <aside className="my-5 flex gap-3 rounded-xl border-l-2 px-4 py-3" style={{ borderColor: "var(--amber)", background: "rgba(240,166,60,.07)" }}>
      <span className="hud-label !text-[var(--amber)] whitespace-nowrap pt-0.5">In plain words</span>
      <div className="text-[15.5px] leading-relaxed">{children}</div>
    </aside>
  );
}

export function Eq({ children, plain, n }: { children: ReactNode; plain?: ReactNode; n?: string }) {
  return (
    <div className="my-6">
      <div className="glass-flat brackets flex items-center gap-4 px-5 py-4">
        <div className="serif flex-1 overflow-x-auto text-center text-[19px] italic">{children}</div>
        {n && <span className="mono faint text-xs">({n})</span>}
      </div>
      {plain && <p className="faint mt-2 text-center text-sm">{plain}</p>}
    </div>
  );
}

export function Stat({ value, label, sub }: { value: ReactNode; label: string; sub?: string }) {
  return (
    <div className="glass-flat brackets p-4">
      <p className="mono text-3xl font-semibold tabular-nums text-[var(--text)]">{value}</p>
      <p className="hud-label mt-1.5">{label}</p>
      {sub && <p className="faint mt-1 text-xs">{sub}</p>}
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return <div className="scanbar glass-flat hud-label py-12 text-center">loading {what}…</div>;
}

export function ErrorNote({ error }: { error: string }) {
  return <p className="glass-flat px-4 py-3 text-sm text-[var(--warn)]">Could not load the data ({error}). Run <code>./scripts/sync-data.sh</code>.</p>;
}
