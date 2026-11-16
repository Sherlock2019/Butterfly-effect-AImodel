"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, type GlobeApi } from "@/components/Globe";
import { bearingOf } from "@/components/ButterflyRadar";
import { CommandBar } from "@/components/console/CommandBar";
import { Intake } from "@/components/console/Intake";
import { IntelPanel, ReachPanel, WorldsPanel, cascadeOrder } from "@/components/console/Panels";
import { SensorFeed, type Flows } from "@/components/console/SensorFeed";
import { Mark } from "@/components/ui";
import { SceneCam } from "@/components/console/SceneCam";
import { STACK, viewOf, viewOfRings, type ButterflyView, type Hit } from "@/lib/butterfly";
import { MISSIONS, missionResult, type Mission } from "@/lib/scenarios";
import { postJson, useJson, useLive } from "@/lib/data";
import { RING_GEO, findPlace, offset, placeOfRings, pointOf, type LL, type Place } from "@/lib/geo";
import type { DemoResults, PhraseResult } from "@/lib/types";
import { HEX, worldById, type WorldId } from "@/lib/worlds";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const strip = (t: string) => t.replace(/:\s*(advanced|enabled|blocked|at risk|hindered|unaffected)\s*$/, (m) => ` — ${m.slice(1).trim().toUpperCase()}`);
const short = (s: string, n = 52) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
/** Each world floats at its own altitude over the action: atomic lowest, earth highest (∝ the ring's scale). */
const layerH = (w: WorldId, radius: number) => (STACK.indexOf(w) + 1) * radius * 0.16;
const pinTag = (w: WorldId, id: string) => `${w}-${id}~`;

function Clock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const f = () => setNow(new Date().toISOString().replace("T", " ").slice(0, 19) + "Z");
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="rec">REC {now}</span>;
}

export default function ClassicConsole() {
  const { data } = useJson<DemoResults>("demo_results.json");
  const live = useLive();
  const globe = useRef<GlobeApi>(null);
  const run = useRef(0);
  const [ready, setReady] = useState(false);
  const [look, setLook] = useState("night");
  const [result, setResult] = useState<PhraseResult | null>(null);
  const [view, setView] = useState<ButterflyView | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [off, setOff] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const pins = useRef(new Map<string, { at: LL; h: number; cam: number }>());
  const [ring, setRing] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState<"image" | "video" | null>(null);
  const [scenario, setScenario] = useState("push_edge");
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState(true);
  const [mission, setMission] = useState<Mission | null>(null);
  const [cam, setCam] = useState<"full" | "pip" | null>(null);
  const [camKey, setCamKey] = useState(0);

  /** Where a ring sits on the map: the country ring around the country, the rest around the place. */
  const centerOf = useCallback((key: string, p: Place, r: PhraseResult): LL => {
    if (key === "country" || key === "society") {
      const c = findPlace(r.rings.find((x) => x.key === "country")?.extent) ?? (p.country ? findPlace(p.country) : null);
      return c ?? p;
    }
    if (key === "earth") return { lat: p.lat + 8, lon: p.lon };
    return p;
  }, []);

  const play = useCallback(async (r: PhraseResult, opts?: { view: ButterflyView; place: Place; token: number }) => {
    const token = opts?.token ?? ++run.current;
    const alive = () => token === run.current;
    const v = opts?.view ?? viewOf(r);
    const p = opts ? opts.place : placeOfRings(r.rings, r.summary.places);
    if (!opts) setCam(null);
    setResult(r);
    setView(v);
    setPlace(p);
    setShown(new Set());
    setOff(new Set());
    setSelected(null);
    pins.current.clear();
    setError(null);
    const g = globe.current;
    g?.clear();
    setStage(`2 · routing · WHERE ${p ? p.name : "not stated"} → ★ ${worldById(v.origin.world).name}`);
    if (p && g) {
      await g.fly(p, 9000, 2.8);
      if (!alive()) return;
      g.pin({ id: "origin", at: p, color: "#ffffff", size: 15, big: true, label: `★ ${r.summary.actor.toUpperCase()} · ${r.summary.predicate.toUpperCase()} · ${p.name.toUpperCase()}` });
      g.pulse(p, "#00d4ff", 1600);
    } else {
      g?.home();
      await wait(900);
    }
    const seen = new Set<string>();
    for (const rg of v.rings) {
      if (!alive()) return;
      const hits = v.hits.filter((h) => h.ringKey === rg.key);
      setRing(rg.key);
      setStage(`3 · consequences reach · ${rg.title}${rg.extent ? ` · ${rg.extent}` : ""}${hits.length ? "" : " · no rule matched"}`);
      const geo = RING_GEO[rg.key];
      if (p && g && geo) {
        const c = centerOf(rg.key, p, r);
        const nb = rg.key === "neighbour" ? (rg.extent ?? "").split(",").map((s) => s.trim()).filter((s) => pointOf(s)) : [];
        if (hits.length || nb.length) {
          await g.fly(c, geo.camera, rg.key === "earth" ? 2.6 : 1.5);
          if (!alive()) return;
        }
        g.ring(`${rg.key}`, c, geo.radius, hits.length ? "#00d4ff" : "#5b6270", !hits.length);
        nb.forEach((name, i) => {
          const at = pointOf(name)!;
          g.arc(`nb-${i}`, p, at, "#00d4ff");
          g.pin({ id: `nb-${i}`, at, color: "#00d4ff", size: 8, label: `${name.toUpperCase()} · NEIGHBOUR` });
        });
        if (hits.length) {
          // earlier rings fade to dots + leader lines; only this ring's callouts stay labelled
          g.labels("*", false);
          g.labels("pin-origin", true);
          // the world tower at this scale: eight stacked rings, one per world, labelled on the west side
          g.remove("tower");
          const tr = geo.radius * (rg.key === "earth" ? 0.55 : 0.8);
          STACK.forEach((w) => {
            const h = layerH(w, geo.radius);
            g.ring(`tower-${w}`, c, tr, HEX[w], true, h, w === v.origin.world ? 0.9 : 0.4);
            g.tag(`tower-${w}`, offset(c, tr, 270), h, HEX[w], `${worldById(w).icon} ${worldById(w).short.toUpperCase()}${w === v.origin.world ? " ★" : ""}`);
          });
        }
        const byWorld = new Map<WorldId, Hit[]>();
        hits.forEach((h) => byWorld.set(h.world, [...(byWorld.get(h.world) ?? []), h]));
        byWorld.forEach((hs, w) =>
          hs.forEach((h, k) => {
            const at = offset(c, geo.radius * (rg.key === "earth" ? 0.55 : 0.8), bearingOf(w, k, hs.length));
            const height = layerH(w, geo.radius);
            pins.current.set(h.id, { at, h: height, cam: geo.camera });
            g.pin({ id: pinTag(w, h.id), at, height, color: HEX[w], size: 11, stagger: hits.indexOf(h), label: `${worldById(w).icon} ${h.about} · ${short(strip(h.text), 54)}` });
          }),
        );
      }
      for (const h of hits) {
        if (!alive()) return;
        seen.add(h.id);
        setShown(new Set(seen));
        await wait(320);
      }
      await wait(hits.length ? 500 : 180);
    }
    if (!alive()) return;
    setRing(null);
    const own = v.hits.find((h) => /own goal/.test(h.text));
    setStage(`5 · compared with the desired outcome · ${own ? strip(own.text).replace("own goal ", "") : "no goal stated"}`);
    if (p && g) await g.fly(p, 1400000, 2.4, -90);
    await wait(2600);
    if (alive()) setStage(null);
  }, [centerOf]);

  const runText = useCallback(async (text: string, context: string[]) => {
    setBusy(true);
    setFeed(null);
    setStage("1 · reading the meaning · Phrase DNA…");
    try {
      const r = await postJson<PhraseResult>("live parsing", { text, context });
      await play(r);
    } catch (e) {
      setError((e as Error).message);
      setStage(null);
    } finally {
      setBusy(false);
    }
  }, [play]);

  const runExample = useCallback(async (i: number) => {
    if (!data) return;
    setBusy(true);
    setFeed(null);
    setStage("1 · recorded example (bundled)");
    await wait(500);
    await play(data.phrases[i]);
    setBusy(false);
  }, [data, play]);

  const runDemo = useCallback(async () => {
    if (!data) return;
    setBusy(true);
    setFeed(null);
    const token = run.current + 1;
    const paris = data.phrases.findIndex((p) => /Paris/.test(p.text) && /sell/.test(p.text));
    setStage("demo 1/3 · a phrase · recorded example");
    await wait(600);
    await play(data.phrases[paris >= 0 ? paris : 0]);
    if (run.current !== token) return setBusy(false);
    setStage("demo 2/3 · an image · the same meaning, seen instead of read");
    setScenario("push_edge");
    setFeed("image");
    await wait(9000);
    if (run.current !== token) return setBusy(false);
    setStage("demo 3/3 · a video · predict at T = 2 s, then score against what happened");
    setFeed("video");
    await wait(10000);
    if (run.current === token) setStage(null);
    setBusy(false);
  }, [data, play]);

  /** A mission: dive from orbit to the place, look inside, watch the action, then the cascade. */
  const runMission = useCallback(async (m: Mission) => {
    const token = ++run.current;
    const alive = () => token === run.current;
    setBusy(true);
    setFeed(null);
    setCam(null);
    setMission(m);
    setError(null);
    const g = globe.current;
    g?.clear();
    const r = missionResult(m);
    const v = viewOfRings(r.rings, { world: m.origin, why: m.why });
    setStage(`acquiring target · ${m.place.label}`);
    if (g) {
      await g.fly(m.place, 2600000, 2.4, -90);
      if (!alive()) return setBusy(false);
      setStage(`descending · ${m.city}, ${m.country}`);
      await g.fly(m.place, 45000, 2.2, -70);
      if (!alive()) return setBusy(false);
      await g.fly(m.place, 2200, 2.2, -60);
      if (!alive()) return setBusy(false);
      g.pin({ id: "target", at: m.place, color: "#00d4ff", size: 13, big: true, label: `◎ TARGET · ${m.place.label.split("(")[0].trim().toUpperCase()}` });
      g.pulse(m.place, "#00d4ff", 220);
      await g.fly(m.place, 320, 2.2, -48);
      if (!alive()) return setBusy(false);
    }
    setStage(`entering · ${m.inside}`);
    setCamKey((k) => k + 1);
    setCam("full");
    await wait(6800);
    if (!alive()) return setBusy(false);
    setCam("pip");
    await play(r, { view: v, place: m.place, token });
    setBusy(false);
  }, [play]);

  // ?demo=1 starts the demo; ?q=... tests a sentence (shareable links, like GEV's share links)
  useEffect(() => {
    if (!ready || !data || !live.checked) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("demo")) runDemo();
    else if (q.get("q") && live.text) runText(q.get("q")!, q.getAll("ctx"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data, live.checked]);

  // the left column decides which consequences the globe shows: all, a selection, or one by one
  useEffect(() => {
    view?.hits.forEach((h) => globe.current?.setVisible(pinTag(h.world, h.id), !off.has(h.id)));
  }, [off, view, shown]);

  const pick = (id: string) => {
    setSelected(id);
    const p = pins.current.get(id);
    const h = view?.hits.find((x) => x.id === id);
    if (h) globe.current?.labels(pinTag(h.world, h.id), true);
    if (p) globe.current?.fly(p.at, p.h + p.cam * 0.55, 1.4);
  };

  const step = (dir: 1 | -1) => {
    if (!view) return;
    const order = cascadeOrder(view, shown);
    if (!order.length) return;
    const i = selected ? order.findIndex((h) => h.id === selected) : -1;
    const next = order[(i + dir + order.length) % order.length];
    setOff(new Set(order.filter((h) => h.id !== next.id).map((h) => h.id)));
    pick(next.id);
  };

  const jump = (key: string) => {
    if (!place || !result) return;
    const geo = RING_GEO[key];
    if (geo) globe.current?.fly(centerOf(key, place, result), geo.camera, 1.6);
    setRing(key);
  };

  const visibleShown = new Set([...shown].filter((id) => !off.has(id)));

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--bg)]">
      <Globe ref={globe} look={look} onReady={() => setReady(true)} />

      {/* top-left: title + classification */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-5">
        <div className="pointer-events-auto flex items-center gap-3">
          <Mark size={38} />
          <div>
            <h1 className="hud-title text-[19px] leading-none sm:text-[22px]">Butterfly <span className="accent">Eye View</span></h1>
            <p className="hud-label mt-1">The Butterfly Model · ACMP</p>
          </div>
        </div>
        <p className="classif mt-3">Classic console (v0.2) // 10 worlds // rule-grounded</p>
        <p className="hud-label mt-1">look · {look}</p>
      </div>

      {/* top-center: nav */}
      <nav className="absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 gap-1.5 xl:flex" aria-label="Main">
        <Link href="/briefing" className="hbtn">§ Briefing</Link>
        <Link href="/scenarios" className="hbtn">E1 Scenarios</Link>
        <Link href="/inference" className="hbtn">E2 What next?</Link>
        <Link href="/lab" className="hbtn">E3 Physics lab</Link>
      </nav>

      {/* top-right: status */}
      <div className="absolute right-4 top-4 z-10 text-right sm:right-6 sm:top-5">
        <p className="mono text-[11px] tracking-wider"><Clock /></p>
        <p className="mono mt-1 text-[10.5px] tracking-wider" style={{ color: !live.checked ? "var(--text-faint)" : live.text ? "var(--good)" : "var(--warn)" }} title={live.reason}>
          {!live.checked ? "MODEL · CHECKING" : live.text ? "MODEL · LIVE" : "MODEL · DEMO DATA"}
          {live.llm && <span className="faint"> · LLM {live.llmReason.split(" ")[0]}</span>}
        </p>
        <div className="mt-2 flex justify-end gap-1.5 xl:hidden">
          <Link href="/briefing" className="hbtn !px-2 !py-1 !text-[10px]">§ Briefing</Link>
          <button className="hbtn !px-2 !py-1 !text-[10px]" onClick={() => setIntel((v) => !v)} aria-pressed={intel}>Intel</button>
        </div>
      </div>

      {/* left stack */}
      <div className="scroll absolute left-4 top-36 z-10 hidden max-h-[calc(100vh-250px)] flex-col gap-3 lg:flex sm:left-6">
        <WorldsPanel view={view} shown={shown} off={off} setOff={setOff} selected={selected} onPick={pick} onStep={step} />
        <ReachPanel view={view} current={ring} onJump={jump} place={place} />
      </div>

      {/* centre: intro or sensor feed */}
      {!result && !feed && (
        <div className="absolute left-1/2 top-1/2 z-10 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-[60%] lg:left-[calc(50%-150px)]">
          <div className="glass brackets rise p-6">
            <p className="classif">Briefing // 30 seconds</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight">1 actor · 1 action = <span className="accent">consequences in cascade.</span></h2>
            <p className="dim mt-3 text-[14.5px] leading-relaxed">
              Language models predict the next <i>word</i>. This model predicts the next <b className="text-[var(--text)]">state of the world</b> after an action:
              what changes, for whom, in which of ten worlds, and how far it reaches, with the rule behind every claim.
            </p>
            <div className="glass-flat mt-4 px-4 py-3 text-[13px]">
              <p className="dim"><i>Mark wants John&apos;s car. John sold it to Sarah.</i> What happens to Mark?</p>
              <p className="mt-1.5"><span className="mono faint">LLM ›</span> &ldquo;Mark buys a car.&rdquo; <span className="text-[var(--bad)]">✕ wrong, and it can&apos;t tell</span></p>
              <p className="mt-1"><span className="mono accent">Model ›</span> Mark&apos;s goal is <b>BLOCKED</b>: <span className="mono text-[12px]">has(Sarah, car)</span>, ownership is exclusive. <span className="faint">rule · certainty 1.0</span></p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="hbtn-primary" onClick={runDemo} disabled={!data || busy}>▶ Run demo</button>
              <Link href="/briefing" className="hbtn">Read the briefing</Link>
            </div>
            <p className="faint mt-3 text-[11.5px]">Or type an action in the intake on the right: the globe flies to its WHERE, each world floats at its own altitude, and the consequences ripple out ring by ring, from the street to the planet.</p>
          </div>
        </div>
      )}
      {mission && cam && (
        <div className={cam === "full"
          ? "absolute left-1/2 top-24 z-20 -translate-x-1/2 lg:left-[calc(50%-150px)]"
          : "absolute bottom-32 left-4 z-20 w-[320px] sm:left-6 lg:left-[310px] [&_section]:!w-[320px] [&_footer]:hidden"}>
          <SceneCam m={mission} playKey={camKey} live={live.text} onClose={() => setCam(null)}
            onLive={() => { setCam("pip"); runText(mission.sentence, mission.context); }} />
          {cam === "pip" && (
            <button className="hbtn mt-1 !py-1 !text-[9.5px]" onClick={() => { setCamKey((k) => k + 1); setCam("full"); }}>⤢ replay inside</button>
          )}
        </div>
      )}
      {feed && data && (
        <div className="absolute left-1/2 top-24 z-20 max-h-[calc(100vh-260px)] -translate-x-1/2 overflow-hidden lg:left-[calc(50%-150px)]">
          <SensorFeed flows={data.flows as unknown as Flows} mode={feed} scenario={scenario} setScenario={setScenario} onClose={() => setFeed(null)} />
        </div>
      )}

      {/* right: intake chat (Phrase DNA) + intel */}
      {intel && (
        <aside className="glass scroll absolute bottom-28 right-3 top-[88px] z-10 flex w-[min(400px,calc(100vw-24px))] flex-col !p-0 sm:right-6">
          <div className="border-b hairline p-4">
            <p className="hud-label mb-2 !text-[var(--accent)]">Missions · predefined scenarios</p>
            <ul className="flex flex-col gap-1">
              {MISSIONS.map((m) => (
                <li key={m.id}>
                  <button type="button" disabled={busy} onClick={() => runMission(m)}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:border-[var(--accent)] ${mission?.id === m.id ? "border-[var(--accent)] bg-[var(--accent-dim)]" : "border-[var(--glass-border)]"}`}>
                    <span className="text-lg">{m.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">{m.title}</span>
                      <span className="mono faint block truncate text-[10px]">{m.place.label.replace(" (illustrative)", "")} · {m.actors.map((a) => a.kind).filter((k, i, s) => s.indexOf(k) === i).join(" · ")}</span>
                    </span>
                    <span className="accent text-xs">▶</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="faint mt-1.5 text-[10.5px]">Mockups: authored scenes and consequences, illustrative locations. Each can be re-tested on the live model.</p>
          </div>
          <div className="border-b hairline p-4">
            <p className="hud-label mb-2.5 !text-[var(--accent)]">Action intake · who does what</p>
            <Intake r={result} busy={busy} live={live.text} liveReason={live.reason} onAction={runText} />
            {error && <p className="mt-2 text-[12px] text-[var(--bad)]">{error}</p>}
          </div>
          {result && view && (
            <IntelPanel key={result.text + result.context.join("|")} r={result} view={view} shown={visibleShown} place={place} selected={selected} onSelect={(id) => (id ? pick(id) : setSelected(null))} />
          )}
        </aside>
      )}

      {/* bottom: demo · examples · visual presets */}
      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 lg:left-[calc(50%-90px)]">
        <CommandBar examples={data?.phrases ?? []} busy={busy} onExample={runExample} onDemo={runDemo} look={look} setLook={setLook} stage={stage} />
      </div>

      {/* bottom-left: coordinates + credits */}
      <div className="mono faint pointer-events-none absolute bottom-4 left-4 z-10 hidden text-[10.5px] leading-relaxed 2xl:block sm:left-6">
        {place ? <p className="text-[var(--text-dim)]">{place.lat.toFixed(4)}°N {place.lon.toFixed(4)}°E · {place.name.toUpperCase()}</p> : <p>WHERE · not stated</p>}
        <p>Interface adapted from God&apos;s Eye View (MIT)</p>
      </div>
    </div>
  );
}
