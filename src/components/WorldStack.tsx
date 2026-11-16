"use client";

import { ACTION, ROUTING, SCALES, WORLDS, hexOf } from "@/lib/worlds";
import { StatusPill } from "./ui";

/**
 * "1 actor · 1 action = consequences in cascade": the ten-world stack, data-driven from worlds.ts
 * (a maintainable replacement for the static docs/world-layers.svg, which has no generator).
 * Status pills come from worlds.ts, where each is justified by the repository.
 */
export function WorldStack({ compact = false }: { compact?: boolean }) {
  return (
    <figure className="mx-auto w-full max-w-[980px] rounded-2xl p-3 sm:p-5" style={{ background: "linear-gradient(#0b1730, #050a18)" }} aria-label="The ten-world stack">
      <header className="text-center">
        <p className="hud-title text-[20px] sm:text-[26px]">1 actor · 1 action</p>
        <p className="hud-title text-[13px] sm:text-[16px]" style={{ color: "#f5c542" }}>= consequences in cascade</p>
        <p className="dim mt-1 text-[12.5px]">Ten worlds, each about its own kind of system. One action can reach any world directly; the order is for reading, not a path consequences must climb.</p>
      </header>
      <ol className="mt-3 flex flex-col gap-2">
        {WORLDS.map((w, i) => {
          const c = hexOf(w.id);
          return (
            <li key={w.id} className="grid gap-2 rounded-xl border p-2.5 sm:grid-cols-[1fr_1.5fr_1fr] sm:items-center"
              style={{ borderColor: c, boxShadow: `0 0 18px -8px ${c}, inset 0 0 30px -18px ${c}`, background: "rgba(7,12,26,.7)" }}>
              {!compact && (
                <ul className="hidden text-[11px] sm:block">
                  <li className="hud-label !text-[9.5px]" style={{ color: c }}>{w.status === "working" || w.status === "partly" ? "Modelled concepts" : "Concepts (planned)"}</li>
                  {w.principles.map((p) => <li key={p} className="dim">• {p}</li>)}
                </ul>
              )}
              <div className={compact ? "sm:col-span-2" : ""}>
                <p className="flex items-center gap-2">
                  <span className="mono faint w-5 text-right text-[10px]">{10 - i}</span>
                  <span className="text-[22px]" aria-hidden>{w.icon}</span>
                  <span className="hud-title text-[13px] sm:text-[15px]" style={{ color: "#fff" }}>{w.name}</span>
                </p>
                <p className="mt-1 flex flex-wrap gap-1 pl-7">
                  {w.chips.map((ch) => <span key={ch} className="rounded-full border px-2 py-[1px] text-[10.5px]" style={{ borderColor: c }}>{ch}</span>)}
                </p>
                {w.id === "physical" && (
                  <ol className="mt-1.5 flex flex-wrap items-center gap-1 pl-7 text-[10.5px]" aria-label="Physical World scales">
                    {SCALES.map((s, k) => (
                      <li key={s.id} className="flex items-center gap-1">
                        <span className="rounded-md border px-1.5 py-[1px]" style={{ borderColor: c, background: `rgba(144,133,233,${0.08 + k * 0.07})` }}>{s.icon} {s.name}</span>
                        {k < SCALES.length - 1 && <span className="faint">→</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="text-[11px] sm:border-l sm:pl-3" style={{ borderColor: "rgba(255,255,255,.12)" }}>
                <p className="hud-label !text-[9.5px]" style={{ color: c }}>Illustrative example</p>
                <p className="dim">{w.example}</p>
                <p className="mt-1"><StatusPill s={w.status} /></p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 grid gap-2">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: "#22d3ee", background: "rgba(7,12,26,.7)" }}>
          <span className="text-[22px]" aria-hidden>{ROUTING.icon}</span>
          <span className="hud-title text-[14px]">Prediction routing</span>
          <span className="flex flex-wrap gap-1">{ROUTING.chips.map((c) => <span key={c} className="rounded-full border border-[#22d3ee] px-2 py-[1px] text-[10.5px]">{c}</span>)}</span>
          <span className="dim ml-auto max-w-[360px] text-[11px]">Not a world. {ROUTING.today}.</span>
        </div>
        <div className="relative flex flex-wrap items-center gap-3 overflow-hidden rounded-xl border-2 p-3" style={{ borderColor: "var(--action)", background: "rgba(60,8,12,.55)", boxShadow: "0 0 30px -8px var(--action-glow)" }}>
          <span className="text-[26px]" aria-hidden>{ACTION.icon}</span>
          <span className="hud-title text-[20px] text-white">Action</span>
          <svg viewBox="0 0 300 40" className="h-8 min-w-[120px] flex-1" aria-hidden>
            <path className="redline" d="M0 20 C 30 0, 50 40, 80 20 S 130 0, 160 20 S 210 40, 240 20 S 280 5, 300 20" fill="none" stroke="var(--action)" strokeWidth={3} />
          </svg>
          <span className="max-w-[340px] text-[11px] text-[#ffd0d0]">Not a world: the trigger of change (human, AI, animal, nature, organisation), arriving as text, email, article, image, video or sound. It may reach some worlds and not others.</span>
        </div>
      </div>
      <figcaption className="faint mt-2 text-center text-[10.5px]">Status: ● engine working · ◐ partly modelled · ○ planned (what ACMP itself models today: router and prototype rules, illustrative). Concepts listed are what each world is about, not implemented laws.</figcaption>
    </figure>
  );
}
