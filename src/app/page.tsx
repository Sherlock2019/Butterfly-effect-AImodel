"use client";

/**
 * Butterfly Effect Prediction · Test it: the console (v0.3): select a scenario or write an action → see the world it
 * directly impacts → explore possible consequences in other worlds, with the rule, assumptions and
 * provenance behind each one.
 *
 * ACMP is standalone: nothing is fetched from another service. Sources, always labelled:
 *  - RECORDED: example results bundled in public/data (Run demo, examples, missions).
 *  - ILLUSTRATIVE: catalog scenarios (authored seeds) and the prototype cascade (lib/cascade.ts).
 * The previous globe-only console is kept at /classic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Globe, type GlobeApi } from "@/components/Globe";
import { bearingOf } from "@/components/ButterflyRadar";
import { CommandBar } from "@/components/console/CommandBar";
import { IntelPanel, ReachPanel, WorldsPanel } from "@/components/console/Panels";
import { SensorFeed, type Flows } from "@/components/console/SensorFeed";
import { SceneCam } from "@/components/console/SceneCam";
import { Brand, Credit, MainNav } from "@/components/Nav";
import { WorldStack } from "@/components/WorldStack";
import { BusinessBoard, EconomyBoard, GovernmentBoard, MediaBoard } from "@/components/bev/Boards";
import { CascadePanel } from "@/components/bev/CascadeGraph";
import { ConsoleChat, type AnalyzeOutcome } from "@/components/bev/ConsoleChat";
import { EarthPanel } from "@/components/bev/EarthPanel";
import { WorldNav } from "@/components/bev/WorldNav";
import { GenericVisual, PhysicalVisual, ViewFrame } from "@/components/bev/WorldViews";
import { ActionStage3D, type Stage3D } from "@/components/bev/ActionStage3D";
import { isScene3D, sceneForText } from "@/lib/physics-scenes";
import { STACK, phraseDna, viewOf, viewOfRings, type ButterflyView, type Hit } from "@/lib/butterfly";
import { propagate, worldMarks, type Seed } from "@/lib/cascade";
import { CATALOG, scenarioById, type Scenario } from "@/lib/catalog";
import { connectionsWithin, runScenario } from "@/lib/scope";
import { ACTOR, CHANNEL, actorKindOf, type Trigger } from "@/lib/trigger";
import { dnaFromFrame, type NplmPhrase } from "@/lib/nplm";
import { postJson, useJson, useLive } from "@/lib/data";
import { RING_GEO, findPlace, offset, placeOfRings, type LL, type Place } from "@/lib/geo";
import { nodesOf } from "@/lib/graph";
import { route, type RouteResult } from "@/lib/router";
import { CONNECTIONS, RULES } from "@/lib/rules";
import { MISSIONS, missionResult, type Mission } from "@/lib/scenarios";
import type { DemoResults, PhraseResult } from "@/lib/types";
import { HEX, TOP_IDS, worldById, type Scale, type TopWorldId, type WorldId } from "@/lib/worlds";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const strip = (t: string) => t.replace(/:\s*(advanced|enabled|blocked|at risk|hindered|unaffected)\s*$/, (m) => ` — ${m.slice(1).trim().toUpperCase()}`);
const short = (s: string, n = 52) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const layerH = (w: WorldId, radius: number) => (STACK.indexOf(w) + 1) * radius * 0.16;
const pinTag = (w: WorldId, id: string) => `${w}-${id}~`;
const isTop = (w: string): w is TopWorldId => (TOP_IDS as string[]).includes(w);

type Engine =
  | { state: "idle" | "offline" | "loading" }
  | { state: "ok"; r: PhraseResult; view: ButterflyView; source: "live" | "bundled" | "authored" }
  | { state: "error"; error: string };

interface Custom { text: string; route: RouteResult; seeds: Seed[] }
type Tab = "worlds" | "view" | "cascade" | "console";

export default function Console() {
  const { data } = useJson<DemoResults>("demo_results.json");
  const live = useLive();
  const globe = useRef<GlobeApi>(null);
  const run = useRef(0);
  const [ready, setReady] = useState(false);
  const [look, setLook] = useState("night");
  const [tab, setTab] = useState<Tab>("view");

  // what is running
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [pathway, setPathway] = useState("fossil");
  const [custom, setCustom] = useState<Custom | null>(null);
  const [engine, setEngine] = useState<Engine>({ state: "idle" });
  const [mission, setMission] = useState<Mission | null>(null);
  const [focus, setFocus] = useState<TopWorldId | null>(null);
  const [scale, setScale] = useState<Scale>("human");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState<{ phrase: NplmPhrase | null; note: string | null } | null>(null);
  /** Worlds the user forced on to look for a consequence beyond the impacted ones (reset per run). */
  const [forced, setForced] = useState<Set<TopWorldId>>(new Set());
  const [bizMap, setBizMap] = useState(false);
  const toggleForced = (w: TopWorldId) => setForced((f) => { const n = new Set(f); if (n.has(w)) n.delete(w); else n.add(w); return n; });
  const [stage, setStage] = useState<string | null>(null);

  // globe choreography (kept from v0.2: engine results tour the rings on the globe)
  const [place, setPlace] = useState<Place | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [off, setOff] = useState<Set<string>>(new Set());
  const [ring, setRing] = useState<string | null>(null);
  const pins = useRef(new Map<string, { at: LL; h: number; cam: number }>());
  const [feed, setFeed] = useState<"image" | "video" | null>(null);
  const [feedScenario, setFeedScenario] = useState("push_edge");
  const [cam, setCam] = useState<"full" | "pip" | null>(null);
  const [camKey, setCamKey] = useState(0);

  /* ---------- derived ---------- */
  // each run is limited to the worlds it impacts (direct + first-step consequences; demos: all)
  const { cascade, scoped } = useMemo(() => {
    if (scenario) {
      const r = runScenario(scenario, pathway, forced);
      return { cascade: r.cascade, scoped: r.worlds };
    }
    if (custom) {
      const full = propagate(custom.seeds, {}, RULES, CONNECTIONS);
      const w = new Set<TopWorldId>([custom.route.world, ...full.effects.filter((e) => e.depth <= 2).map((e) => e.world)]);
      return { cascade: propagate(custom.seeds, {}, RULES, connectionsWithin(new Set([...w, ...forced]))), scoped: w };
    }
    return { cascade: null, scoped: null };
  }, [scenario, pathway, custom, forced]);
  const engView = engine.state === "ok" ? engine.view : null;
  const nodes = useMemo(() => nodesOf(cascade, engView), [cascade, engView]);
  const scope = useMemo(() => {
    if (!scoped && !engView) return null;
    // impacted = the run's own worlds (+ recorded examples' worlds); user-enabled worlds stay "enabled", not impacted
    const s = new Set<string>(scoped ?? []);
    nodes.filter((n) => n.kind === "engine").forEach((n) => s.add(n.world));
    return s;
  }, [scoped, engView, nodes]);
  const start: TopWorldId | null = scenario?.world ?? custom?.route.world ?? (mission && isTop(mission.origin) ? mission.origin : null) ?? (engView && isTop(engView.origin.world) ? engView.origin.world : null);
  const marks = useMemo(() => {
    const m = worldMarks(cascade);
    nodes.filter((n) => n.kind === "engine").forEach((n) => { if (!m[n.world] || ["none", "no_effect", "not_modeled", "unknown"].includes(m[n.world])) m[n.world] = "possible"; });
    if (start) m[start] = "direct";
    return m;
  }, [cascade, nodes, start]);
  const actionLabel = scenario?.title ?? custom?.text ?? (engine.state === "ok" ? engine.r.text : mission?.title) ?? "";
  const active = !!(scenario || custom || mission || engine.state === "ok");
  const showGlobe = focus === "earth" || focus === null;

  /* ---------- globe: engine ring tour (v0.2) ---------- */
  const centerOf = useCallback((key: string, p: Place, r: PhraseResult): LL => {
    if (key === "country" || key === "society") {
      const c = findPlace(r.rings.find((x) => x.key === "country")?.extent) ?? (p.country ? findPlace(p.country) : null);
      return c ?? p;
    }
    if (key === "earth") return { lat: p.lat + 8, lon: p.lon };
    return p;
  }, []);

  const play = useCallback(async (r: PhraseResult, v: ButterflyView, p: Place | null, token: number) => {
    const alive = () => token === run.current;
    setPlace(p);
    setShown(new Set());
    setOff(new Set());
    pins.current.clear();
    const g = globe.current;
    g?.clear();
    if (p && g) {
      await g.fly(p, 9000, 2.8);
      if (!alive()) return;
      g.pin({ id: "origin", at: p, color: "#ff3b3b", size: 15, big: true, label: `⚡ ${r.summary.actor.toUpperCase()} · ${r.summary.predicate.toUpperCase()} · ${p.name.toUpperCase()}` });
      g.pulse(p, "#ff3b3b", 1600);
    }
    const seen = new Set<string>();
    for (const rg of v.rings) {
      if (!alive()) return;
      const hits = v.hits.filter((h) => h.ringKey === rg.key);
      setRing(rg.key);
      setStage(`consequences reach · ${rg.title}${rg.extent ? ` · ${rg.extent}` : ""}${hits.length ? "" : " · no rule matched"}`);
      const geo = RING_GEO[rg.key];
      if (p && g && geo) {
        const c = centerOf(rg.key, p, r);
        if (hits.length) { await g.fly(c, geo.camera, rg.key === "earth" ? 2.6 : 1.5); if (!alive()) return; }
        g.ring(rg.key, c, geo.radius, hits.length ? "#00d4ff" : "#5b6270", !hits.length);
        if (hits.length) {
          g.labels("*", false);
          g.labels("pin-origin", true);
          g.remove("tower");
          const tr = geo.radius * (rg.key === "earth" ? 0.55 : 0.8);
          STACK.forEach((w) => {
            const h = layerH(w, geo.radius);
            g.ring(`tower-${w}`, c, tr, HEX[w], true, h, w === v.origin.world ? 0.9 : 0.4);
            g.tag(`tower-${w}`, offset(c, tr, 270), h, HEX[w], `${worldById(w).icon} ${worldById(w).short.toUpperCase()}${w === v.origin.world ? " ⚡" : ""}`);
          });
        }
        const byWorld = new Map<WorldId, Hit[]>();
        hits.forEach((h) => byWorld.set(h.world, [...(byWorld.get(h.world) ?? []), h]));
        byWorld.forEach((hs, w) => hs.forEach((h, k) => {
          const at = offset(c, geo.radius * (rg.key === "earth" ? 0.55 : 0.8), bearingOf(w, k, hs.length));
          const height = layerH(w, geo.radius);
          pins.current.set(h.id, { at, h: height, cam: geo.camera });
          g.pin({ id: pinTag(w, h.id), at, height, color: HEX[w], size: 11, stagger: hits.indexOf(h), label: `${worldById(w).icon} ${h.about} · ${short(strip(h.text), 54)}` });
        }));
      }
      for (const h of hits) { if (!alive()) return; seen.add(h.id); setShown(new Set(seen)); await wait(260); }
      await wait(hits.length ? 400 : 150);
    }
    if (!alive()) return;
    setRing(null);
    if (p && g) await g.fly(p, 1400000, 2.4, -90);
    if (alive()) setStage(null);
  }, [centerOf]);

  /* ---------- globe: scenario place (data center, energy sources) ---------- */
  const scenarioGlobe = useCallback(async (s: Scenario, pw: string, token: number) => {
    const g = globe.current;
    if (!g) return;
    g.clear();
    if (!s.place) { g.home(); return; }
    await g.fly(s.place, s.pathways ? 520000 : 60000, 2.2, -70);
    if (token !== run.current) return;
    g.pin({ id: "dc", at: s.place, color: "#ff3b3b", size: 15, big: true, label: `⚡ ${s.pathways ? "AI DATA CENTER" : s.title.toUpperCase()} · ILLUSTRATIVE` });
    g.pulse(s.place, "#ff3b3b", s.pathways ? 40000 : 2000);
    if (s.pathways) {
      const src = [
        { id: "gas", b: 300, d: 70000, label: "GAS / COAL PLANT", on: pw === "fossil" },
        { id: "solar", b: 30, d: 90000, label: "SOLAR FARM", on: pw === "low_carbon" },
        { id: "wind", b: 95, d: 130000, label: "WIND FARM", on: pw === "low_carbon" },
        { id: "nuclear", b: 200, d: 150000, label: "NUCLEAR PLANT", on: pw === "low_carbon" },
      ];
      src.forEach((x) => {
        const at = offset(s.place!, x.d, x.b);
        const c = x.on ? HEX.earth : "#6b7280";
        g.arc(`grid-${x.id}`, s.place!, at, c);
        g.pin({ id: `src-${x.id}`, at, color: c, size: 10, label: `${x.label} · ${x.on ? "POSSIBLE (THIS PATHWAY)" : "NOT IN THIS PATHWAY"} · ILLUSTRATIVE` });
      });
    }
  }, []);

  useEffect(() => {
    if (ready && scenario) scenarioGlobe(scenario, pathway, run.current);
  }, [ready, scenario, pathway, scenarioGlobe]);

  /* ---------- actions (ACMP is standalone: router + cascade run here, nothing is fetched) ---------- */
  const reset = () => {
    setForced(new Set());
    setFeed(null);
    setCam(null);
    setMission(null);
    setSelected(null);
    setStage(null);
  };

  const pickScenario = useCallback(async (s: Scenario, pw?: string) => {
    const token = ++run.current;
    reset();
    setCustom(null);
    setScenario(s);
    setPathway(pw ?? s.pathways?.[0]?.id ?? "");
    setFocus(s.world);
    setScale(s.scale ?? "human");
    setSelected("e1");
    setTab("view");
    setEngine({ state: "idle" });
    setStage(`scenario · ${worldById(s.world).name} · illustrative`);
    await wait(1800);
    if (token === run.current) setStage(null);
  }, []);

  const analyze = useCallback(async (text: string, context: string[], trigger?: Trigger): Promise<AnalyzeOutcome> => {
    const token = ++run.current;
    reset();
    setScenario(null);
    setEngine({ state: "idle" });
    // Prediction routing, step 1: NPLM translates the trigger into a phrase (optional)
    setBusy(true);
    setStage("routing · NPLM translates the action into a phrase…");
    let ph: NplmPhrase | null = null;
    let nplmNote: string | null = null;
    try {
      const r = await fetch("/api/nplm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const d = (await r.json()) as { ok: boolean; frame?: unknown; language?: string | null; error?: string };
      if (d.ok) ph = dnaFromFrame(d.frame as Record<string, unknown>, d.language ?? null);
      else nplmNote = d.error ?? "NPLM unavailable";
    } catch {
      nplmNote = "NPLM is not running";
    }
    setBusy(false);
    setStage(null);
    if (token !== run.current) return { ok: false, engine: "offline", text: "Superseded by a newer action." };
    setPhrase(ph ? { phrase: ph, note: null } : { phrase: null, note: nplmNote });
    // step 2: ACMP's rules pick the directly affected world from the phrase (or the words alone)
    const rr = route({ text, verb: ph?.verb ?? null, objects: ph?.objects ?? null });
    const tg = trigger ?? { actor: actorKindOf(text), channel: "chat" as const, source: text };
    const seeds: Seed[] = [{
      world: rr.world, scale: rr.scale, entity: "Your action:", change: short(text, 90), tags: rr.tags, provenance: "authored",
      assumptions: ["the action happens as described", `received as: ${CHANNEL[tg.channel].label.toLowerCase()}`, `actor (guessed from the words): ${ACTOR[tg.actor].label}`, ...context.map((c) => `context: ${c}`)],
    }];
    setCustom({ text, route: rr, seeds });
    setFocus(rr.world);
    setScale(rr.scale ?? "human");
    setSelected("e1");
    const w = worldById(rr.world);
    return {
      ok: true, engine: "offline",
      text: `Trigger: ${ACTOR[tg.actor].icon} ${ACTOR[tg.actor].label} (guessed) via ${CHANNEL[tg.channel].icon} ${CHANNEL[tg.channel].label.toLowerCase()}.\n${ph ? `NPLM phrase: ${ph.dna.filter((d) => d.v).map((d) => `${d.k} ${d.v}`).join(" · ")}` : `NPLM not used (${nplmNote}): routed from the words only.`}\nDirect impact: ${w.icon} ${w.name} (ACMP router, rule ${rr.rule}: ${rr.why}).\nPrototype cascade (illustrative): with no context facts, most connections are UNKNOWN; open the cascade to see what each would need.`,
    };
  }, []);

  const runMission = useCallback(async (m: Mission) => {
    const token = ++run.current;
    const alive = () => token === run.current;
    reset();
    setScenario(null);
    setCustom(null);
    setMission(m);
    setFocus("earth");
    setTab("view");
    setBusy(true);
    const r = missionResult(m);
    const v = viewOfRings(r.rings, { world: m.origin, why: m.why });
    setEngine({ state: "ok", r, view: v, source: "authored" });
    const g = globe.current;
    g?.clear();
    setStage(`acquiring target · ${m.place.label}`);
    if (g) {
      await g.fly(m.place, 2600000, 2.4, -90); if (!alive()) return setBusy(false);
      await g.fly(m.place, 45000, 2.2, -70); if (!alive()) return setBusy(false);
      await g.fly(m.place, 320, 2.2, -48); if (!alive()) return setBusy(false);
    }
    setStage(`entering · ${m.inside}`);
    setCamKey((k) => k + 1);
    setCam("full");
    await wait(6800);
    if (!alive()) return setBusy(false);
    setCam("pip");
    await play(r, v, m.place, token);
    setBusy(false);
  }, [play]);

  const runBundled = useCallback(async (r: PhraseResult) => {
    const token = ++run.current;
    reset();
    setScenario(null);
    setCustom(null);
    setFocus("earth");
    const v = viewOf(r);
    setEngine({ state: "ok", r, view: v, source: "bundled" });
    setBusy(true);
    await play(r, v, placeOfRings(r.rings, r.summary.places), token);
    setBusy(false);
  }, [play]);

  const runDemo = useCallback(async () => {
    if (!data) return;
    const paris = data.phrases.findIndex((p) => /Paris/.test(p.text) && /sell/.test(p.text));
    await runBundled(data.phrases[paris >= 0 ? paris : 0]);
    const token = run.current;
    setStage("demo 2/3 · an image · the same meaning, seen instead of read");
    setFeedScenario("push_edge");
    setFeed("image");
    await wait(9000);
    if (run.current !== token) return;
    setStage("demo 3/3 · a video · predict at T = 2 s, then score against what happened");
    setFeed("video");
    await wait(10000);
    if (run.current === token) setStage(null);
  }, [data, runBundled]);

  // shareable links: ?scenario=id[&pathway=…][&world=…] · ?q=… · ?demo=1
  useEffect(() => {
    if (!ready || !data || !live.checked) return;
    const q = new URLSearchParams(window.location.search);
    const s = q.get("scenario") ? scenarioById(q.get("scenario")!) : null;
    if (s) {
      pickScenario(s, q.get("pathway") ?? undefined).then(() => {
        const w = q.get("world");
        if (w && isTop(w)) setFocus(w);
        const sc = q.get("scale") as Scale | null;
        if (sc) setScale(sc);
        const en = q.getAll("enable").filter(isTop);
        if (en.length) setForced(new Set(en));
      });
    } else if (q.get("demo")) runDemo();
    else if (q.get("q")) analyze(q.get("q")!, q.getAll("ctx"));
    if (q.get("tab")) setTab(q.get("tab") as Tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data, live.checked]);

  useEffect(() => {
    engView?.hits.forEach((h) => globe.current?.setVisible(pinTag(h.world, h.id), !off.has(h.id)));
  }, [off, engView, shown]);

  const select = (id: string | null) => {
    setSelected(id);
    const n = nodes.find((x) => x.id === id);
    if (n) {
      setFocus(n.world);
      if (n.world === "physical" && n.scale) setScale(n.scale);
      const p = n.id.startsWith("acm-") ? pins.current.get(n.id.slice(4)) : null;
      if (p && n.world === "earth") globe.current?.fly(p.at, p.h + p.cam * 0.55, 1.4);
    }
  };

  /* ---------- Action · 3D (always on while an action is selected) ---------- */
  const stage3d: Stage3D | null = useMemo(() => {
    const where = (world: TopWorldId, sc?: Scale) =>
      world === "physical" && sc && sc !== "human"
        ? `This action starts at the ${sc} scale: the Physical World shows it as a conceptual view; nothing is simulated in 3D.`
        : `This action starts in ${worldById(world).name}, not as a physical event at human scale: there is nothing to simulate in 3D.`;
    if (scenario) {
      const sc = scenario.stage?.scene;
      return isScene3D(sc)
        ? { key: `s-${scenario.id}-${pathway}`, scene: sc, how: "scenario", variant: pathway }
        : { key: `s-${scenario.id}`, scene: null, how: "scenario", note: where(scenario.world, scenario.scale) };
    }
    if (custom) {
      const m = sceneForText(custom.text);
      return m
        ? { key: `c-${custom.text}`, scene: m.scene, how: "words", matched: m.matched }
        : { key: `c-${custom.text}`, scene: null, how: "words", note: `${where(custom.route.world, custom.route.scale)} No authored 3D scene matches its words.` };
    }
    return null;
  }, [scenario, custom, pathway]);

  /* ---------- the centre view ---------- */
  const fw: TopWorldId | null = focus;
  const worldNodes = fw ? nodes.filter((n) => n.world === fw && (fw !== "physical" || !n.scale || n.scale === scale || scale === "human")) : [];
  const direct = !!fw && fw === start;
  const frameProps = fw ? { world: fw, scale: fw === "physical" ? scale : undefined, direct, mark: marks[fw], nodes: worldNodes, all: nodes, selected, onSelect: select, actionLabel, s: scenario } : null;

  let centre: React.ReactNode = null;
  if (fw && frameProps && scope && !scope.has(fw) && !forced.has(fw)) {
    const w = worldById(fw);
    centre = (
      <div className="grid h-full place-items-center p-6">
        <div className="glass max-w-[460px] p-5 text-center">
          <p className="text-3xl" aria-hidden>{w.icon}</p>
          <p className="mt-2 text-[16px] font-semibold">{w.name}</p>
          <p className="mono mt-1 text-[11px] uppercase tracking-[.12em] faint">Not impacted in this {scenario ? "scenario" : "run"}</p>
          <p className="dim mt-2 text-[12.5px]">This action does not reach {w.short} in its direct impact or first-step consequences. Enable it to let the cascade extend here and see whether any rule finds a consequence.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn-action !py-1.5" onClick={() => toggleForced(fw)}>Enable {w.short}</button>
            {start && <button type="button" className="hbtn" onClick={() => setFocus(start)}>Back to {worldById(start).short}</button>}
          </div>
        </div>
      </div>
    );
  } else if (fw && frameProps) {
    if (fw === "earth") {
      centre = (
        <ViewFrame {...frameProps} overlay>
          <div className="pointer-events-none flex h-full items-start justify-between gap-2">
            <div className="pointer-events-auto scroll hidden max-h-full flex-col gap-2 overflow-y-auto xl:flex">
              {engView && <WorldsPanel view={engView} shown={shown} off={off} setOff={setOff} selected={selected?.startsWith("acm-") ? selected.slice(4) : null} onPick={(id) => select(`acm-${id}`)} onStep={() => {}} />}
              {engView && <ReachPanel view={engView} current={ring} place={place} onJump={(k) => { const geo = RING_GEO[k]; if (geo && place && engine.state === "ok") globe.current?.fly(centerOf(k, place, engine.r), geo.camera, 1.6); setRing(k); }} />}
            </div>
            <div className="scroll pointer-events-auto ml-auto max-h-full overflow-y-auto"><EarthPanel s={scenario} pathway={pathway} setPathway={setPathway} nodes={worldNodes} direct={direct} actionLabel={actionLabel} /></div>
          </div>
        </ViewFrame>
      );
    } else {
      let visual: React.ReactNode;
      if (fw === "government") visual = <GovernmentBoard s={scenario} nodes={worldNodes} direct={direct} onSelectNode={select} actionLabel={actionLabel} />;
      else if (fw === "society") visual = <EconomyBoard s={scenario} nodes={worldNodes} direct={direct} onSelectNode={select} actionLabel={actionLabel} />;
      else if (fw === "business") visual = bizMap
        ? <GenericVisual world="business" nodes={worldNodes} direct={direct} hit={scenario?.stage?.hit} actionLabel={actionLabel} s={scenario} />
        : <BusinessBoard s={scenario} nodes={worldNodes} direct={direct} onSelectNode={select} actionLabel={actionLabel} />;
      else if (fw === "media") visual = <MediaBoard s={scenario} nodes={worldNodes} direct={direct} actionLabel={actionLabel} />;
      else if (fw === "physical") visual = <PhysicalVisual s={scenario} scale={scale} onScale={setScale} direct={direct && (scenario?.scale ?? custom?.route.scale ?? "human") === scale} actionLabel={actionLabel} nodes={worldNodes} threeDAbove={!!stage3d?.scene} />;
      else visual = <GenericVisual world={fw} nodes={worldNodes} direct={direct} hit={scenario?.stage?.hit} actionLabel={actionLabel} s={scenario} />;
      centre = (
        <ViewFrame {...frameProps} extra={scenario?.missionId && fw === "physical" ? (
          <div className="px-4 pt-1"><button type="button" className="hbtn !py-1 !text-[10px]" onClick={() => { const m = MISSIONS.find((x) => x.id === scenario.missionId); if (m) { setMission(m); setCamKey((k) => k + 1); setCam("full"); } }}>▶ Look inside (authored CAM mockup)</button></div>
        ) : fw === "business" ? (
          <div className="flex gap-1 px-4 pt-1" role="group" aria-label="Business view">
            <button type="button" className="hbtn !py-1 !text-[10px]" aria-pressed={!bizMap} onClick={() => setBizMap(false)}>Market & events</button>
            <button type="button" className="hbtn !py-1 !text-[10px]" aria-pressed={bizMap} onClick={() => setBizMap(true)}>Company map</button>
          </div>
        ) : undefined}>
          {visual}
        </ViewFrame>
      );
    }
  }

  const engineNote = engine.state === "ok"
    ? engine.source === "authored" ? `Authored mission (mockup): ${engine.view.hits.length} hand-written consequences, labelled illustrative.` : `Recorded example (bundled data in ACMP): ${engine.view.hits.length} consequences by ring, shown in their own column; their worlds are a display mapping.`
    : null;

  const tabCls = (t: Tab) => `${tab === t ? "flex" : "hidden"} lg:flex`;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--bg)]">
      {/* header */}
      <header className="flex flex-none flex-wrap items-center gap-x-4 gap-y-1.5 border-b hairline px-3 pb-2 pt-3 sm:px-4">
        <div className="flex min-w-0 flex-col gap-1"><Brand /><Credit under /></div>
        <p className="mono ml-auto hidden text-[10px] tracking-wider sm:block" style={{ color: !live.checked ? "var(--text-faint)" : live.text ? "var(--good)" : "var(--warn)" }} title={live.reason}>
          ● STANDALONE
        </p>
        <div className="w-full min-w-0"><MainNav /></div>
        <div className="flex w-full gap-1 lg:hidden" role="tablist" aria-label="Panels">
          {(["worlds", "view", "cascade", "console"] as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className="hbtn flex-1 !py-1 !text-[10px]" aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[268px_minmax(0,1fr)_420px] xl:grid-cols-[288px_minmax(0,1fr)_500px]">
        {/* left: world navigator */}
        <aside className={`${tabCls("worlds")} scroll min-h-0 flex-col gap-2 overflow-y-auto p-2`}>
          <WorldNav focus={focus} onFocus={(w) => { setFocus(w); setTab("view"); }} scale={scale} onScale={setScale} marks={marks} nodes={nodes} active={active} scope={scope} forced={forced} onForce={toggleForced} />
        </aside>

        {/* centre: world view + cascade */}
        <main className={`${tab === "view" || tab === "cascade" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}>
          {stage3d && <div className={`${tab === "view" ? "block" : "hidden"} lg:block`}><ActionStage3D stage={stage3d} /></div>}
          <div className={`${tab === "view" ? "flex" : "hidden"} relative min-h-[360px] flex-[3] flex-col lg:flex`}>
            <div className={`absolute inset-0 ${showGlobe ? "" : "invisible"}`} aria-hidden={!showGlobe}>
              <Globe ref={globe} look={look} onReady={() => setReady(true)} />
            </div>
            {!fw && (
              <div className="scroll absolute inset-0 z-10 overflow-y-auto p-3">
                <div className="glass brackets rise mx-auto max-w-[620px] p-5">
                  <p className="classif">Briefing // 30 seconds</p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight">1 actor · 1 action = <span className="accent">consequences in cascade.</span></h2>
                  <p className="dim mt-3 text-[14px] leading-relaxed">
                    Language models predict the next <i>word</i>. This model predicts the next <b className="text-[var(--text)]">state of the world</b> after an action:
                    the world it directly impacts, then possible consequences in any of ten worlds, each with the rule, assumptions and source behind it.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="btn-action" onClick={() => pickScenario(CATALOG.find((s) => s.id === "lightning_datacenter")!)}>⚡ Try: lightning strikes a data center</button>
                    <button type="button" className="hbtn" onClick={() => { setTab("console"); setTimeout(() => document.getElementById("action-prompt")?.focus(), 50); }}>Write your own action</button>
                    <button type="button" className="hbtn" onClick={runDemo} disabled={!data || busy}>▶ Run demo (engine output)</button>
                  </div>
                  <p className="faint mt-3 text-[11.5px]">Pick a scenario on the right (one per world) or describe an action. Select a world on the left to change the view.</p>
                </div>
                <div className="mx-auto mt-3 flex max-w-[860px] justify-center">
                  <CommandBar examples={data?.phrases ?? []} busy={busy} onExample={(i) => data && runBundled(data.phrases[i])} onDemo={runDemo} look={look} setLook={setLook} stage={null} />
                </div>
                <div className="mx-auto mt-3 max-w-[620px] opacity-95"><WorldStack compact /></div>
              </div>
            )}
            {fw && <div className={`relative z-10 h-full ${showGlobe ? "" : "bg-[var(--bg)]"}`}>{centre}</div>}
            {mission && cam && (
              <div className={cam === "full" ? "absolute left-1/2 top-16 z-30 -translate-x-1/2" : "absolute bottom-3 left-3 z-30 w-[300px] [&_section]:!w-[300px] [&_footer]:hidden"}>
                <SceneCam m={mission} playKey={camKey} live={live.text} onClose={() => setCam(null)} onLive={() => { setCam("pip"); analyze(mission.sentence, mission.context); }} />
              </div>
            )}
            {feed && data && (
              <div className="absolute left-1/2 top-12 z-30 max-h-[calc(100%-120px)] -translate-x-1/2 overflow-hidden">
                <SensorFeed flows={data.flows as unknown as Flows} mode={feed} scenario={feedScenario} setScenario={setFeedScenario} onClose={() => setFeed(null)} />
              </div>
            )}
            {stage && <p className="glass mono absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-lg px-3 py-1 text-[10.5px] uppercase tracking-[.14em] text-[var(--accent)]">{stage}</p>}
          </div>
          <div className={`${tab === "cascade" ? "flex" : "hidden"} min-h-[280px] flex-[2] flex-col border-t hairline lg:flex`}>
            <CascadePanel nodes={nodes} cascade={cascade} selected={selected} onSelect={select} actionLabel={actionLabel} s={scenario} engineNote={engineNote} />
          </div>
        </main>

        {/* right: scenarios + conversation */}
        <aside className={`${tabCls("console")} scroll min-h-0 flex-col overflow-y-auto border-l hairline`}>
          <ConsoleChat active={scenario?.id ?? null} pathway={pathway} setPathway={setPathway} onScenario={(s) => pickScenario(s)} onMission={runMission}
            onAnalyze={analyze} r={null} phrase={custom ? phrase : null} busy={busy} live={live.text} liveReason={live.reason} current={scenario} />
          {engine.state === "ok" && (
            <div className="border-t hairline">
              <p className="hud-label px-4 pt-3 !text-[var(--accent)]">{engine.source === "authored" ? "Authored mission · result" : "Recorded example · result"} <span className={`prov ml-1 ${engine.source === "authored" ? "prov-ill" : "prov-engine"}`}>{engine.source === "authored" ? "illustrative" : "recorded · bundled"}</span></p>
              <IntelPanel key={engine.r.text + engine.r.context.join("|")} r={engine.r} view={engine.view} shown={new Set(engine.view.hits.map((h) => h.id))} place={place}
                selected={selected?.startsWith("acm-") ? selected.slice(4) : null} onSelect={(id) => select(id ? `acm-${id}` : null)} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
