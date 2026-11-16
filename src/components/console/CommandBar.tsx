"use client";

import type { PhraseResult } from "@/lib/types";

export const LOOKS = [
  { id: "night", label: "Night", icon: "☾" },
  { id: "normal", label: "Normal", icon: "◎" },
  { id: "crt", label: "CRT", icon: "▤" },
  { id: "nvg", label: "NVG", icon: "◉" },
  { id: "flir", label: "FLIR", icon: "✺" },
  { id: "noir", label: "Noir", icon: "◐" },
];

/** Bottom bar (GEV's location · voice · visual presets row): demo, examples, sensor looks. */
export function CommandBar({ examples, busy, onExample, onDemo, look, setLook, stage }: {
  examples: PhraseResult[]; busy: boolean; onExample: (i: number) => void; onDemo: () => void;
  look: string; setLook: (l: string) => void; stage: string | null;
}) {
  return (
    <div className="flex w-[min(860px,calc(100vw-24px))] flex-col items-center gap-2">
      {stage && <p className="glass mono scanbar rounded-lg px-3 py-1.5 text-[11px] uppercase tracking-[.14em] text-[var(--accent)]">{stage}</p>}
      <div className="glass brackets flex w-full flex-wrap items-center gap-2 p-2">
        <button type="button" className="hbtn-primary" disabled={busy} onClick={onDemo}>▶ Run demo</button>
        <div className="scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
          {examples.map((p, i) => (
            <button key={p.id} type="button" className="chip !py-1 hover:!border-[var(--accent)] hover:!text-[var(--text)]" disabled={busy} onClick={() => onExample(i)} title={p.shows}>
              {p.text.length > 40 ? p.text.slice(0, 38) + "…" : p.text}
            </button>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="Visual presets">
          {LOOKS.map((l) => (
            <button key={l.id} type="button" className="hbtn !px-1.5 !py-1 !text-[9.5px]" aria-pressed={look === l.id} onClick={() => setLook(l.id)} title={l.label}>
              {l.icon}<span className="hidden xl:inline"> {l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
