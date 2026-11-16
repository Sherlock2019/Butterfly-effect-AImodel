"use client";

import { useMemo, useState } from "react";
import type { Cascade, Evaluation } from "@/lib/cascade";
import type { Scenario } from "@/lib/catalog";
import { ACTION_ID, KIND_LABEL, OUTCOME_LABEL, evaluationsFrom, type GNode } from "@/lib/graph";
import { hexOf, worldById, type TopWorldId } from "@/lib/worlds";
import { KindBadge, ProvBadge, WorldChip } from "./shared";

const NW = 178, NH = 50, CW = 214, RH = 60, PAD = 14;

function layout(nodes: GNode[]) {
  const cols = new Map<number, GNode[]>();
  // engine nodes sit in their own column after the cascade, so the two sources never mix visually
  const maxCascade = Math.max(0, ...nodes.filter((n) => n.kind !== "engine").map((n) => n.depth));
  nodes.forEach((n) => {
    const c = n.kind === "engine" ? maxCascade + 1 : n.depth;
    cols.set(c, [...(cols.get(c) ?? []), n]);
  });
  const pos = new Map<string, { x: number; y: number }>();
  const rows = Math.max(1, ...[...cols.values()].map((v) => v.length));
  pos.set(ACTION_ID, { x: PAD, y: PAD + ((rows - 1) * RH) / 2 });
  [...cols.entries()].forEach(([c, list]) => list.forEach((n, i) => pos.set(n.id, { x: PAD + c * CW, y: PAD + i * RH })));
  const ncol = Math.max(1, ...cols.keys()) + 1;
  return { pos, w: PAD * 2 + ncol * CW, h: PAD * 2 + rows * RH, engineCol: nodes.some((n) => n.kind === "engine") ? maxCascade + 1 : null };
}

export function CascadePanel({ nodes, cascade, selected, onSelect, actionLabel, s, engineNote }: {
  nodes: GNode[]; cascade: Cascade | null; selected: string | null; onSelect: (id: string | null) => void;
  actionLabel: string; s: Scenario | null; engineNote: string | null;
}) {
  const [mode, setMode] = useState<"graph" | "list">("graph");
  const [step, setStep] = useState(0);
  const sel = nodes.find((n) => n.id === selected) ?? null;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    cascade?.evaluations.forEach((e) => (c[e.outcome] = (c[e.outcome] ?? 0) + 1));
    return c;
  }, [cascade]);
  const guided = s?.guided;
  const goStep = (k: number) => {
    if (!guided) return;
    const i = (k + guided.length) % guided.length;
    setStep(i);
    const n = nodes.filter((x) => x.world === guided[i].world && x.kind !== "engine").sort((a, b) => a.depth - b.depth)[0];
    onSelect(n ? n.id : null);
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Consequence cascade">
      <header className="flex flex-wrap items-center gap-2 px-3 pt-2">
        <h2 className="hud-label !text-[var(--accent)]">Consequence cascade</h2>
        <span className="action-chip !py-0">⚡ Action</span>
        <span className="mono faint text-[10px]">→ direct impact → possible consequences (any world to any world)</span>
        <div className="ml-auto flex items-center gap-1" role="tablist" aria-label="Cascade view">
          <button type="button" role="tab" aria-selected={mode === "graph"} className="hbtn !px-2 !py-0.5 !text-[9.5px]" aria-pressed={mode === "graph"} onClick={() => setMode("graph")}>Graph</button>
          <button type="button" role="tab" aria-selected={mode === "list"} className="hbtn !px-2 !py-0.5 !text-[9.5px]" aria-pressed={mode === "list"} onClick={() => setMode("list")}>List</button>
        </div>
      </header>

      {guided && (
        <div className="mx-3 mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border hairline bg-white/[.03] px-2 py-1">
          <span className="hud-label">Guided overview · bottom-up</span>
          <button type="button" className="hbtn !px-2 !py-0.5 !text-[10px]" onClick={() => goStep(step - 1)} aria-label="Previous step">‹</button>
          <span className="mono text-[10.5px]">{step + 1}/{guided.length}</span>
          <button type="button" className="hbtn !px-2 !py-0.5 !text-[10px]" onClick={() => goStep(step + 1)} aria-label="Next step">›</button>
          <WorldChip id={guided[step].world} />
          <span className="text-[11.5px]">{guided[step].text}</span>
          <span className="faint ml-auto text-[10px]">authored order for reading; the graph shows the real branching</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 px-3 py-1 text-[10px]">
        <Legend />
        {cascade && (
          <span className="mono faint ml-auto">
            evaluated {cascade.evaluations.length}: {Object.entries(counts).map(([k, v]) => `${OUTCOME_LABEL[k as Evaluation["outcome"]]} ${v}`).join(" · ")}
          </span>
        )}
      </div>
      {cascade?.truncated && <p className="mx-3 mb-1 rounded border border-[var(--warn)] px-2 py-1 text-[11px] text-[var(--warn)]">⚠ Cascade truncated: {cascade.truncated.reason}. It is not complete.</p>}
      {engineNote && <p className="mono faint mx-3 mb-1 text-[10.5px]">{engineNote}</p>}

      <div className="grid min-h-0 flex-1 gap-2 px-3 pb-2 lg:grid-cols-[1fr_320px]">
        <div className="scroll min-h-0 overflow-auto rounded-lg border hairline bg-black/20">
          {!nodes.length ? (
            <p className="faint p-4 text-[12px]">No consequences yet. Pick a scenario or analyze an action.</p>
          ) : mode === "graph" ? (
            <Graph nodes={nodes} selected={selected} onSelect={onSelect} actionLabel={actionLabel} />
          ) : (
            <List nodes={nodes} selected={selected} onSelect={onSelect} />
          )}
        </div>
        <Detail n={sel} nodes={nodes} cascade={cascade} onSelect={onSelect} />
      </div>
    </section>
  );
}

function Legend() {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1"><svg width="22" height="8" aria-hidden><line x1="0" y1="4" x2="22" y2="4" stroke="var(--action)" strokeWidth="3" /></svg><span className="dim">action</span></span>
      <span className="flex items-center gap-1"><svg width="22" height="8" aria-hidden><line x1="0" y1="4" x2="22" y2="4" stroke="#cfd3e0" strokeWidth="1.6" strokeDasharray="5 4" /></svg><span className="dim">illustrative link (prototype rule)</span></span>
      <span className="flex items-center gap-1"><svg width="22" height="8" aria-hidden><line x1="0" y1="4" x2="22" y2="4" stroke="#7ee2a8" strokeWidth="1.6" /></svg><span className="dim">recorded example</span></span>
      <span className="dim">● direct · ◌ possible · ▣ recorded</span>
    </span>
  );
}

function Graph({ nodes, selected, onSelect, actionLabel }: { nodes: GNode[]; selected: string | null; onSelect: (id: string) => void; actionLabel: string }) {
  const { pos, w, h, engineCol } = useMemo(() => layout(nodes), [nodes]);
  const sel = nodes.find((n) => n.id === selected);
  const near = new Set<string>(sel ? [sel.id, ...sel.parents, ...nodes.filter((n) => n.parents.includes(sel.id)).map((n) => n.id)] : []);
  const ap = pos.get(ACTION_ID)!;
  return (
    <svg width={w} height={h} role="img" aria-label="Cascade graph: arrows show the proposed direction of each possible consequence">
      <defs>
        <marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#cfd3e0" /></marker>
        <marker id="arR" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#ff3b3b" /></marker>
      </defs>
      {engineCol !== null && (
        <g>
          <rect x={PAD + engineCol * CW - 8} y={2} width={NW + 16} height={h - 4} rx={10} fill="rgba(126,226,168,.05)" stroke="rgba(126,226,168,.3)" strokeDasharray="3 4" />
          <text x={PAD + engineCol * CW} y={12} fontSize={9} fill="#7ee2a8" fontFamily="JetBrains Mono, monospace">RECORDED EXAMPLE · BY RING (NOT CHAINED)</text>
        </g>
      )}
      {nodes.flatMap((n) =>
        n.parents.map((p) => {
          const a = pos.get(p), b = pos.get(n.id);
          if (!a || !b) return null;
          const fromAction = p === ACTION_ID;
          const hot = sel && near.has(n.id) && (near.has(p) || p === ACTION_ID) && (n.id === sel.id || p === sel.id);
          const x1 = a.x + (fromAction ? 120 : NW), y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
          const engine = n.kind === "engine";
          return (
            <path key={`${p}-${n.id}`} d={`M${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2 - 2} ${y2}`} fill="none"
              stroke={fromAction && n.kind === "direct" ? "#ff3b3b" : engine ? "#7ee2a8" : "#cfd3e0"}
              strokeOpacity={sel ? (hot ? 1 : 0.18) : engine ? 0.35 : 0.65} strokeWidth={hot ? 2.4 : fromAction && n.kind === "direct" ? 2.4 : 1.4}
              strokeDasharray={n.kind === "possible" ? "5 4" : undefined} markerEnd={fromAction && n.kind === "direct" ? "url(#arR)" : "url(#ar)"} />
          );
        }),
      )}
      <g>
        <rect x={ap.x} y={ap.y} width={120} height={NH} rx={10} fill="rgba(255,59,59,.2)" stroke="#ff3b3b" strokeWidth={2} />
        <text x={ap.x + 10} y={ap.y + 19} fontSize={10.5} fill="#fff" fontFamily="JetBrains Mono, monospace" fontWeight={700}>⚡ ACTION</text>
        <text x={ap.x + 10} y={ap.y + 36} fontSize={10} fill="#ffd0d0">{actionLabel.length > 18 ? actionLabel.slice(0, 17) + "…" : actionLabel}</text>
      </g>
      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const wd = worldById(n.world);
        const on = selected === n.id;
        return (
          <g key={n.id} tabIndex={0} role="button" aria-label={`${wd.name}: ${n.entity} ${n.change}. ${KIND_LABEL[n.kind]}`} aria-pressed={on}
            onClick={() => onSelect(n.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(n.id); } }}
            style={{ cursor: "pointer", opacity: sel && !near.has(n.id) ? 0.4 : 1 }}>
            <rect x={p.x} y={p.y} width={NW} height={NH} rx={9} fill={on ? "rgba(0,212,255,.14)" : "rgba(14,16,24,.92)"}
              stroke={on ? "var(--accent)" : hexOf(n.world)} strokeWidth={on ? 2 : n.kind === "direct" ? 2 : 1.2} strokeDasharray={n.kind === "possible" ? "4 3" : undefined} />
            <rect x={p.x} y={p.y} width={5} height={NH} rx={2} fill={hexOf(n.world)} />
            <text x={p.x + 12} y={p.y + 15} fontSize={9.5} fill="rgba(232,234,237,.75)" fontFamily="JetBrains Mono, monospace">
              {n.kind === "direct" ? "●" : n.kind === "possible" ? "◌" : "▣"} {wd.icon} {wd.short.toUpperCase()}{n.scale && n.world === "physical" ? ` › ${n.scale}` : ""}
            </text>
            <text x={p.x + 12} y={p.y + 30} fontSize={11} fill="#e8eaed" fontWeight={600}>{n.entity.length > 26 ? n.entity.slice(0, 25) + "…" : n.entity}</text>
            <text x={p.x + 12} y={p.y + 43} fontSize={9.5} fill="rgba(232,234,237,.6)">{n.change.length > 31 ? n.change.slice(0, 30) + "…" : n.change}</text>
          </g>
        );
      })}
    </svg>
  );
}

function List({ nodes, selected, onSelect }: { nodes: GNode[]; selected: string | null; onSelect: (id: string) => void }) {
  const sorted = [...nodes].sort((a, b) => (a.kind === "engine" ? 1 : 0) - (b.kind === "engine" ? 1 : 0) || a.depth - b.depth);
  return (
    <ol className="flex flex-col gap-0.5 p-2">
      {sorted.map((n) => (
        <li key={n.id}>
          <button type="button" onClick={() => onSelect(n.id)} aria-pressed={selected === n.id}
            className={`flex w-full flex-wrap items-center gap-1.5 rounded px-2 py-1 text-left text-[12px] hover:bg-white/5 ${selected === n.id ? "bg-[var(--accent-dim)]" : ""}`}>
            <span className="mono faint w-10 text-[10px]">{n.kind === "engine" ? "rec" : `step ${n.depth}`}</span>
            <WorldChip id={n.world} />
            <span className="min-w-0 flex-1"><b>{n.entity}</b> <span className="dim">{n.change}</span></span>
            <KindBadge k={n.kind} />
            <ProvBadge p={n.provenance} />
          </button>
        </li>
      ))}
    </ol>
  );
}

function Detail({ n, nodes, cascade, onSelect }: { n: GNode | null; nodes: GNode[]; cascade: Cascade | null; onSelect: (id: string | null) => void }) {
  if (!n) return (
    <aside className="glass-flat scroll min-h-0 overflow-y-auto p-3 text-[12px]" aria-label="Consequence detail">
      <p className="hud-label mb-1">Detail</p>
      <p className="faint">Select a consequence to see what changed, why it might, what it assumes, where it came from and whether the engine calculated it.</p>
    </aside>
  );
  const parents = n.parents.map((p) => (p === ACTION_ID ? null : nodes.find((x) => x.id === p))).filter(Boolean) as GNode[];
  const children = nodes.filter((x) => x.parents.includes(n.id));
  const evals = evaluationsFrom(cascade, n.id);
  const notes = evals.filter((e) => e.outcome !== "effect" && e.outcome !== "converged");
  return (
    <aside className="glass-flat scroll min-h-0 overflow-y-auto p-3 text-[12px]" aria-label="Consequence detail" aria-live="polite">
      <div className="flex flex-wrap items-center gap-1.5">
        <WorldChip id={n.world} suffix={n.scale && n.world === "physical" ? <span className="faint"> › {n.scale}</span> : null} />
        <KindBadge k={n.kind} />
        <ProvBadge p={n.provenance} />
        <button type="button" className="faint ml-auto text-[11px]" onClick={() => onSelect(null)} aria-label="Close detail">✕</button>
      </div>
      <p className="hud-label mt-2">What changed?</p>
      <p><b>{n.entity}</b> {n.change}{n.legacy && <span className="faint"> (stored as world “{n.legacy}”, shown under Physical)</span>}</p>
      <p className="hud-label mt-2">Why might it change?</p>
      <p className="dim">{n.mechanism ?? (n.kind === "direct" ? "Stated by the scenario or the action itself." : "No explanation available.")}</p>
      {n.ruleId && (n.ruleId.startsWith("authored.")
        ? <p className="mono faint text-[10.5px]">written for this scenario (src/lib/enabled.ts) · authored, unvalidated · shown because this world is in the run</p>
        : <p className="mono faint text-[10.5px]">rule {n.ruleId} · prototype cascade rule (authored, unvalidated)</p>)}
      {n.ring && <p className="mono faint text-[10.5px]">ring {n.ring}{n.basis ? ` · basis ${n.basis}` : ""}{n.source ? ` · ${n.source}` : ""}</p>}
      <p className="hud-label mt-2">Came from</p>
      {parents.length ? (
        <ul>{parents.map((p) => <li key={p.id}><button type="button" className="text-left hover:underline" onClick={() => onSelect(p.id)}>{worldById(p.world).icon} <b>{p.entity}</b> <span className="dim">{p.change}</span></button></li>)}</ul>
      ) : <p className="dim">⚡ the action</p>}
      {children.length > 0 && (
        <>
          <p className="hud-label mt-2">May lead to</p>
          <ul>{children.map((c) => <li key={c.id}><button type="button" className="text-left hover:underline" onClick={() => onSelect(c.id)}>{worldById(c.world).icon} <b>{c.entity}</b> <span className="dim">{c.change}</span></button></li>)}</ul>
        </>
      )}
      <p className="hud-label mt-2">Assumptions</p>
      {n.assumptions.length ? <ul className="dim list-disc pl-4">{n.assumptions.map((a) => <li key={a}>{a}</li>)}</ul> : <p className="faint">None recorded.</p>}
      <p className="hud-label mt-2">Not known</p>
      {n.unknowns.length ? <ul className="dim list-disc pl-4">{n.unknowns.map((a) => <li key={a}>{a}</li>)}</ul> : <p className="faint">None recorded.</p>}
      <p className="hud-label mt-2">Confidence</p>
      <p className="faint">Not estimated: no model in this run supplies one.</p>
      <p className="hud-label mt-2">Where does it come from?</p>
      <p className="dim">{n.provenance === "engine" ? "A recorded example bundled in ACMP (ring and basis above); its world is a display mapping." : n.provenance === "prototype_rule" ? "No: derived by this console's prototype cascade rules from an authored scenario. Illustrative." : "No: written by hand for the scenario. Illustrative."}</p>
      {evals.length > 0 && (
        <>
          <p className="hud-label mt-2">Connections evaluated from here ({evals.length})</p>
          <ul className="flex flex-col gap-0.5">
            {evals.map((e, i) => (
              <li key={i} className="flex gap-1.5 text-[11px]">
                <span className={`mono w-20 flex-none text-[9.5px] uppercase ${e.outcome === "effect" ? "text-[var(--text)]" : e.outcome === "unknown" ? "text-[var(--amber)]" : "faint"}`}>{OUTCOME_LABEL[e.outcome]}</span>
                <span>{worldById(e.to as TopWorldId).icon} {worldById(e.to).short}: <span className="dim">{e.note}</span></span>
              </li>
            ))}
          </ul>
          {notes.length > 0 && <p className="faint mt-1 text-[10.5px]">Unknown and not-modeled rows are the limits of this cascade, not “no impact”.</p>}
        </>
      )}
    </aside>
  );
}
