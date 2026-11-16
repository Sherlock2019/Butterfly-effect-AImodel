"use client";

import { useEffect, useMemo, useState } from "react";
import { ButterflyRadar } from "@/components/ButterflyRadar";
import { PageShell } from "@/components/Nav";
import { Basis, ErrorNote, Loading, Plain, WorldTag } from "@/components/ui";
import { rippleFrom, type ButterflyView, type Hit } from "@/lib/butterfly";
import { postJson, useJson, useLive } from "@/lib/data";
import { SCENE_LAYER, type WorldId } from "@/lib/worlds";

/* The Scenario Engine's JSON (acm.scene/1), only what this page shows. */
interface Inference { kind: string; text: string; status: string; source: string }
interface Actor { id: string; name: string; role: string; goals: string[]; knows: string[]; unknown: string[]; inferences: Inference[]; relationships: Record<string, string> }
interface Ev { id: string; order: number; actor: string | null; type: string; description: string; dialogue: string | null; voice: string | null; source: string }
interface Consequence { id: string; scope: string; layer: string; affected: string[]; description: string; status: string; effect: Record<string, string>; horizon: string; source: string; questions: string[] }
interface Branch { id: string; title: string; summary: string; assumptions: string[]; plausibility: string; source: string; goal_changes: { actor: string; change: string; effect: string }[]; events: Ev[] }
interface Step { event: string | null; state: Record<string, Record<string, unknown>>; changed: string[] }
interface Bundle {
  scene: { id: string; title: string; description: string; action: string | null; location: { name: string; city: string | null }; time: string; context: string[]; actors: Actor[]; events: Ev[]; scopes: { n: number; id: string; title: string; short: string }[]; unknowns: string[]; caveats: string[] };
  timeline: Step[];
  analysis: { conflicts: { between: string[]; description: string; status: string }[]; consequences: Consequence[] };
  branches: Branch[];
}

const SCENES: { id: string; icon: string; where: WorldId }[] = [
  { id: "car_sale", icon: "🚗", where: "society" }, { id: "iphone_gift", icon: "📱", where: "society" },
  { id: "beach_post", icon: "🏖️", where: "digital" }, { id: "park_ball", icon: "⚽", where: "physical" },
  { id: "factory_protest", icon: "📣", where: "society" }, { id: "ev_purchase", icon: "🔋", where: "society" },
  { id: "job_loss", icon: "💼", where: "business" }, { id: "lottery_win", icon: "🎟️", where: "society" },
];
const ACTOR_C = ["#00d4ff", "#f0a63c", "#d55181", "#9085e9", "#199e70", "#e66767"];

function sceneView(b: Bundle, where: WorldId): ButterflyView {
  const scopes = b.scene.scopes;
  const hits: Hit[] = b.analysis.consequences.map((c) => {
    const vals = Object.values(c.effect);
    const tone = vals.includes("negative") ? "neg" : vals.includes("positive") ? "pos" : vals.includes("mixed") ? "risk" : "neutral";
    const ring = Math.max(0, scopes.findIndex((s) => s.id === c.scope));
    return { id: c.id, world: SCENE_LAYER[c.layer] ?? "behaviour", ring, ringKey: c.scope, about: c.affected.join(", "), text: c.description, basis: c.source, tone } as Hit;
  });
  return { rings: scopes.map((s) => ({ key: s.id, title: s.short, extent: null })), hits, origin: { world: where, why: "" }, ripple: rippleFrom(where), empties: [] };
}

const fmt = (v: unknown) => (v === null || v === undefined ? "∅" : typeof v === "object" ? JSON.stringify(v) : String(v));

export default function Scenarios() {
  const [id, setId] = useState("car_sale");
  const { data: b, error } = useJson<Bundle>(`scene_${id}.json`);
  const live = useLive();
  const [line, setLine] = useState(0);
  const [voice, setVoice] = useState(false);
  const [gen, setGen] = useState<{ state: "idle" | "running" | "error"; msg?: string; branches: Branch[] }>({ state: "idle", branches: [] });
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("scene");
    if (q && SCENES.some((s) => s.id === q)) setId(q);
  }, []);
  useEffect(() => { setLine(0); setBranch(null); setGen({ state: "idle", branches: [] }); }, [id]);

  const meta = SCENES.find((s) => s.id === id)!;
  const view = useMemo(() => (b ? sceneView(b, meta.where) : null), [b, meta.where]);
  const colors = useMemo(() => Object.fromEntries((b?.scene.actors ?? []).map((a, i) => [a.id, ACTOR_C[i % ACTOR_C.length]])), [b]);
  const nameOf = (a: string | null) => b?.scene.actors.find((x) => x.id === a)?.name ?? a ?? "";

  const speak = (e: Ev) => {
    if (!voice || !e.dialogue || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(e.dialogue));
  };
  const go = (k: number) => {
    if (!b) return;
    const n = Math.max(0, Math.min(b.scene.events.length, k));
    setLine(n);
    if (n > 0) speak(b.scene.events[n - 1]);
  };
  const generate = async () => {
    setGen((g) => ({ ...g, state: "running" }));
    try {
      const d = await postJson<{ branches: Branch[]; model?: string; rejected?: unknown[] }>("generated next scenes", { scene: id });
      setGen({ state: "idle", branches: d.branches ?? [], msg: `${d.branches?.length ?? 0} generated by ${d.model ?? "the local model"}${d.rejected?.length ? ` · ${d.rejected.length} rejected by validation` : ""}` });
    } catch (e) {
      setGen({ state: "error", branches: [], msg: (e as Error).message });
    }
  };

  const step = b?.timeline[line];
  const allBranches = [...(b?.branches ?? []), ...gen.branches];
  const br = allBranches.find((x) => x.id === branch);

  return (
    <PageShell>
      <p className="classif">3 · How it solves it // Scenario engine // the human world</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">People react through goals, <span className="accent">not physics.</span></h1>
      <p className="dim mt-3 max-w-3xl text-lg">A scenario is written like a movie script. The engine computes the status after every line (who owns what, who knows what, who objects), the consequences per world, and possible next scenes.</p>
      <Plain>It reads a scene like a film script, keeps score of what changed after each line, and suggests what could happen in the next scene, always saying what it assumed.</Plain>

      <div className="my-6 flex flex-wrap gap-1.5">
        {SCENES.map((s) => (
          <button key={s.id} className="hbtn" aria-pressed={id === s.id} onClick={() => setId(s.id)}>{s.icon} {s.id.replace("_", " ")}</button>
        ))}
      </div>

      {error && <ErrorNote error={error} />}
      {!b && !error && <Loading what="the scenario" />}
      {b && view && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <section className="glass p-5">
              <p className="hud-label">{b.scene.location.name}{b.scene.location.city ? ` · ${b.scene.location.city}` : ""} · {b.scene.time}</p>
              <h2 className="mt-1 text-2xl font-semibold">{meta.icon} {b.scene.title}</h2>
              <p className="dim mt-2 text-[14.5px]">{b.scene.description}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {b.scene.actors.map((a) => (
                  <div key={a.id} className="glass-flat p-3 text-[12.5px]">
                    <p className="text-[14px] font-semibold"><span className="swatch mr-1.5" style={{ background: colors[a.id] }} />{a.name} <span className="faint text-[11px] font-normal">{a.role}</span></p>
                    {a.goals.length > 0 && <p className="mt-1"><span className="hud-label">goal </span>{a.goals.join("; ")}</p>}
                    {a.knows.length > 0 && <p className="dim mt-1"><span className="hud-label">knows </span>{a.knows.join("; ")}</p>}
                    {a.unknown.length > 0 && <p className="faint mt-1"><span className="hud-label">doesn&apos;t know </span>{a.unknown.join("; ")}</p>}
                  </div>
                ))}
              </div>
            </section>

            <section className="glass p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="hud-label !text-[var(--accent)]">The script · line {line}/{b.scene.events.length}</p>
                <div className="flex items-center gap-1.5">
                  <button className="hbtn !py-1" onClick={() => go(0)}>⏮</button>
                  <button className="hbtn !py-1" onClick={() => go(line - 1)}>‹ prev</button>
                  <button className="hbtn-primary !py-1" onClick={() => go(line + 1)} disabled={line >= b.scene.events.length}>next line ›</button>
                  <button className="hbtn !py-1" aria-pressed={voice} onClick={() => setVoice((v) => !v)} title="Read dialogue aloud (browser voice)">🔊 voice</button>
                </div>
              </div>
              <ol className="mt-3 flex flex-col gap-1.5">
                {b.scene.events.map((e, k) => (
                  <li key={e.id}>
                    <button onClick={() => go(k + 1)} className={`w-full rounded-lg px-3 py-2 text-left transition-opacity ${k < line ? "" : "opacity-35"} ${k === line - 1 ? "bg-[var(--accent-dim)]" : "hover:bg-white/5"}`}>
                      <span className="mono faint mr-2 text-[10.5px]">{String(e.order).padStart(2, "0")} {e.type.toUpperCase()}</span>
                      {e.actor && <b style={{ color: colors[e.actor] }}>{nameOf(e.actor)} </b>}
                      {e.dialogue ? <span>&ldquo;{e.dialogue}&rdquo; {e.voice && <i className="faint text-[11px]">({e.voice})</i>}</span> : <span className="dim">{e.description}</span>}
                    </button>
                  </li>
                ))}
              </ol>
            </section>

            <section className="glass p-5">
              <p className="hud-label !text-[var(--accent)]">Status after line {line}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {step && Object.entries(step.state).map(([who, st]) => (
                  <div key={who} className={`glass-flat p-2.5 ${step.changed.some((c) => c.startsWith(who)) ? "!border-[var(--accent)]" : ""}`}>
                    <p className="mono text-[11px] font-semibold uppercase tracking-wider">{nameOf(who)}</p>
                    {Object.entries(st).map(([k, v]) => (
                      <p key={k} className={`mono text-[11px] ${step.changed.includes(`${who}.${k}`) ? "text-[var(--accent)]" : "dim"}`}>{k}: {fmt(v)}</p>
                    ))}
                  </div>
                ))}
              </div>
              <p className="faint mt-2 text-[11px]">Highlighted values changed on this line. Facts, authored content and model output are labelled; feelings are only ever <i>possible</i>, never stated.</p>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <section className="glass p-5">
              <p className="hud-label mb-2 !text-[var(--accent)]">Consequences · world × ring</p>
              <ButterflyRadar view={view} />
              <ul className="mt-3 flex flex-col gap-2">
                {b.analysis.consequences.map((c) => (
                  <li key={c.id} className="glass-flat p-2.5 text-[12.5px]">
                    <div className="flex flex-wrap items-center gap-1.5"><WorldTag id={SCENE_LAYER[c.layer] ?? "behaviour"} /><span className="chip">{c.scope}</span><span className="chip">{c.status}</span><span className="chip">{c.horizon}</span><Basis b={c.source} /></div>
                    <p className="mt-1.5">{c.description}</p>
                  </li>
                ))}
              </ul>
            </section>
            {b.analysis.conflicts.length > 0 && (
              <section className="glass p-5">
                <p className="hud-label mb-2 !text-[var(--accent)]">Conflicts</p>
                {b.analysis.conflicts.map((c, k) => <p key={k} className="text-[13px]"><b>{c.between.map(nameOf).join(" ⟷ ")}</b> <span className="dim">{c.description}</span></p>)}
              </section>
            )}
            <section className="glass p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="hud-label !text-[var(--accent)]">Possible next scenes</p>
                <button className="hbtn !py-1" onClick={generate} disabled={!live.llm || gen.state === "running"} title={live.llm ? "Ask the local LLM; every scene is validated against the script" : live.llmReason}>
                  {gen.state === "running" ? "generating…" : "✦ generate with the local LLM"}
                </button>
              </div>
              {gen.msg && <p className={`mt-1 text-[11.5px] ${gen.state === "error" ? "text-[var(--bad)]" : "faint"}`}>{gen.msg}</p>}
              <div className="mt-3 grid gap-2">
                {allBranches.map((x) => (
                  <button key={x.id + x.source} onClick={() => setBranch(branch === x.id ? null : x.id)} className={`glass-flat p-3 text-left ${branch === x.id ? "!border-[var(--accent)]" : ""}`}>
                    <p className="flex items-center justify-between gap-2 text-[13.5px] font-semibold">{x.id} · {x.title} <Basis b={x.source} /></p>
                    <p className="dim mt-1 text-[12.5px]">{x.summary}</p>
                  </button>
                ))}
              </div>
              {br && (
                <div className="mt-3 text-[12.5px]">
                  <p className="hud-label">assumes</p><p className="dim">{br.assumptions.join(" · ")}</p>
                  <p className="hud-label mt-2">goal changes</p>
                  {br.goal_changes.map((g, k) => <p key={k}><b>{nameOf(g.actor)}</b> <span className="dim">{g.change}</span> <span className="chip">{g.effect}</span></p>)}
                  <p className="faint mt-2">{br.plausibility}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </PageShell>
  );
}
