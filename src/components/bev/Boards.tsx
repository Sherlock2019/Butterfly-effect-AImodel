"use client";

import { useMemo, useState } from "react";
import { BIZ_FILTERS, CARDS, ECON_FILTERS, FICTIONAL, GOV_FILTERS, NO_PROBABILITY, SECTORS, fictionalSeries, type EventCard, type Series } from "@/lib/boards";
import type { Scenario } from "@/lib/catalog";
import type { GNode } from "@/lib/graph";
import { hexOf } from "@/lib/worlds";
import { Illustrative } from "./shared";

/* ---------- government & economy: event cards ---------------------------------------------- */

function Cards({ world, s, nodes, onSelectNode }: { world: "government" | "society" | "business"; s: Scenario | null; nodes: GNode[]; onSelectNode: (id: string) => void }) {
  // only the questions about THIS scenario (all of them when no scenario is selected)
  const pool = CARDS.filter((c) => c.world === world && (!s || c.scenarios.includes(s.id)));
  const filters = (world === "government" ? GOV_FILTERS : world === "business" ? BIZ_FILTERS : ECON_FILTERS).filter((x) => x === "All" || pool.some((c) => c.category === x));
  const [f, setF] = useState("All");
  const [open, setOpen] = useState<string | null>(null);
  const list = pool.filter((c) => f === "All" || c.category === f);
  const card = list.find((c) => c.id === open) ?? null;
  if (!pool.length) return <p className="faint text-[12px]">No event question for this scenario in this world. Its consequences here are listed below.</p>;
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter event cards">
        {filters.map((x) => <button key={x} type="button" className="hbtn !px-2 !py-0.5 !text-[9.5px]" aria-pressed={f === x} onClick={() => setF(x)}>{x}</button>)}
        <span className="prov prov-ill ml-auto">{NO_PROBABILITY}</span>
      </div>
      <div className="grid min-h-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => <CardView key={c.id} c={c} rel={!!s && c.scenarios.includes(s.id)} open={open === c.id} onOpen={() => setOpen(open === c.id ? null : c.id)} />)}
      </div>
      {card && <CardDetail c={card} nodes={nodes} onSelectNode={onSelectNode} />}
    </div>
  );
}

function CardView({ c, rel, open, onOpen }: { c: EventCard; rel: boolean; open: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-expanded={open}
      className={`glass-flat flex flex-col gap-1.5 p-2.5 text-left transition-colors hover:border-[var(--accent)] ${open ? "!border-[var(--accent)]" : ""}`}>
      <span className="flex items-center gap-1.5">
        <span className="chip !py-0 !text-[9.5px]">{c.category}</span>
        {rel && <span className="mono text-[9.5px] text-[var(--accent)]">● this scenario</span>}
      </span>
      <span className="text-[12.5px] font-semibold leading-snug">{c.question}</span>
      <ul className="flex flex-col gap-0.5">
        {c.outcomes.map((o) => (
          <li key={o} className="flex items-center justify-between gap-2 rounded bg-white/[.03] px-2 py-0.5 text-[11px]">
            <span className="dim">{o}</span>
            <span className="mono faint whitespace-nowrap text-[9.5px]">not estimated</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function CardDetail({ c, nodes, onSelectNode }: { c: EventCard; nodes: GNode[]; onSelectNode: (id: string) => void }) {
  return (
    <div className="glass-flat p-3 text-[12px]" role="region" aria-label="Event explanation">
      <p className="font-semibold">{c.question}</p>
      <p className="faint mt-1 text-[11px]">Possible outcomes, none decided and none given odds: nothing in this repository estimates a probability for them.</p>
      <p className="hud-label mt-2">Assumptions</p>
      <ul className="dim list-disc pl-4">{c.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
      <p className="hud-label mt-2">Related consequences in this run</p>
      {nodes.length ? (
        <ul className="flex flex-col gap-0.5">{nodes.map((n) => <li key={n.id}><button type="button" className="text-left hover:underline" onClick={() => onSelectNode(n.id)}><b>{n.entity}</b> <span className="dim">{n.change}</span></button></li>)}</ul>
      ) : <p className="faint">None in this world for the current run.</p>}
    </div>
  );
}

/* ---------- economy widgets (fictional) ---------------------------------------------------- */

function Spark({ s, tint }: { s: Series; tint: string }) {
  const W = 120, H = 34;
  const min = Math.min(...s.points), max = Math.max(...s.points);
  const xy = s.points.map((v, i) => [(i / (s.points.length - 1)) * W, H - 3 - ((v - min) / (max - min || 1)) * (H - 6)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${s.label}: fictional trend`}>
      <path d={d} fill="none" stroke={tint} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r={3} fill={tint} />
      {xy.map(([x], i) => (
        <rect key={i} x={x - W / 48} y={0} width={W / 24} height={H} fill="transparent">
          <title>{`${s.label} · period ${i + 1}: ${s.points[i].toFixed(s.decimals)} ${s.unit} (fictional)`}</title>
        </rect>
      ))}
    </svg>
  );
}

function Widgets() {
  const series = useMemo(fictionalSeries, []);
  const tint = hexOf("society");
  return (
    <div>
      <div className="mb-1 flex items-center gap-2"><p className="hud-label">Indicators</p><span className="prov prov-ill">{FICTIONAL}</span></div>
      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        {series.map((s) => {
          const last = s.points[s.points.length - 1], first = s.points[0];
          const ch = last - first;
          return (
            <div key={s.id} className="glass-flat flex items-center justify-between gap-2 px-2.5 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-[10.5px] text-[var(--text-dim)]">{s.label}</p>
                <p className="mono text-[14px] font-semibold">{last.toFixed(s.decimals)} <span className="faint text-[10px]">{s.unit}</span></p>
                <p className="mono faint text-[9.5px]">{ch >= 0 ? "▲" : "▼"} {Math.abs(ch).toFixed(s.decimals)} over 24 periods</p>
              </div>
              <Spark s={s} tint={tint} />
            </div>
          );
        })}
      </div>
      <p className="faint mt-1 text-[10.5px]">No market data integration exists in this repository. These series are generated, labelled fictional, and are not linked to any scenario: one event does not automatically move an index or bond yield.</p>
    </div>
  );
}

/* ---------- business: S&P 500 (fictional values) + sector exposure + event cards ---------------- */

function BigChart({ s, tint }: { s: Series; tint: string }) {
  const W = 520, H = 120;
  const min = Math.min(...s.points), max = Math.max(...s.points);
  const xy = s.points.map((v, i) => [8 + (i / (s.points.length - 1)) * (W - 16), H - 14 - ((v - min) / (max - min || 1)) * (H - 28)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full" role="img" aria-label={`${s.label}: fictional trend over 24 periods`}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={8} x2={W - 8} y1={14 + f * (H - 28)} y2={14 + f * (H - 28)} stroke="rgba(255,255,255,.07)" />)}
      <path d={`${d} L${W - 8} ${H - 14} L8 ${H - 14} Z`} fill={tint} opacity={0.12} />
      <path d={d} fill="none" stroke={tint} strokeWidth={2} strokeLinejoin="round" />
      {xy.map(([x], i) => (
        <rect key={i} x={x - W / 48} y={0} width={W / 24} height={H} fill="transparent">
          <title>{`${s.label} · period ${i + 1}: ${s.points[i].toFixed(0)} pts (fictional)`}</title>
        </rect>
      ))}
    </svg>
  );
}

export function BusinessBoard({ s, nodes, direct, onSelectNode, actionLabel }: { s: Scenario | null; nodes: GNode[]; direct: boolean; onSelectNode: (id: string) => void; actionLabel: string }) {
  const sp = useMemo(() => fictionalSeries()[0], []);
  const tint = hexOf("business");
  const last = sp.points[sp.points.length - 1];
  // which sectors this scenario's business consequences touch (exposure only: no price move is estimated)
  const exposed = new Map<string, GNode[]>();
  nodes.forEach((n) => SECTORS.forEach((sec) => { if (sec.keys.test(`${n.entity} ${n.change}`)) exposed.set(sec.id, [...(exposed.get(sec.id) ?? []), n]); }));
  return (
    <div className="scroll flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {direct && <span className="action-chip self-start">⚡ {actionLabel.slice(0, 60)}</span>}
      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <div className="glass-flat p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-[13px] font-semibold">S&amp;P 500</p>
            <p className="mono text-[18px] font-semibold">{last.toFixed(0)} <span className="faint text-[10px]">pts</span></p>
            <span className="prov prov-ill ml-auto">{FICTIONAL}</span>
          </div>
          <BigChart s={sp} tint={tint} />
          <p className="faint text-[10.5px]">No market data is connected to ACMP. This line is generated and is not linked to the scenario: one event does not automatically move the index.</p>
        </div>
        <div className="glass-flat p-3">
          <p className="text-[13px] font-semibold">S&amp;P 500 sectors touched by this action</p>
          <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {SECTORS.map((sec) => {
              const ns = exposed.get(sec.id);
              return (
                <button key={sec.id} type="button" disabled={!ns} onClick={() => ns && onSelectNode(ns[0].id)} title={ns ? ns.map((n) => `${n.entity} ${n.change}`).join(" · ") : "not touched"}
                  className={`rounded-md border px-2 py-1 text-left text-[10.5px] ${ns ? "text-[var(--text)]" : "faint"}`}
                  style={ns ? { borderColor: tint, background: "rgba(25,158,112,.14)" } : { borderColor: "rgba(255,255,255,.08)" }}>
                  {sec.label}
                  {ns && <span className="mono block text-[9px] text-[var(--accent)]">exposed · {ns.length}</span>}
                </button>
              );
            })}
          </div>
          <p className="faint mt-1.5 text-[10.5px]">Exposure, not a forecast: no price movement is estimated for any sector.</p>
        </div>
      </div>
      <div><p className="hud-label mb-1">Event questions (Polymarket-style, no odds)</p><Cards world="business" s={s} nodes={nodes} onSelectNode={onSelectNode} /></div>
    </div>
  );
}

export function GovernmentBoard(p: { s: Scenario | null; nodes: GNode[]; direct: boolean; onSelectNode: (id: string) => void; actionLabel: string }) {
  return (
    <div className="scroll flex h-full flex-col gap-2 overflow-y-auto pr-1">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>🏛️</span><p className="hud-label">Policy & decision board</p>
        {p.direct && <span className="action-chip">⚡ {p.actionLabel.slice(0, 48)}</span>}
      </div>
      <Cards world="government" s={p.s} nodes={p.nodes} onSelectNode={p.onSelectNode} />
      <p className="faint text-[10.5px]">Exploration only: no betting, trading, wallet or account. A proposed decision shown here has not occurred.</p>
    </div>
  );
}

export function EconomyBoard(p: { s: Scenario | null; nodes: GNode[]; direct: boolean; onSelectNode: (id: string) => void; actionLabel: string }) {
  return (
    <div className="scroll flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {p.direct && <span className="action-chip self-start">⚡ {p.actionLabel.slice(0, 60)}</span>}
      <Widgets />
      <div><p className="hud-label mb-1">Event questions</p><Cards world="society" s={p.s} nodes={p.nodes} onSelectNode={p.onSelectNode} /></div>
    </div>
  );
}

/* ---------- media: fictional feed + spread ------------------------------------------------- */

export function MediaBoard({ s, nodes, direct, actionLabel }: { s: Scenario | null; nodes: GNode[]; direct: boolean; actionLabel: string }) {
  const tint = hexOf("media");
  const heads = s?.stage?.headlines ?? (nodes.length ? nodes.map((n) => `How it might be covered (fictional): “${n.change}”`) : ["No coverage in this run"]);
  const cards = [
    { cat: "TV news", icon: "📺", text: heads[0] },
    { cat: "Online article", icon: "📰", text: heads[0] },
    { cat: "Video platform (e.g. YouTube)", icon: "▶️", text: heads[2] ?? `Fictional explainer: ${s?.title ?? "the incident"}` },
    { cat: "Social posts (e.g. Facebook, X)", icon: "💬", text: heads[1] ?? "Fictional post discussing the story" },
  ];
  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[1.1fr_1fr]">
      <div className="scroll flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
        <div className="flex items-center gap-2"><p className="hud-label">Feed</p><Illustrative>Fictional headlines & posts · not real reports</Illustrative></div>
        {cards.map((c, i) => (
          <article key={c.cat} className={`glass-flat flex gap-2.5 p-2.5 ${direct && i === 1 ? "!border-[var(--action)]" : ""}`}>
            <span className="text-xl" aria-hidden>{c.icon}</span>
            <div className="min-w-0">
              <p className="mono faint text-[9.5px] uppercase tracking-wider">{c.cat} · fictional</p>
              <p className="text-[12.5px] leading-snug">{c.text}</p>
            </div>
          </article>
        ))}
        {nodes.length === 0 && <p className="faint text-[11px]">No media consequence in this run: nothing is invented here.</p>}
      </div>
      <svg viewBox="0 0 360 300" className="h-full w-full" role="img" aria-label="How content spreads between channels">
        {[[180, 60], [70, 170], [180, 250], [290, 170]].map(([x, y], i) => (
          <line key={i} x1={180} y1={150} x2={x} y2={y} stroke={tint} strokeWidth={1.6} strokeDasharray="5 5" />
        ))}
        <circle cx={180} cy={150} r={30} fill="rgba(184,110,224,.18)" stroke={direct ? "var(--action)" : tint} strokeWidth={2} />
        <text x={180} y={156} textAnchor="middle" fontSize={20} aria-hidden>📰</text>
        <text x={180} y={196} textAnchor="middle" fontSize={10} fill="#e8eaed">source story</text>
        {[["📺", "TV", 180, 60], ["💬", "posts", 70, 170], ["▶️", "video", 180, 250], ["🔁", "shares", 290, 170]].map(([ic, l, x, y]) => (
          <g key={l as string}>
            <circle cx={x as number} cy={y as number} r={22} fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.3)" />
            <text x={x as number} y={(y as number) + 6} textAnchor="middle" fontSize={16} aria-hidden>{ic}</text>
            <text x={x as number} y={(y as number) + 36} textAnchor="middle" fontSize={10} fill="#e8eaed">{l}</text>
          </g>
        ))}
        {direct && <g><circle className="redwave" cx={180} cy={150} r={44} fill="none" stroke="var(--action)" strokeWidth={3} /><circle className="redwave d2" cx={180} cy={150} r={44} fill="none" stroke="var(--action)" strokeWidth={2} /></g>}
        <text x={180} y={292} textAnchor="middle" fontSize={9.5} fill="rgba(232,234,237,.55)">dashed = possible spread · reach not estimated</text>
      </svg>
      {direct && <span className="sr-only">Action: {actionLabel}</span>}
    </div>
  );
}
