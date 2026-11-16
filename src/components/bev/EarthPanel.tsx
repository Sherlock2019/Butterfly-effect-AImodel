"use client";

import type { Scenario } from "@/lib/catalog";
import type { GNode } from "@/lib/graph";
import { hexOf } from "@/lib/worlds";
import { ActionPulse, Illustrative } from "./shared";

/** Earth overlay: an energy-system schematic and the two illustrative conditional pathways. */
export function EarthPanel({ s, pathway, setPathway, nodes, direct, actionLabel }: {
  s: Scenario | null; pathway: string; setPathway: (p: string) => void; nodes: GNode[]; direct: boolean; actionLabel: string;
}) {
  if (!s?.pathways) {
    return (
      <div className="glass pointer-events-auto max-w-[340px] p-3 text-[12px]">
        <p className="hud-label mb-1">Earth & Ecosystems</p>
        <p className="dim">{nodes.length ? "Possible effects on emissions, resources and ecosystems are listed below the globe." : "No Earth effect in this run."}</p>
        {s?.place && <p className="mono faint mt-1 text-[10.5px]">pin: {s.place.label}</p>}
      </div>
    );
  }
  const p = s.pathways.find((x) => x.id === pathway);
  const fossil = pathway === "fossil", low = pathway === "low_carbon";
  const tint = hexOf("earth");
  const src = [
    { id: "gas", x: 60, y: 60, icon: "🏭", label: "Gas / coal plant", on: fossil },
    { id: "solar", x: 300, y: 50, icon: "☀️", label: "Solar farm", on: low },
    { id: "wind", x: 310, y: 170, icon: "🌬️", label: "Wind farm", on: low },
    { id: "nuclear", x: 60, y: 180, icon: "⚛️", label: "Nuclear plant", on: low },
  ];
  return (
    <div className="glass pointer-events-auto flex w-[min(380px,calc(100%-16px))] flex-col gap-2 p-3 text-[12px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="hud-label">Energy system · schematic</p>
        <Illustrative>Illustrative conditional pathway</Illustrative>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Choose an illustrative pathway">
        {s.pathways.map((x) => <button key={x.id} type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={pathway === x.id} onClick={() => setPathway(x.id)}>{x.short}</button>)}
        <button type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={pathway === "none"} onClick={() => setPathway("none")}>Not specified</button>
      </div>
      <svg viewBox="0 0 370 240" className="w-full" role="img" aria-label="Schematic: data center, grid connections and possible energy sources">
        <rect x={0} y={0} width={370} height={240} rx={10} fill="rgba(57,135,229,.06)" stroke="rgba(57,135,229,.3)" />
        {src.map((x) => (
          <g key={x.id}>
            <line x1={185} y1={120} x2={x.x} y2={x.y} stroke={x.on ? tint : "rgba(255,255,255,.22)"} strokeWidth={x.on ? 2.4 : 1.2} strokeDasharray={x.id === "gas" ? undefined : "6 5"} />
            <circle cx={x.x} cy={x.y} r={20} fill="rgba(7,8,13,.85)" stroke={x.on ? tint : "rgba(255,255,255,.3)"} strokeWidth={x.on ? 2 : 1} />
            <text x={x.x} y={x.y + 6} textAnchor="middle" fontSize={16} aria-hidden>{x.icon}</text>
            <text x={x.x} y={x.y + 34} textAnchor="middle" fontSize={9.5} fill="#e8eaed">{x.label}{x.on ? " · possible" : ""}</text>
          </g>
        ))}
        <rect x={160} y={98} width={50} height={44} rx={8} fill="rgba(7,8,13,.9)" stroke={direct ? "var(--action)" : tint} strokeWidth={2} />
        <text x={185} y={126} textAnchor="middle" fontSize={18} aria-hidden>🗄️</text>
        <text x={185} y={160} textAnchor="middle" fontSize={9.5} fill="#e8eaed">AI data center</text>
        <text x={185} y={226} textAnchor="middle" fontSize={9} fill="rgba(232,234,237,.55)">solid = existing grid link · dashed = possible / future (multi-year)</text>
        {direct && <ActionPulse x={185} y={120} r={34} />}
      </svg>
      {p ? (
        <ol className="flex flex-col gap-0.5">
          {p.steps.map((st, i) => <li key={i} className="flex gap-1.5"><span className="mono faint w-4">{i === 0 ? "⚡" : "→"}</span><span className={i === 0 ? "" : "dim"}>{st}{i === 0 ? <span className="faint"> (specified by the scenario)</span> : <span className="faint"> (possible)</span>}</span></li>)}
        </ol>
      ) : (
        <p className="text-[var(--amber)]">Pathway not specified: the pathway rules return UNKNOWN. Pick A or B to explore one conditional possibility.</p>
      )}
      <details>
        <summary className="faint cursor-pointer text-[11px]">What changes the result ({s.conditions?.length ?? 0} conditions) · what is unknown</summary>
        <p className="dim mt-1 text-[11px]">{s.conditions?.join(" · ")}</p>
        <p className="faint mt-1 text-[11px]">Unknown: {s.unknowns.join(" · ")}.</p>
        <p className="faint mt-1 text-[11px]">One data center does not automatically lead to a nuclear plant or more fossil generation; renewable and nuclear capacity is not immediately available.</p>
      </details>
      <p className="mono faint text-[10px]">{actionLabel.slice(0, 70)}</p>
    </div>
  );
}
