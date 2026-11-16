"use client";

import { useState } from "react";
import type { WorldMark } from "@/lib/cascade";
import type { GNode } from "@/lib/graph";
import { ACTION, ROUTING, SCALES, WORLDS, color, type Scale, type TopWorldId } from "@/lib/worlds";
import { statusIcon } from "../ui";

const MARK: Record<WorldMark, { label: string; icon: string; cls: string }> = {
  direct: { label: "Direct impact", icon: "⚡", cls: "text-[var(--action)]" },
  possible: { label: "Possible", icon: "◌", cls: "text-[var(--text)]" },
  unknown: { label: "Unknown", icon: "?", cls: "text-[var(--amber)]" },
  no_effect: { label: "No effect found", icon: "–", cls: "faint" },
  not_modeled: { label: "Not modeled", icon: "∅", cls: "faint" },
  none: { label: "Not evaluated", icon: "·", cls: "faint" },
};
const ENGINE: Record<string, string> = { working: "engine working", partly: "partly modelled", planned: "planned" };

export function WorldNav({ focus, onFocus, scale, onScale, marks, nodes, active, scope, forced, onForce }: {
  focus: TopWorldId | null; onFocus: (w: TopWorldId) => void; scale: Scale; onScale: (s: Scale) => void;
  marks: Record<string, WorldMark>; nodes: GNode[]; active: boolean;
  /** Worlds this run impacts (lit). null = no run. */
  scope: Set<string> | null;
  /** Worlds the user enabled to look for a consequence beyond the impacted ones. */
  forced: Set<TopWorldId>;
  onForce: (w: TopWorldId) => void;
}) {
  const [physOpen, setPhysOpen] = useState(true);
  const limited = active && !!scope;
  const lit = (id: string) => !limited || scope!.has(id);
  const impacted = limited ? WORLDS.filter((w) => scope!.has(w.id)).length : 10;
  return (
    <section className="glass flex flex-col p-3" aria-label="World navigator">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="hud-label">World navigator</h2>
        <span className="hud-label">{limited ? `${impacted} of 10 lit` : "10 worlds"}</span>
      </header>
      <ol className="flex flex-col gap-0.5">
        {WORLDS.map((w, i) => {
          const id = w.id as TopWorldId;
          const isLit = lit(id);
          const isForced = forced.has(id);
          const n = nodes.filter((x) => x.world === id).length;
          const mk = !active ? null
            : isLit ? MARK[marks[id] ?? "none"]
              : isForced ? (n ? { label: "Found (enabled)", icon: "◌", cls: "text-[var(--text)]" } : { label: "No consequence found", icon: "–", cls: "text-[var(--amber)]" })
                : { label: "Not impacted", icon: "·", cls: "faint" };
          const on = focus === id;
          return (
            <li key={id} className={isLit || isForced ? "" : "opacity-45"}>
              <div className={`flex items-stretch rounded-lg ${on ? "bg-white/[.08] ring-1 ring-[var(--accent)]" : "hover:bg-white/5"} ${limited && isLit ? "border-l-2" : ""}`} style={limited && isLit ? { borderColor: color(id), boxShadow: `inset 6px 0 14px -10px ${color(id)}` } : undefined}>
                <button type="button" onClick={() => onFocus(id)} aria-pressed={on} aria-label={`${w.name}${mk ? `: ${mk.label}` : ""}`}
                  className="flex min-w-0 flex-1 items-start gap-2 px-2 py-1.5 text-left">
                  <span className="mono faint mt-1 w-4 text-right text-[9.5px]">{10 - i}</span>
                  <span className="swatch mt-1.5" style={{ background: color(id) }} aria-hidden />
                  <span className="mt-0.5 w-5 text-center text-[15px]" aria-hidden>{w.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">{w.name}</span>
                    <span className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="faint truncate">{statusIcon(w.status)} {ENGINE[w.status]}</span>
                      {mk && <span className={`mono whitespace-nowrap text-[9px] uppercase tracking-wider ${mk.cls}`}>{mk.icon} {mk.label}{n ? ` · ${n}` : ""}</span>}
                    </span>
                  </span>
                </button>
                {limited && !isLit && (
                  <button type="button" onClick={() => onForce(id)} aria-pressed={isForced}
                    aria-label={`${isForced ? "Disable" : "Enable"} ${w.name} to look for a consequence`}
                    className={`mono my-auto mr-1 rounded border px-1.5 py-[1px] text-[9px] tracking-wider ${isForced ? "border-[var(--accent)] text-[var(--accent)]" : "faint border-[var(--glass-border-hi)] hover:text-[var(--text)]"}`}>
                    {isForced ? "ON" : "ENABLE"}
                  </button>
                )}
                {id === "physical" && (
                  <button type="button" className="faint px-2 text-[11px]" onClick={() => setPhysOpen((v) => !v)} aria-expanded={physOpen} aria-label="Show Physical World scales">
                    {physOpen ? "▾" : "▸"}
                  </button>
                )}
              </div>
              {id === "physical" && physOpen && (
                <ul className="mb-1 ml-9 mt-0.5 grid grid-cols-2 gap-1" aria-label="Physical World scales">
                  {SCALES.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => { onFocus("physical"); onScale(s.id); }} aria-pressed={focus === "physical" && scale === s.id}
                        className={`hbtn w-full !justify-start !px-2 !py-1 !text-[9.5px] ${focus === "physical" && scale === s.id ? "" : ""}`} title={s.today}>
                        <span aria-hidden>{s.icon}</span> {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {limited && impacted < 10 && (
        <p className="faint mt-1 px-2 text-[10.5px] leading-snug">Lit = impacted by this action (direct or first step). ENABLE a dim world to let the cascade extend into it: a consequence appears only if a rule supports one.</p>
      )}
      <div className="my-2 border-t hairline" />
      <p className="hud-label mb-1">Not worlds</p>
      <ul className="flex flex-col gap-1 px-1 text-[11px]">
        <li className="flex items-center gap-2"><span className="chip !py-0">{ROUTING.icon} Routing</span><span className="faint">NPLM phrase → directly affected world</span></li>
        <li className="flex items-center gap-2"><span className="action-chip !px-1.5 !py-0">{ACTION.icon} Action</span><span className="faint">the trigger: text, email, article, media</span></li>
      </ul>
      <p className="faint mt-2 px-1 text-[10.5px] leading-snug">The order is for the eye. A consequence can jump straight to any world; it does not climb the stack.</p>
    </section>
  );
}
