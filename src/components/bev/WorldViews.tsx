"use client";

import { useCallback, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { isScene3D } from "@/lib/physics-scenes";

/** Babylon.js + Havok load only when the Physical view opens. */
const Physics3DLazy = dynamic(() => import("./Physics3D").then((m) => m.Physics3D), {
  ssr: false,
  loading: () => <p className="faint p-3 text-[12px]">Loading the 3D physics engine…</p>,
});
import type { WorldMark } from "@/lib/cascade";
import { SCALE_EXAMPLES, type Scenario } from "@/lib/catalog";
import { KIND_LABEL, type GNode } from "@/lib/graph";
import { SCALES, hexOf, scaleById, worldById, type Scale, type TopWorldId } from "@/lib/worlds";
import { ActionPulse, Illustrative, Link2, ProvBadge, Spot } from "./shared";

/* ---------- frame: header, status, visual, readable list ---------------------------------- */

const VIEW_TEXT: Record<TopWorldId, string> = {
  earth: "A globe with the place of the action. Overlays mark the data center, grid links and possible energy sources when the scenario has them.",
  government: "An event board of open policy questions. Each card lists possible outcomes without odds: nothing here has been decided.",
  society: "An economy board: event questions plus fictional market and price widgets. No live market data is connected.",
  business: "A company and supply-chain map: offices, factory, data center, suppliers, customers, costs and contracts.",
  media: "A news and social feed with fictional headlines, posts and videos, and how a story spreads between channels.",
  network: "A network map: internet backbone, WAN, Wi-Fi, satellite, submarine cable, routers and data centers.",
  digital: "A system architecture: users, applications and APIs, AI agents, servers, databases, identity and permissions.",
  behaviour: "An actor, their goal, the choices they had and the one taken; reactions are possibilities, never certain thoughts.",
  perception: "An observer and the incoming signals (light, sound, sensors), each marked known, assumed or unavailable.",
  physical: "Objects, forces and motion at human scale, with conceptual views of the molecular, atomic and quantum scales.",
};

export function ViewFrame({ world, scale, direct, mark, nodes, all, selected, onSelect, actionLabel, children, extra, s, overlay = false }: {
  world: TopWorldId; scale?: Scale; direct: boolean; mark: WorldMark | undefined; nodes: GNode[]; all: GNode[];
  selected: string | null; onSelect: (id: string) => void; actionLabel: string; children: ReactNode; extra?: ReactNode; s: Scenario | null;
  /** Over the globe: transparent middle, glass header and list. */
  overlay?: boolean;
}) {
  const w = worldById(world);
  const from = [...new Set(nodes.flatMap((n) => n.parents).map((p) => all.find((x) => x.id === p)?.world).filter((x): x is TopWorldId => !!x && x !== world))];
  const status = direct
    ? { t: "⚡ Direct impact · the action starts here", c: "text-[var(--action)]" }
    : nodes.length
      ? { t: `◌ Possible consequence${nodes.length > 1 ? "s" : ""} · ${nodes.length}`, c: "text-[var(--text)]" }
      : mark === "not_modeled"
        ? { t: "∅ Not modeled · no rule reaches this world yet", c: "faint" }
        : mark === "unknown"
          ? { t: "? Unknown · evaluated, but information is missing", c: "text-[var(--amber)]" }
          : { t: "No result available for this world in this run", c: "faint" };
  return (
    <section className={`flex h-full min-h-0 flex-col ${overlay ? "pointer-events-none" : ""}`} aria-label={`${w.name} view`}>
      <header className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 ${overlay ? "glass pointer-events-auto m-2 !pb-2" : ""}`}>
        <span className="text-2xl" aria-hidden>{w.icon}</span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight" style={{ color: hexOf(world) }}>
            {w.name}{world === "physical" && scale ? <span className="dim"> › {scaleById(scale).name}</span> : null}
          </h2>
          <p className={`mono text-[10.5px] uppercase tracking-[.12em] ${status.c}`}>{status.t}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {from.length > 0 && <span className="mono faint text-[10px]">arrives from: {from.map((f) => `${worldById(f).icon} ${worldById(f).short}`).join(" · ")}</span>}
          {s ? <Illustrative>Illustrative scenario</Illustrative> : <Illustrative>Illustrative view</Illustrative>}
        </div>
      </header>
      {extra}
      <div className="relative min-h-0 flex-1 px-3 py-2">{children}</div>
      <div className={`grid gap-2 px-4 py-2 md:grid-cols-[1.4fr_1fr] ${overlay ? "glass pointer-events-auto m-2" : "border-t hairline"}`}>
        <div>
          <p className="hud-label mb-1">In this world {direct && <span className="action-chip ml-1 !py-0">⚡ {actionLabel.length > 40 ? actionLabel.slice(0, 39) + "…" : actionLabel}</span>}</p>
          {nodes.length ? (
            <ul className="scroll flex max-h-[96px] flex-col gap-0.5">
              {nodes.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => onSelect(n.id)} className={`flex w-full items-start gap-2 rounded px-1.5 py-0.5 text-left text-[12px] hover:bg-white/5 ${selected === n.id ? "bg-[var(--accent-dim)]" : ""}`}>
                    <span className="mono faint hidden w-24 flex-none text-[9.5px] uppercase sm:block">{KIND_LABEL[n.kind]}</span>
                    <span className="flex-1"><b>{n.entity}</b> <span className="dim">{n.change}</span>{n.legacy && <span className="faint"> (stored as “{n.legacy}”)</span>}</span>
                    <ProvBadge p={n.provenance} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="faint text-[11.5px]">No result available. Nothing is invented for a world the run did not reach.</p>}
        </div>
        <p className="faint text-[11px] leading-snug"><b className="dim">What you see.</b> {VIEW_TEXT[world]} {w.status !== "working" && <>Engine status: <i>{w.today}</i>.</>}</p>
      </div>
    </section>
  );
}

/* ---------- hotspot views (digital, network, business) ------------------------------------- */

interface SpotDef { id: string; x: number; y: number; icon: string; label: string; keys: string[] }
const SPOTS: Partial<Record<TopWorldId, { spots: SpotDef[]; links: [string, string][]; dashed?: [string, string][] }>> = {
  digital: {
    spots: [
      { id: "users", x: 90, y: 80, icon: "👥", label: "Users", keys: ["user", "customer"] },
      { id: "app", x: 260, y: 80, icon: "📱", label: "Apps & APIs", keys: ["app", "api", "service"] },
      { id: "agent", x: 260, y: 270, icon: "🤖", label: "AI agent", keys: ["agent", "ai workload", "ai service", "ai application"] },
      { id: "payments", x: 450, y: 175, icon: "💳", label: "Payment system", keys: ["payment"] },
      { id: "servers", x: 450, y: 330, icon: "🗄️", label: "Servers & cloud", keys: ["server", "cloud", "workload", "capacity", "online service"] },
      { id: "db", x: 630, y: 80, icon: "🛢️", label: "Database", keys: ["database", "record", "inventory", "order system"] },
      { id: "iam", x: 630, y: 270, icon: "🔐", label: "Identity & permissions", keys: ["permission", "access", "identity"] },
    ],
    links: [["users", "app"], ["app", "payments"], ["agent", "payments"], ["payments", "db"], ["payments", "iam"], ["payments", "servers"], ["agent", "iam"]],
  },
  network: {
    spots: [
      { id: "internet", x: 360, y: 60, icon: "🌐", label: "Internet backbone", keys: ["internet", "backbone"] },
      { id: "wan", x: 120, y: 150, icon: "🛰️", label: "WAN", keys: ["wan"] },
      { id: "routerA", x: 270, y: 200, icon: "🔀", label: "Router A", keys: ["router"] },
      { id: "routerB", x: 470, y: 200, icon: "🔀", label: "Router B", keys: [] },
      { id: "sat", x: 620, y: 70, icon: "📡", label: "Satellite link", keys: ["satellite", "alternate"] },
      { id: "wifi", x: 110, y: 320, icon: "📶", label: "Wi-Fi", keys: ["wi-fi", "wifi"] },
      { id: "cable", x: 370, y: 330, icon: "〰️", label: "Submarine cable", keys: ["cable route", "submarine"] },
      { id: "dc", x: 620, y: 320, icon: "🏢", label: "Data center", keys: ["data center", "data centre"] },
    ],
    links: [["internet", "routerA"], ["internet", "routerB"], ["wan", "routerA"], ["wifi", "routerA"], ["routerA", "cable"], ["cable", "routerB"], ["routerB", "dc"]],
    dashed: [["sat", "internet"], ["sat", "dc"]],
  },
  business: {
    spots: [
      { id: "hq", x: 110, y: 80, icon: "🏢", label: "Company office", keys: ["company", "companies", "bank", "operator", "provider"] },
      { id: "factory", x: 330, y: 80, icon: "🏭", label: "Factory", keys: ["factory"] },
      { id: "supplier", x: 560, y: 80, icon: "🚚", label: "Supplier", keys: ["supplier", "glazier", "contractor", "hardware supplier", "repair"] },
      { id: "dc", x: 110, y: 290, icon: "🗄️", label: "Data center", keys: ["data-center", "data center", "operator"] },
      { id: "energy", x: 330, y: 290, icon: "⚡", label: "Energy provider", keys: ["energy provider", "generation"] },
      { id: "customers", x: 560, y: 290, icon: "🛒", label: "Customers", keys: ["customer", "dependent", "relying", "depending"] },
      { id: "costs", x: 330, y: 185, icon: "📑", label: "Costs & contracts", keys: ["cost", "contract", "compliance", "operations", "payment operations"] },
    ],
    links: [["supplier", "factory"], ["factory", "hq"], ["hq", "costs"], ["dc", "costs"], ["energy", "dc"], ["costs", "customers"], ["factory", "costs"]],
  },
};

function SpotsVisual({ world, nodes, direct, hit, actionLabel }: { world: TopWorldId; nodes: GNode[]; direct: boolean; hit?: string; actionLabel: string }) {
  const def = SPOTS[world]!;
  const tint = hexOf(world);
  // match on the affected entity only (an actor named in the change text is not "affected")
  const text = nodes.map((n) => n.entity.toLowerCase());
  const stateOf = (s: SpotDef): "hit" | "effect" | "idle" =>
    direct && s.id === hit ? "hit" : s.keys.some((k) => text.some((t) => t.includes(k))) ? "effect" : "idle";
  const pos = (id: string) => def.spots.find((s) => s.id === id)!;
  const hitSpot = direct ? def.spots.find((s) => s.id === hit) ?? (nodes.length ? def.spots.find((s) => stateOf(s) === "effect") : undefined) ?? def.spots[0] : undefined;
  return (
    <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label={`${worldById(world).name} diagram`}>
      {def.links.map(([a, b]) => <Link2 key={a + b} a={[pos(a).x, pos(a).y]} b={[pos(b).x, pos(b).y]} />)}
      {def.dashed?.map(([a, b]) => <Link2 key={a + b} a={[pos(a).x, pos(a).y]} b={[pos(b).x, pos(b).y]} dashed tint="rgba(255,255,255,.3)" />)}
      {def.spots.map((s) => {
        const st = hitSpot && s.id === hitSpot.id ? "hit" : stateOf(s);
        return <Spot key={s.id} {...s} tint={tint} state={st} sub={st === "hit" ? "action lands here" : st === "effect" ? "possibly affected" : undefined} />;
      })}
      {hitSpot && <ActionPulse x={hitSpot.x} y={hitSpot.y} r={58} label={actionLabel} />}
    </svg>
  );
}

/* ---------- behaviour ----------------------------------------------------------------------- */

function BehaviourVisual({ s, nodes, direct, actionLabel }: { s: Scenario | null; nodes: GNode[]; direct: boolean; actionLabel: string }) {
  const b = s?.stage?.behaviour ?? {
    actor: nodes[0]?.entity ?? "Actor", goal: "not stated", choices: nodes.length ? nodes.map((n) => n.change).slice(0, 3) : ["—"], chosen: 0,
  };
  const tint = hexOf("behaviour");
  const ys = b.choices.map((_, i) => 90 + i * (240 / Math.max(1, b.choices.length - 1 || 1)));
  return (
    <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label="Actor, goal and choices">
      <circle cx={120} cy={190} r={48} fill="rgba(213,81,129,.15)" stroke={tint} strokeWidth={2} />
      <text x={120} y={200} textAnchor="middle" fontSize={40} aria-hidden>{/driver/i.test(b.actor) ? "🧑‍✈️" : /cat|dog|animal/i.test(b.actor) ? "🐈" : "🧍"}</text>
      <text x={120} y={262} textAnchor="middle" fontSize={13} fill="#e8eaed" fontWeight={700}>{b.actor}</text>
      <rect x={40} y={20} width={300} height={34} rx={8} fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.2)" />
      <text x={52} y={42} fontSize={12} fill="#e8eaed">🎯 Goal: {b.goal}</text>
      {b.choices.map((c, i) => {
        const chosen = i === b.chosen;
        return (
          <g key={c}>
            <path d={`M170 190 C 260 190, 280 ${ys[i]}, 360 ${ys[i]}`} fill="none" stroke={chosen ? (direct ? "var(--action)" : tint) : "rgba(255,255,255,.25)"} strokeWidth={chosen ? 3 : 1.5} strokeDasharray={chosen ? undefined : "5 5"} />
            <rect x={360} y={ys[i] - 18} width={300} height={36} rx={9} fill={chosen ? "rgba(255,59,59,.12)" : "rgba(255,255,255,.03)"} stroke={chosen ? (direct ? "var(--action)" : tint) : "rgba(255,255,255,.18)"} />
            <text x={374} y={ys[i] + 5} fontSize={12.5} fill="#e8eaed">{chosen ? "▶ " : "○ "}{c.length > 40 ? c.slice(0, 39) + "…" : c}</text>
            {chosen && <text x={650} y={ys[i] + 5} textAnchor="end" fontSize={9.5} fill="#ff8a8a" fontFamily="JetBrains Mono, monospace">{direct ? "CHOSEN" : "POSSIBLE"}</text>}
          </g>
        );
      })}
      {direct && <ActionPulse x={120} y={190} r={64} label={actionLabel} />}
      <text x={360} y={375} fontSize={10.5} fill="rgba(232,234,237,.55)">Thoughts and future behaviour are never certain: choices shown are the scenario&apos;s, reactions are possibilities.</text>
    </svg>
  );
}

/* ---------- perception ---------------------------------------------------------------------- */

function PerceptionVisual({ s, nodes, direct, actionLabel }: { s: Scenario | null; nodes: GNode[]; direct: boolean; actionLabel: string }) {
  const p = s?.stage?.perception ?? {
    observer: nodes[0]?.entity ?? "Observer",
    signals: nodes.length ? nodes.map((n) => ({ kind: /sensor/i.test(n.entity) ? "sensor" as const : /hear|alarm|sound/i.test(n.change) ? "sound" as const : "light" as const, label: n.change, status: n.kind === "possible" ? "assumed" as const : "known" as const })) : [{ kind: "light" as const, label: "no signal recorded", status: "unavailable" as const }],
  };
  const tint = hexOf("perception");
  const icon = { light: "💡", sound: "🔊", sensor: "📟" } as const;
  return (
    <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label="Observer and incoming signals">
      <circle cx={560} cy={190} r={56} fill="rgba(12,163,12,.12)" stroke={tint} strokeWidth={2} />
      <text x={560} y={182} textAnchor="middle" fontSize={34} aria-hidden>👁️</text>
      <text x={560} y={214} textAnchor="middle" fontSize={22} aria-hidden>👂</text>
      <text x={560} y={120} textAnchor="middle" fontSize={13} fill="#e8eaed" fontWeight={700}>{p.observer.length > 34 ? p.observer.slice(0, 33) + "…" : p.observer}</text>
      {p.signals.slice(0, 4).map((sg, i) => {
        const y = 70 + i * 85;
        const dash = sg.status === "known" ? undefined : sg.status === "assumed" ? "6 5" : "2 6";
        return (
          <g key={i}>
            {[0, 1, 2].map((k) => <path key={k} d={`M${200 + k * 70} ${y - 14} q 12 14 0 28`} fill="none" stroke={tint} strokeWidth={2} strokeDasharray={dash} opacity={0.4 + k * 0.2} />)}
            <line x1={200} y1={y} x2={500} y2={190} stroke={tint} strokeWidth={1.4} strokeDasharray={dash} opacity={0.6} />
            <rect x={20} y={y - 22} width={170} height={44} rx={10} fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.2)" />
            <text x={34} y={y - 2} fontSize={18} aria-hidden>{icon[sg.kind]}</text>
            <text x={60} y={y - 3} fontSize={11.5} fill="#e8eaed">{sg.label.length > 22 ? sg.label.slice(0, 21) + "…" : sg.label}</text>
            <text x={60} y={y + 12} fontSize={9.5} fill={sg.status === "known" ? "#7ee2a8" : sg.status === "assumed" ? "#f0a63c" : "rgba(232,234,237,.5)"} fontFamily="JetBrains Mono, monospace">{sg.status.toUpperCase()}</text>
          </g>
        );
      })}
      {direct && <ActionPulse x={560} y={190} r={70} label={actionLabel} />}
      <text x={20} y={380} fontSize={10.5} fill="rgba(232,234,237,.55)">Solid = known (stated) · dashed = assumed · dotted = unavailable</text>
    </svg>
  );
}

/* ---------- physical: four scales ------------------------------------------------------------ */

function HumanScene({ scene, direct, actionLabel, hasEffects }: { scene: string; direct: boolean; actionLabel: string; hasEffects: boolean }) {
  const tint = hexOf("physical");
  if (scene === "ball_window")
    return (
      <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label="A child kicks a ball toward a window">
        <rect x={0} y={300} width={720} height={90} fill="rgba(25,158,112,.12)" />
        <text x={110} y={290} fontSize={64} aria-hidden>🧒</text>
        <path d="M190 270 Q 380 60 560 170" fill="none" stroke={tint} strokeWidth={2} strokeDasharray="6 6" />
        <text x={300} y={118} fontSize={30} aria-hidden>⚽</text>
        <rect x={540} y={120} width={130} height={110} fill="rgba(57,135,229,.15)" stroke="#9fb4d8" strokeWidth={3} />
        <path d="M560 170 l 22 -18 l 10 26 l 18 -30 M560 170 l -6 30 l 20 12" stroke="#fff" strokeWidth={1.6} fill="none" opacity={direct || hasEffects ? 1 : 0.2} />
        <text x={605} y={252} textAnchor="middle" fontSize={11} fill="#e8eaed">window · single glazing</text>
        <text x={330} y={150} fontSize={10.5} fill="rgba(232,234,237,.6)" fontFamily="JetBrains Mono, monospace">≈ trajectory (illustrative)</text>
        {direct && <ActionPulse x={560} y={170} r={60} label={actionLabel} />}
      </svg>
    );
  if (scene === "lightning" || scene === "pump")
    return (
      <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label={scene === "lightning" ? "Storm, lightning, transformer and data center" : "Cooling pump, server racks and temperature sensor"}>
        {scene === "lightning" && <><text x={60} y={70} fontSize={52} aria-hidden>⛈️</text><path d="M110 80 L 90 150 L 120 150 L 100 225" stroke="#ffe066" strokeWidth={4} fill="none" /></>}
        <Spot x={110} y={270} icon={scene === "lightning" ? "🔌" : "🌀"} label={scene === "lightning" ? "Transformer" : "Cooling pump"} tint={tint} state={direct ? "hit" : "effect"} sub={scene === "lightning" ? "damaged" : "switched off"} />
        <Spot x={330} y={200} icon="🗄️" label="Server hall" tint={tint} state={hasEffects ? "effect" : "idle"} sub={scene === "lightning" ? "may lose power" : "temperature rising"} />
        <Spot x={330} y={330} icon="🔋" label="Backup generators" tint={tint} state="idle" sub={scene === "lightning" ? "may start" : "status unknown"} />
        <Spot x={540} y={110} icon="📟" label="Sensors & alarm" tint={hexOf("perception")} state="idle" sub="detect (perception)" />
        <Spot x={540} y={250} icon="🧑‍🔧" label="Technician" tint={hexOf("behaviour")} state="idle" sub="responds (behaviour)" />
        <Spot x={640} y={350} icon="🌐" label="Network links" tint={hexOf("network")} state="idle" sub="(network)" />
        <Link2 a={[164, 262]} b={[276, 205]} tint={tint} />
        <Link2 a={[330, 230]} b={[330, 300]} tint={tint} dashed />
        <Link2 a={[384, 190]} b={[486, 120]} tint="rgba(255,255,255,.25)" dashed />
        <Link2 a={[384, 210]} b={[486, 250]} tint="rgba(255,255,255,.25)" dashed />
        <Link2 a={[384, 215]} b={[600, 340]} tint="rgba(255,255,255,.25)" dashed />
        {direct && <ActionPulse x={110} y={270} r={62} label={actionLabel} />}
      </svg>
    );
  if (scene === "driver")
    return (
      <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label="A car passes a road-closure sign">
        <rect x={0} y={230} width={720} height={90} fill="rgba(255,255,255,.06)" />
        <line x1={0} y1={275} x2={720} y2={275} stroke="rgba(255,255,255,.4)" strokeDasharray="22 16" />
        <text x={380} y={220} fontSize={46} aria-hidden>⛔</text>
        <text x={372} y={168} fontSize={11} fill="#e8eaed">ROAD CLOSED</text>
        <text x={150} y={292} fontSize={54} aria-hidden>🚗</text>
        <path d="M230 270 L 600 270" stroke={tint} strokeWidth={2} strokeDasharray="6 6" />
        <text x={560} y={226} fontSize={34} aria-hidden>🚧</text>
        <text x={520} y={350} fontSize={11} fill="rgba(232,234,237,.6)">obstruction ahead · no incident assumed</text>
        {direct && <ActionPulse x={190} y={270} r={56} label={actionLabel} />}
      </svg>
    );
  return (
    <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label="Objects and forces">
      <rect x={0} y={300} width={720} height={90} fill="rgba(144,133,233,.08)" />
      <rect x={260} y={210} width={200} height={90} rx={6} fill="rgba(144,133,233,.15)" stroke={tint} />
      <text x={360} y={262} textAnchor="middle" fontSize={12} fill="#e8eaed">object</text>
      <path d="M150 255 L 250 255" stroke={tint} strokeWidth={3} markerEnd="url(#arr)" />
      <text x={150} y={240} fontSize={11} fill="#e8eaed">force</text>
      <path d="M360 305 L 360 365" stroke={tint} strokeWidth={2} strokeDasharray="4 4" />
      <text x={370} y={350} fontSize={11} fill="#e8eaed">gravity</text>
      <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill={tint} /></marker></defs>
      {direct && <ActionPulse x={250} y={255} r={56} label={actionLabel} />}
    </svg>
  );
}

function MolecularScene() {
  const mols = [[150, 140], [300, 220], [460, 130], [580, 250], [230, 320], [420, 320]];
  return (
    <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label="Conceptual water molecules">
      {mols.map(([x, y], i) => (
        <g key={i} transform={`rotate(${i * 37} ${x} ${y})`}>
          <line x1={x} y1={y} x2={x - 34} y2={y + 24} stroke="#cfd6e6" strokeWidth={4} />
          <line x1={x} y1={y} x2={x + 34} y2={y + 24} stroke="#cfd6e6" strokeWidth={4} />
          <circle cx={x} cy={y} r={22} fill="#e65a5a" /><text x={x} y={y + 5} textAnchor="middle" fontSize={13} fill="#fff" fontWeight={700}>O</text>
          <circle cx={x - 34} cy={y + 24} r={13} fill="#e8eaed" /><text x={x - 34} y={y + 28} textAnchor="middle" fontSize={10} fill="#111">H</text>
          <circle cx={x + 34} cy={y + 24} r={13} fill="#e8eaed" /><text x={x + 34} y={y + 28} textAnchor="middle" fontSize={10} fill="#111">H</text>
        </g>
      ))}
      <line x1={172} y1={150} x2={278} y2={212} stroke="#7aa7e8" strokeDasharray="3 5" />
      <text x={200} y={196} fontSize={10} fill="#7aa7e8">hydrogen bond</text>
    </svg>
  );
}

function AtomicScene() {
  const cells = Array.from({ length: 5 * 9 }, (_, i) => [90 + (i % 9) * 68, 80 + Math.floor(i / 9) * 62]);
  return (
    <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label="Educational atomic lattice">
      {cells.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={20} fill="rgba(144,133,233,.12)" stroke="rgba(144,133,233,.5)" />
          <circle cx={x} cy={y} r={5} fill="#c9c2ff" />
        </g>
      ))}
      <text x={360} y={380} textAnchor="middle" fontSize={10.5} fill="rgba(232,234,237,.6)">nucleus (dot) inside an electron cloud (shaded): educational, not to scale</text>
    </svg>
  );
}

function QuantumScene() {
  const pts = Array.from({ length: 141 }, (_, i) => {
    const x = -3.5 + (i / 140) * 7;
    const psi2 = Math.exp(-x * x) * Math.pow(Math.cos(2.2 * x), 2);
    return [80 + (i / 140) * 560, 320 - psi2 * 230];
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 720 390" className="h-full w-full" role="img" aria-label="Conceptual probability density">
      <line x1={80} y1={320} x2={650} y2={320} stroke="rgba(255,255,255,.35)" />
      <path d={`${d} L640 320 L80 320 Z`} fill="rgba(144,133,233,.22)" />
      <path d={d} fill="none" stroke="#c9c2ff" strokeWidth={2} />
      <text x={86} y={60} fontSize={12} fill="#e8eaed">|ψ(x)|² · probability of finding the particle at x</text>
      <text x={650} y={340} textAnchor="end" fontSize={11} fill="rgba(232,234,237,.6)">position x</text>
      <text x={360} y={375} textAnchor="middle" fontSize={10.5} fill="rgba(232,234,237,.6)">a distribution, not an orbit and not a picture of a particle</text>
    </svg>
  );
}

export function PhysicalVisual({ s, scale, onScale, direct, actionLabel, nodes, threeDAbove = false }: { s: Scenario | null; scale: Scale; onScale: (sc: Scale) => void; direct: boolean; actionLabel: string; nodes: GNode[]; threeDAbove?: boolean }) {
  const ex = SCALE_EXAMPLES[scale];
  const [pickedMode, setMode] = useState<"3d" | "2d">("3d");
  // the Action · 3D panel above already runs this scene: one 3D engine at a time, so show the schematic here
  const mode = threeDAbove ? "2d" : pickedMode;
  const onFail = useCallback(() => setMode("2d"), []);
  const rawScene = s?.stage?.scene;
  const scene3d = isScene3D(rawScene) ? rawScene : "generic";
  // Quantum scale: the double-slit experiment in 3D (detector off / on) or the conceptual drawing
  const [quantum, setQuantum] = useState<"slit" | "which_path" | "concept">("slit");
  const [slitFailed, setSlitFailed] = useState(false);
  const onSlitFail = useCallback(() => setSlitFailed(true), []);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1" role="tablist" aria-label="Physical scale">
        {SCALES.map((sc) => (
          <button key={sc.id} type="button" role="tab" aria-selected={scale === sc.id} className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={scale === sc.id} onClick={() => onScale(sc.id)}>
            {sc.icon} {sc.name}
          </button>
        ))}
        {scale !== "human" && !(scale === "quantum" && quantum !== "concept" && !slitFailed) && <Illustrative>Conceptual · not simulated</Illustrative>}
        {scale === "quantum" && (
          <span className="ml-auto flex gap-1" role="group" aria-label="Quantum view">
            <button type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={quantum === "slit"} onClick={() => setQuantum("slit")}>Double slit</button>
            <button type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={quantum === "which_path"} onClick={() => setQuantum("which_path")}>+ which-path detector</button>
            <button type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={quantum === "concept"} onClick={() => setQuantum("concept")}>Concept</button>
          </span>
        )}
        {direct && scale !== "human" && <span className="action-chip">⚡ {actionLabel.slice(0, 44)} · starts at this scale</span>}
        {scale === "human" && threeDAbove && <span className="faint ml-auto text-[10.5px]">3D simulation: in the Action · 3D panel above</span>}
        {scale === "human" && !threeDAbove && (
          <span className="ml-auto flex gap-1" role="group" aria-label="Physical view mode">
            <button type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={mode === "3d"} onClick={() => setMode("3d")}>3D simulation</button>
            <button type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={mode === "2d"} onClick={() => setMode("2d")}>Schematic</button>
          </span>
        )}
      </div>
      <div className={`flex-1 ${scale === "quantum" && quantum !== "concept" && !slitFailed ? "min-h-[300px]" : "min-h-0"}`}>
        {scale === "human" && mode === "3d" && <Physics3DLazy key={`${s?.id ?? "none"}-${scene3d}`} scene={scene3d} onFail={onFail} />}
        {scale === "human" && mode === "2d" && <HumanScene scene={s?.stage?.scene ?? "generic"} direct={direct} actionLabel={actionLabel} hasEffects={nodes.length > 0} />}
        {scale === "molecular" && <MolecularScene />}
        {scale === "atomic" && <AtomicScene />}
        {scale === "quantum" && (quantum === "concept" || slitFailed) && <QuantumScene />}
        {scale === "quantum" && quantum !== "concept" && !slitFailed && <Physics3DLazy key={`slit-${quantum}`} scene="double_slit" variant={quantum} onFail={onSlitFail} />}
      </div>
      <p className="faint px-1 text-[11px]">
        {scale === "human"
          ? mode === "3d"
            ? <><b className="dim">Human scale · 3D.</b> Rigid-body physics (Havok) rendered with Babylon.js: gravity, collisions, friction, impulses and breakage are computed; masses, speeds and thresholds are assumed. Illustrative, not a prediction.</>
            : <><b className="dim">Human scale · schematic.</b> The scenario&apos;s objects, drawn, not simulated.</>
          : scale === "quantum" && quantum !== "concept" && !slitFailed
            ? <><b className="dim">Quantum · double-slit experiment.</b> Electrons are sent one at a time; each lands at one spot, sampled from the far-field formula (cos² · sinc²). Fringes build up dot by dot. With the which-path detector on, the interference term vanishes and one broad band remains. The rings are an illustration of the wave, not a simulation of it.</>
            : <><b className="dim">{ex.title}.</b> {ex.text}</>}
      </p>
    </div>
  );
}

export function GenericVisual({ world, nodes, direct, hit, actionLabel, s }: { world: TopWorldId; nodes: GNode[]; direct: boolean; hit?: string; actionLabel: string; s: Scenario | null }) {
  if (SPOTS[world]) return <SpotsVisual world={world} nodes={nodes} direct={direct} hit={hit} actionLabel={actionLabel} />;
  if (world === "behaviour") return <BehaviourVisual s={s} nodes={nodes} direct={direct} actionLabel={actionLabel} />;
  if (world === "perception") return <PerceptionVisual s={s} nodes={nodes} direct={direct} actionLabel={actionLabel} />;
  return null;
}
