"use client";

import { useEffect, useRef, useState } from "react";
import { color } from "@/lib/worlds";

/* Shapes of the recorded flows.image / flows.video data (only what the feed shows). */
interface Slot { value: string | null; status: string; source: string }
interface Scenario {
  key: string; label: string;
  events: { kind: string; entity_id: string; other_id: string | null }[];
  changes: { entity_id: string; property: string; before: unknown; after: unknown; status: string }[];
  assumptions: { name: string; reason: string }[];
  unknowns: string[];
}
export interface Flows {
  image: { input: { image: string; annotated: string }; meaning: Record<string, Slot | string>; scenarios: Record<string, Scenario> };
  video: {
    input: { checkpoint_s: number }; meaning: Record<string, Slot | string>;
    timeline: { id: string; predicate: string; start_s: number; end_s: number; causal_attribution: string; roles: Record<string, string[]> }[];
    comparison: {
      predicted: { entity_id: string; property: string; before: unknown; after: unknown }[];
      observed: { entity_id: string; property: string; before: unknown; after: unknown }[];
      metrics: { support_state_accuracy: number; fall_events: { precision: number; recall: number }; position_error_m: { mean: number }; abstentions: { count: number } };
      notes: string[];
    };
  };
}

const STATUS_C: Record<string, string> = { observed: "var(--good)", inferred: "var(--warn)", assumed: "var(--warn)", unknown: "var(--text-faint)" };
const fmt = (v: unknown) => (v === null || v === undefined ? "∅" : Array.isArray(v) ? `(${v.map((x) => (typeof x === "number" ? x.toFixed(2) : x)).join(", ")})` : String(v));

function Meaning({ m }: { m: Record<string, Slot | string> }) {
  const slots = Object.entries(m).filter(([, v]) => typeof v === "object" && v !== null) as [string, Slot][];
  return (
    <div>
      <p className="dim mb-2 text-[12px] italic">{String(m.evidence_kind ?? "")}</p>
      <dl className="grid grid-cols-[78px_1fr] gap-x-2 gap-y-1">
        {slots.slice(0, 8).map(([k, s]) => (
          <div key={k} className="contents">
            <dt className="hud-label pt-0.5">{k.replace("_", " ")}</dt>
            <dd className="mono text-[11.5px]" title={s.source}>
              <span className={s.value ? "" : "faint"}>{s.value ?? "—"}</span>{" "}
              <span className="text-[10px]" style={{ color: STATUS_C[s.status] ?? "var(--text-faint)" }}>[{s.status}]</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SensorFeed({ flows, mode, scenario, setScenario, onClose }: {
  flows: Flows; mode: "image" | "video"; scenario: string; setScenario: (k: string) => void; onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const T = flows.video.input.checkpoint_s;
  useEffect(() => {
    if (mode === "video") video.current?.play().catch(() => {});
  }, [mode]);
  const sc = flows.image.scenarios[scenario] ?? Object.values(flows.image.scenarios)[0];
  const cmp = flows.video.comparison;

  return (
    <section className="glass rise flex max-h-full w-[min(760px,calc(100vw-32px))] flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b hairline px-4 py-2.5">
        <p className="hud-label !text-[var(--accent)]">
          <span className="rec mr-1" />Sensor feed · {mode === "image" ? "CAM-01 · still image · tabletop" : `CAM-02 · video · decision at T = ${T.toFixed(1)} s`}
        </p>
        <button className="hbtn !px-2 !py-1" onClick={onClose} aria-label="Close feed">✕</button>
      </header>
      <div className="scroll grid gap-4 p-4 md:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="brackets relative overflow-hidden rounded-lg border hairline bg-black">
            {mode === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/data/${flows.image.input.annotated}`} alt="Tabletop scene with detection boxes: a blue cup near the right edge, a red cup farther in" className="block w-full" />
            ) : (
              <video ref={video} src="/data/tabletop_push_synthetic.mp4" muted playsInline controls className="block w-full" onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} />
            )}
            <span className="mono absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
              {mode === "image" ? "DETECTIONS · fixture replay" : `t = ${t.toFixed(1)} s ${t < T ? "· before T: evidence" : "· after T: prediction is scored"}`}
            </span>
          </div>
          <p className="faint mt-2 text-[10.5px]">Detections are hand-authored replays matched to synthetic media and labelled so: no vision model runs in this demo.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="hud-label mb-1.5">Phrase DNA from the {mode}</p>
            <Meaning m={mode === "image" ? flows.image.meaning : flows.video.meaning} />
          </div>
          {mode === "image" ? (
            <div>
              <p className="hud-label mb-1.5">What if… (the physical world predicts)</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {Object.values(flows.image.scenarios).map((s) => (
                  <button key={s.key} className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={scenario === s.key} onClick={() => setScenario(s.key)}>{s.label.split("(")[0]}</button>
                ))}
              </div>
              <ul className="flex flex-col gap-1 text-[12px]">
                {sc.events.map((e, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="swatch" style={{ background: color("physical") }} />
                    <span className="mono">{e.entity_id}</span>
                    <b className={e.kind === "falls" ? "text-[var(--bad)]" : ""}>{e.kind.replace(/_/g, " ")}</b>
                  </li>
                ))}
                {sc.changes.map((c, i) => (
                  <li key={`c${i}`} className="mono faint text-[11px]">Δ {c.entity_id}.{c.property}: {fmt(c.before)} → {fmt(c.after)} [{c.status}]</li>
                ))}
              </ul>
              {sc.key === "push_edge" && (
                <p className="dim mt-2 text-[12px]">Cascade beyond this flow: ⚙️ physical (a fragile cup may break: the physics lab&apos;s fracture rule) → 👁️ perception (a crash is heard) → 🧠 behaviour (the owner reacts). These worlds are not computed in this flow.</p>
              )}
              <p className="faint mt-2 text-[10.5px]">Unknown: {sc.unknowns.join(", ")}.</p>
            </div>
          ) : (
            <div>
              <p className="hud-label mb-1.5">Predicted at T vs observed later</p>
              <table className="tbl !text-[12px]">
                <thead><tr><th>entity · property</th><th>predicted</th><th>observed</th></tr></thead>
                <tbody>
                  {cmp.predicted.map((p, i) => (
                    <tr key={i}>
                      <td className="mono !text-[11px]">{p.entity_id}.{p.property}</td>
                      <td className="mono">{fmt(p.after)}</td>
                      <td className="mono">{fmt(cmp.observed[i]?.after)} {fmt(p.after) === fmt(cmp.observed[i]?.after) ? "✓" : "✕"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
                <span className="glass-flat px-2 py-1.5"><span className="hud-label block">support state</span>{(cmp.metrics.support_state_accuracy * 100).toFixed(0)}% correct</span>
                <span className="glass-flat px-2 py-1.5"><span className="hud-label block">fall events</span>P {cmp.metrics.fall_events.precision.toFixed(1)} · R {cmp.metrics.fall_events.recall.toFixed(1)}</span>
                <span className="glass-flat px-2 py-1.5"><span className="hud-label block">position error</span>{cmp.metrics.position_error_m.mean.toFixed(2)} m</span>
                <span className="glass-flat px-2 py-1.5"><span className="hud-label block">abstentions</span>{cmp.metrics.abstentions.count} (landing spot unknown)</span>
              </div>
              <p className="faint mt-2 text-[10.5px]">{cmp.notes.join(" ")} No future leakage: the prediction only sees frames up to T.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
