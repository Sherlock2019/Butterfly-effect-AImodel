"use client";

import { useState } from "react";
import { cascadeOf, type ButterflyView, type Hit } from "@/lib/butterfly";
import type { Place } from "@/lib/geo";
import type { PhraseResult } from "@/lib/types";
import { ACTION, ROUTING, WORLDS, color, worldById, type WorldId } from "@/lib/worlds";
import { ButterflyRadar, GLYPH } from "../ButterflyRadar";
import { Basis, GoalPill, statusIcon } from "../ui";

/* ---------- left: the world layers (GEV's layer stack, for worlds) --------------------------- */

const ENGINE: Record<string, string> = { working: "engine working", partly: "rules · partly", planned: "planned" };

/** Consequences in cascade order: the action's world first, then ripple by ripple, ring by ring. */
export const cascadeOrder = (view: ButterflyView, shown: Set<string>) =>
  view.hits.filter((h) => shown.has(h.id)).sort((a, b) => view.ripple[a.world] - view.ripple[b.world] || a.ring - b.ring);

export function WorldsPanel({ view, shown, off, setOff, selected, onPick, onStep }: {
  view: ButterflyView | null; shown: Set<string>; off: Set<string>; setOff: (s: Set<string>) => void;
  selected: string | null; onPick: (id: string) => void; onStep: (dir: 1 | -1) => void;
}) {
  const [open, setOpen] = useState<Set<WorldId>>(new Set());
  const hitsOf = (w: WorldId) => (view ? view.hits.filter((h) => h.world === w && shown.has(h.id)) : []);
  const all = view ? view.hits.filter((h) => shown.has(h.id)) : [];
  const visible = all.filter((h) => !off.has(h.id)).length;
  const order = view ? cascadeOrder(view, shown) : [];
  const pos = selected ? order.findIndex((h) => h.id === selected) : -1;
  const flipWorld = (w: WorldId) => {
    const ids = hitsOf(w).map((h) => h.id);
    const anyOn = ids.some((id) => !off.has(id));
    const n = new Set(off);
    ids.forEach((id) => (anyOn ? n.add(id) : n.delete(id)));
    setOff(n);
  };
  const flipHit = (id: string) => {
    const n = new Set(off);
    if (n.has(id)) n.delete(id); else n.add(id);
    setOff(n);
  };
  const flipOpen = (w: WorldId) => setOpen((o) => { const n = new Set(o); if (n.has(w)) n.delete(w); else n.add(w); return n; });

  return (
    <section className="glass flex w-[272px] flex-col p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="hud-label">World layers</h3>
        <span className="hud-label">{view ? `${visible}/${all.length} shown` : "10 worlds"}</span>
      </header>
      {view && all.length > 0 && (
        <div className="mb-2 flex items-center gap-1">
          <button type="button" className="hbtn !px-2 !py-1 !text-[9.5px]" aria-pressed={visible === all.length} onClick={() => setOff(new Set())}>All</button>
          <button type="button" className="hbtn !px-2 !py-1 !text-[9.5px]" aria-pressed={visible === 0} onClick={() => setOff(new Set(all.map((h) => h.id)))}>None</button>
          <span className="ml-auto flex items-center gap-1">
            <button type="button" className="hbtn !px-2 !py-1 !text-[9.5px]" onClick={() => onStep(-1)} aria-label="Previous consequence">‹</button>
            <span className="mono faint w-12 text-center text-[10px]">{pos >= 0 && visible === 1 ? `${pos + 1}/${order.length}` : "1 by 1"}</span>
            <button type="button" className="hbtn !px-2 !py-1 !text-[9.5px]" onClick={() => onStep(1)} aria-label="Next consequence">›</button>
          </span>
        </div>
      )}
      <ol className="flex flex-col gap-0.5">
        {WORLDS.map((w) => {
          const hs = hitsOf(w.id);
          const origin = view?.origin.world === w.id;
          const on = hs.filter((h) => !off.has(h.id)).length;
          const isOpen = open.has(w.id);
          return (
            <li key={w.id} className={`rounded-lg ${origin ? "bg-white/[.06]" : ""}`}>
              <div className="flex items-start gap-2 px-2 py-1.5">
                <span className="mt-0.5 w-5 text-center text-[15px]">{w.icon}</span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => flipOpen(w.id)} aria-expanded={isOpen} disabled={!hs.length}>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                    <span className="swatch" style={{ background: color(w.id) }} />
                    {w.short}{origin && <span className="accent text-[10.5px]">★ WHERE</span>}
                    {hs.length > 0 && <span className="faint text-[10px]">{isOpen ? "▾" : "▸"}</span>}
                  </span>
                  <span className="faint block truncate text-[10.5px]">{statusIcon(w.status)} {ENGINE[w.status]} · {w.laws}</span>
                </button>
                <span className={`mono mt-0.5 w-7 text-right text-[11px] ${hs.length ? "" : "faint"}`}>{view ? (hs.length ? `${on}/${hs.length}` : "–") : ""}</span>
                {hs.length > 0 && (
                  <button type="button" onClick={() => flipWorld(w.id)} aria-pressed={on > 0} aria-label={`${on ? "Hide" : "Show"} the ${w.short} world's consequences`}
                    className={`mono mt-0.5 rounded border px-1.5 py-[1px] text-[9.5px] tracking-wider ${on ? "border-[var(--accent)] text-[var(--accent)]" : "faint border-[var(--glass-border-hi)]"}`}>
                    {on ? "ON" : "OFF"}
                  </button>
                )}
              </div>
              {isOpen && hs.length > 0 && (
                <ul className="mb-1 ml-7 mr-1 flex flex-col gap-0.5 border-l hairline pl-2">
                  {hs.map((h) => (
                    <li key={h.id} className={`flex items-start gap-1.5 rounded px-1 py-1 ${selected === h.id ? "bg-[var(--accent-dim)]" : "hover:bg-white/5"}`}>
                      <input type="checkbox" className="mt-0.5 accent-[var(--accent)]" checked={!off.has(h.id)} onChange={() => flipHit(h.id)} aria-label={`Show: ${h.about} ${h.text}`} />
                      <button type="button" onClick={() => onPick(h.id)} className="flex-1 text-left text-[11.5px] leading-snug">
                        <span className="mono faint mr-1 text-[10px]">{view?.rings[h.ring]?.title}</span>
                        <b>{h.about}</b> <span className="dim">{strip(h.text)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <div className="my-1.5 border-t hairline" />
      <ol className="faint flex flex-col gap-0.5 px-2 text-[11px]">
        <li>{ROUTING.icon} Routing · {ROUTING.today}</li>
        <li>{ACTION.icon} Action · Phrase DNA</li>
      </ol>
      <p className="faint mt-2 px-2 text-[10.5px] leading-snug">On the globe each world floats at its own altitude over the action: physical lowest, earth highest. Open a world to pick one of its consequences.</p>
    </section>
  );
}

export function ReachPanel({ view, current, onJump, place }: { view: ButterflyView | null; current: string | null; onJump: (ring: string) => void; place: Place | null }) {
  if (!view) return null;
  return (
    <section className="glass w-[236px] p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="hud-label !text-[var(--accent)]">Reach · rings</h3>
        <span className="hud-label">{place ? "fly to" : "no map"}</span>
      </header>
      <ol className="flex flex-col">
        {view.rings.map((r, i) => {
          const n = view.hits.filter((h) => h.ringKey === r.key).length;
          return (
            <li key={r.key}>
              <button type="button" disabled={!place} onClick={() => onJump(r.key)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-white/5 ${current === r.key ? "bg-[var(--accent-dim)]" : ""}`}>
                <span className="mono faint w-4 text-[10px]">{i + 1}</span>
                <span className="mono flex-1 truncate text-[11px] uppercase tracking-wider">{r.title}</span>
                <span className={`mono text-[10.5px] ${n ? "" : "faint"}`}>{n || "—"}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="faint mt-2 px-1 text-[10.5px] leading-snug">— = no rule matched there. Never read as &ldquo;no impact&rdquo;.</p>
    </section>
  );
}

/* ---------- right: the intel panel ----------------------------------------------------------- */

const strip = (t: string) => t.replace(/:\s*(advanced|enabled|blocked|at risk|hindered|unaffected)\s*$/, "");

function Block({ title, children, n }: { title: string; children: React.ReactNode; n: string }) {
  return (
    <div className="border-t hairline px-4 py-3 first:border-t-0">
      <p className="hud-label mb-2"><span className="accent mr-2">{n}</span>{title}</p>
      {children}
    </div>
  );
}

function HitRow({ h, sel, onSel }: { h: Hit; sel: boolean; onSel: (id: string) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onSel(h.id)} onMouseEnter={() => onSel(h.id)}
        className={`rise flex w-full gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] hover:bg-white/5 ${sel ? "bg-white/10" : ""}`}>
        <span className="mono grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: color(h.world) }}>
          {h.status ? (h.tone === "pos" ? "✓" : h.tone === "neg" ? "✕" : "!") : GLYPH[h.tone]}
        </span>
        <span className="flex-1">
          <b className="text-[var(--text)]">{h.about}</b> <span className="dim">{strip(h.text)}</span>
          {h.reason && <span className="faint block text-[11px]">↳ {h.reason}</span>}
        </span>
      </button>
    </li>
  );
}

export function IntelPanel({ view, shown, place, selected, onSelect }: {
  r: PhraseResult; view: ButterflyView; shown: Set<string>; place: Place | null;
  selected: string | null; onSelect: (id: string | null) => void;
}) {
  const sel = selected;
  const setSel = onSelect;
  const others = view.hits.filter((h) => h.ringKey === "other_actors");
  const own = view.hits.find((h) => /own goal/.test(h.text));
  const cascade = cascadeOf(view).sort((a, b) => a.ripple - b.ripple);
  const selHit = view.hits.find((h) => h.id === sel);

  return (
    <div className="flex flex-col">
      <Block n="01" title="Routing · the WHERE picks the world">
        <p className="text-[13px]">
          <span className="mono faint">WHERE</span> {place ? <b>{place.name}</b> : <i className="faint">not stated</i>}
          <span className="faint"> → </span>
          <span className="chip !text-[var(--text)]"><span className="swatch" style={{ background: color(view.origin.world) }} />★ {worldById(view.origin.world).name}</span>
        </p>
        <p className="dim mt-1.5 text-[12px]">{view.origin.why}</p>
        {!place && <p className="faint mt-1 text-[11px]">No known place: geography is unknown, not guessed. The globe stays at orbit.</p>}
      </Block>

      <Block n="02" title="Other actors react · their goals">
        {others.length ? (
          <ul className="flex flex-col gap-2">
            {others.map((h) => (
              <li key={h.id} className="glass-flat px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-[13px]">{h.about}</b>
                  {h.status && <GoalPill status={h.status} />}
                </div>
                <p className="dim text-[12px]">wants to {strip(h.text)}</p>
                {h.reason && <p className="faint text-[11px]">↳ {h.reason}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="faint text-[12px]">No other actor&apos;s goal in the context. Add one, e.g. &ldquo;Mark wants to buy my car.&rdquo;</p>}
      </Block>

      <Block n="03" title="Compared with what the actor wanted">
        {own ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px]">{strip(own.text).replace("own goal ", "Goal ")}</p>
            {own.status && <GoalPill status={own.status} />}
          </div>
        ) : <p className="faint text-[12px]">No desired outcome stated. Add a WHY: &ldquo;… to pay my debt.&rdquo;</p>}
      </Block>

      <Block n="04" title="Consequences in cascade · world by world">
        <ol className="flex flex-col gap-2">
          {cascade.map(({ world, ripple, hits }) => {
            const vis = hits.filter((h) => shown.has(h.id));
            return (
              <li key={world.id}>
                <p className="mono flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider">
                  <span className="swatch" style={{ background: color(world.id) }} />
                  {world.icon} {world.short}
                  <span className="faint">· {ripple === 0 ? "★ the action's world" : `ripple ${ripple}`}</span>
                </p>
                {vis.length ? (
                  <ul className="mt-0.5">{vis.map((h) => <HitRow key={h.id} h={h} sel={sel === h.id} onSel={setSel} />)}</ul>
                ) : (
                  <p className="faint pl-5 text-[11px] italic">{hits.length ? "…" : "no rule matched (not “no impact”)"}</p>
                )}
              </li>
            );
          })}
        </ol>
      </Block>

      <Block n="05" title="World × ring radar">
        <ButterflyRadar view={view} shown={shown} selected={sel} onSelect={setSel} />
        {selHit ? (
          <div className="glass-flat mt-2 px-3 py-2 text-[12px]">
            <div className="flex flex-wrap gap-1.5"><span className="chip"><span className="swatch" style={{ background: color(selHit.world) }} />{worldById(selHit.world).name}</span><span className="chip">{view.rings[selHit.ring]?.title}</span><Basis b={selHit.basis} /></div>
            <p className="mt-1.5"><b>{selHit.about}</b> {strip(selHit.text)}</p>
            {selHit.source && <p className="mono faint mt-1 text-[10.5px]">source: {selHit.source}</p>}
          </div>
        ) : <p className="faint mt-1 text-[11px]">Angle = world · distance = ring · glyph: + gain, − loss, ! risk, ✓/✕ a goal advanced/blocked. World placement is a display mapping; the engine assigns the ring.</p>}
      </Block>
    </div>
  );
}
