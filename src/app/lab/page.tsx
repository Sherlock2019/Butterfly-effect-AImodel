"use client";

/**
 * E3 · Physics lab: a 2D rigid-body engine (matter.js) stands in for the physical world's real
 * engine (Unreal Engine 5 / Chaos, planned). Object properties come from a small library and are
 * ASSUMED, never measured. Events become consequences per world: physical (motion), atomic
 * (fracture rule), perception (an audible impact); the other worlds are not modelled here.
 */

import Matter from "matter-js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/Nav";
import { Plain, WorldTag } from "@/components/ui";
import { HEX, type WorldId } from "@/lib/worlds";

const PX = 400; // px per metre
const W = 820, H = 430, FLOOR = 410, TABLE_TOP = FLOOR - 0.75 * PX, TX0 = 140, TX1 = 140 + 1.2 * PX;

interface Obj { id: string; label: string; material: string; w: number; h: number; mass: number; fragile: boolean; breakSpeed: number; friction: number; restitution: number; color: string; x: number }
const LIBRARY: Obj[] = [
  { id: "cup", label: "tea cup", material: "porcelain", w: 0.08, h: 0.09, mass: 0.3, fragile: true, breakSpeed: 2.5, friction: 0.4, restitution: 0.1, color: "#e9e4da", x: 1.05 },
  { id: "glass", label: "wine glass", material: "glass", w: 0.07, h: 0.16, mass: 0.2, fragile: true, breakSpeed: 1.8, friction: 0.3, restitution: 0.05, color: "#9cc3ea", x: 0.75 },
  { id: "ball", label: "rubber ball", material: "rubber", w: 0.1, h: 0.1, mass: 0.15, fragile: false, breakSpeed: 99, friction: 0.6, restitution: 0.75, color: "#e66767", x: 0.45 },
  { id: "book", label: "book", material: "paper", w: 0.22, h: 0.04, mass: 0.6, fragile: false, breakSpeed: 99, friction: 0.7, restitution: 0.05, color: "#9085e9", x: 0.2 },
];
const ACTORS = ["a cat", "a child", "me", "a robot arm"];
type Action = "push" | "flick" | "drop" | "nudge";

interface LabEvent { t: number; world: WorldId; text: string; basis: "simulation" | "rule" | "not modelled" }

export default function Lab() {
  const host = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const [actor, setActor] = useState(ACTORS[0]);
  const [target, setTarget] = useState("cup");
  const [action, setAction] = useState<Action>("push");
  const [speed, setSpeed] = useState(1.6); // with μ = 0.4 a cup slides v²/(2μg) ≈ 0.33 m: over the edge
  const [events, setEvents] = useState<LabEvent[]>([]);
  const [run, setRun] = useState(0);
  const settings = useRef({ actor, action, speed });
  settings.current = { actor, action, speed };

  useEffect(() => {
    if (!host.current) return;
    const { actor, action, speed } = settings.current;
    const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter;
    const engine = Engine.create();
    // matter.js gravity is in px/ms² × 0.001: g = 9.81 m/s² at PX px/m
    engine.gravity.y = (9.81 * PX) / 1000;
    engineRef.current = engine;
    const render = Render.create({ element: host.current, engine, options: { width: W, height: H, wireframes: false, background: "transparent", pixelRatio: window.devicePixelRatio } });
    const floor = Bodies.rectangle(W / 2, FLOOR + 20, W * 2, 40, { isStatic: true, label: "floor", render: { fillStyle: "#2b2622" } });
    const top = Bodies.rectangle((TX0 + TX1) / 2, TABLE_TOP + 6, TX1 - TX0, 12, { isStatic: true, label: "table", friction: 0.5, render: { fillStyle: "#8c6b45" } });
    const leg1 = Bodies.rectangle(TX0 + 14, (TABLE_TOP + FLOOR) / 2 + 6, 10, FLOOR - TABLE_TOP - 12, { isStatic: true, isSensor: true, render: { fillStyle: "#6e5334" } });
    const leg2 = Bodies.rectangle(TX1 - 14, (TABLE_TOP + FLOOR) / 2 + 6, 10, FLOOR - TABLE_TOP - 12, { isStatic: true, isSensor: true, render: { fillStyle: "#6e5334" } });
    const bodies = new Map<string, Matter.Body>();
    LIBRARY.forEach((o) => {
      const b = o.id === "ball"
        ? Bodies.circle(TX0 + o.x * PX, TABLE_TOP - (o.h * PX) / 2, (o.w * PX) / 2, { label: o.id, friction: o.friction, restitution: o.restitution, render: { fillStyle: o.color } })
        : Bodies.rectangle(TX0 + o.x * PX, TABLE_TOP - (o.h * PX) / 2, o.w * PX, o.h * PX, { label: o.id, friction: o.friction, restitution: o.restitution, chamfer: { radius: 4 }, render: { fillStyle: o.color } });
      Body.setMass(b, o.mass * 10);
      bodies.set(o.id, b);
    });
    Composite.add(engine.world, [floor, top, leg1, leg2, ...bodies.values()]);

    const t0 = performance.now();
    const t = () => Math.round((performance.now() - t0) / 10) / 100;
    const log: LabEvent[] = [];
    const push = (e: LabEvent) => { log.push(e); setEvents([...log]); };
    const flags = new Set<string>();
    const obj = LIBRARY.find((o) => o.id === target)!;
    const b = bodies.get(target)!;

    if (run > 0) {
      const v = (speed * PX) / 60; // m/s → px per 16.7 ms step
      if (action === "drop") {
        Body.setPosition(b, { x: TX1 + 60, y: TABLE_TOP - 0.3 * PX });
        push({ t: 0, world: "physical", text: `${actor} lifts the ${obj.label} past the edge and lets go`, basis: "simulation" });
      } else {
        const sp = action === "flick" ? v * 2.2 : action === "nudge" ? v * 0.35 : v;
        Body.setVelocity(b, { x: sp, y: 0 });
        push({ t: 0, world: "physical", text: `${actor} ${action === "flick" ? "flicks" : action === "nudge" ? "nudges" : "pushes"} the ${obj.label} toward the edge at ${(action === "flick" ? speed * 2.2 : action === "nudge" ? speed * 0.35 : speed).toFixed(1)} m/s`, basis: "simulation" });
      }
    }

    Events.on(engine, "afterUpdate", () => {
      bodies.forEach((body, id) => {
        const o = LIBRARY.find((x) => x.id === id)!;
        if (!flags.has(`${id}:edge`) && body.position.x > TX1) {
          flags.add(`${id}:edge`);
          push({ t: t(), world: "physical", text: `the ${o.label} crosses the table edge: its centre of mass is past the support`, basis: "simulation" });
        }
        if (!flags.has(`${id}:fall`) && body.position.y > TABLE_TOP + 20 && body.velocity.y > 1) {
          flags.add(`${id}:fall`);
          push({ t: t(), world: "physical", text: `the ${o.label} falls (gravity, 9.81 m/s²)`, basis: "simulation" });
        }
        if (!flags.has(`${id}:rest`) && flags.has(`${id}:land`) && body.speed < 0.05) {
          flags.add(`${id}:rest`);
          push({ t: t(), world: "physical", text: `the ${o.label} comes to rest on the floor`, basis: "simulation" });
        }
      });
    });
    Events.on(engine, "collisionStart", (ev) => {
      ev.pairs.forEach((p) => {
        const [a, c] = p.bodyA.label === "floor" ? [p.bodyB, p.bodyA] : [p.bodyA, p.bodyB];
        if (c.label !== "floor" || flags.has(`${a.label}:land`)) return;
        const o = LIBRARY.find((x) => x.id === a.label);
        if (!o) return;
        flags.add(`${a.label}:land`);
        const ms = (a.speed * 60) / PX;
        push({ t: t(), world: "physical", text: `the ${o.label} hits the floor at ${ms.toFixed(1)} m/s`, basis: "simulation" });
        if (ms > 1.2) push({ t: t(), world: "perception", text: `an impact loud enough to be heard in the room (${o.material} on tile)`, basis: "rule" });
        if (o.fragile && ms > o.breakSpeed) {
          push({ t: t(), world: "physical", text: `${o.material} above its break speed (${o.breakSpeed} m/s): it shatters (fracture rule: a material threshold, not an atomic model)`, basis: "rule" });
          const { x, y } = a.position;
          Composite.remove(engine.world, a);
          const shards = Array.from({ length: 7 }, (_, k) =>
            Bodies.polygon(x + (k - 3) * 4, y - 6, 3, 4 + (k % 3), { friction: 0.6, restitution: 0.2, render: { fillStyle: o.color } }));
          shards.forEach((s, k) => Body.setVelocity(s, { x: (k - 3) * 0.9, y: -2 - (k % 3) }));
          Composite.add(engine.world, shards);
          setTimeout(() => {
            push({ t: t(), world: "behaviour", text: "the owner's reaction, the cat's or child's: not modelled in the lab (see the Missions in the console)", basis: "not modelled" });
            push({ t: t(), world: "business", text: "a replacement purchase, an insurance claim: not modelled in the lab", basis: "not modelled" });
            push({ t: t(), world: "earth", text: "a new object must be made: materials and energy (not modelled in the lab)", basis: "not modelled" });
          }, 900);
        } else if (o.fragile) {
          push({ t: t(), world: "physical", text: `${o.material} below its break speed: it probably survives (fracture rule)`, basis: "rule" });
        }
      });
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, [run, target]);

  const obj = LIBRARY.find((o) => o.id === target)!;
  return (
    <PageShell>
      <p className="classif">3 · How it solves it // Physics lab // mockup of the physical world&apos;s engine</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">1 actor · 1 action · <span className="accent">simulated, not guessed.</span></h1>
      <p className="dim mt-3 max-w-3xl text-lg">A 2D rigid-body engine (matter.js) stands in for Unreal Engine 5&apos;s Chaos physics. Object properties come from a library and are assumed, not measured. Each simulated event becomes a consequence in its world.</p>
      <Plain>Choose who does what to which object. The computer plays it out with real physics (gravity, friction, bounce) and tells you what broke, what was heard, and what it can&apos;t know yet.</Plain>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="glass p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
            <label className="hud-label">actor <select className="hfield !ml-1 !inline !w-auto !py-1" value={actor} onChange={(e) => setActor(e.target.value)}>{ACTORS.map((a) => <option key={a}>{a}</option>)}</select></label>
            <label className="hud-label">object <select className="hfield !ml-1 !inline !w-auto !py-1" value={target} onChange={(e) => setTarget(e.target.value)}>{LIBRARY.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
            <span className="flex gap-1">{(["nudge", "push", "flick", "drop"] as Action[]).map((a) => <button key={a} className="hbtn !px-2 !py-1" aria-pressed={action === a} onClick={() => setAction(a)}>{a}</button>)}</span>
            <label className="hud-label flex items-center gap-1">speed <input type="range" min={0.3} max={3} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /> <span className="mono text-[var(--text)]">{speed.toFixed(1)} m/s</span></label>
            <button className="hbtn-primary ml-auto" onClick={() => { setEvents([]); setRun((r) => r + 1); }}>▶ Simulate</button>
          </div>
          <div className="brackets relative overflow-hidden rounded-lg border hairline" style={{ background: "linear-gradient(#1b2031 0 70%, #2b2622 70%)" }}>
            <div ref={host} className="[&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full" />
            <span className="mono absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-[var(--accent)]">SIDE VIEW · matter.js 0.20 · {PX} px/m · table 0.75 m (assumed)</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {LIBRARY.map((o) => (
              <div key={o.id} className={`glass-flat p-2.5 text-[11.5px] ${o.id === target ? "!border-[var(--accent)]" : ""}`}>
                <p className="text-[13px] font-semibold"><span className="swatch mr-1" style={{ background: o.color }} />{o.label}</p>
                <p className="mono dim">{o.material} · {o.mass} kg · μ {o.friction}</p>
                <p className="mono faint">{o.fragile ? `fragile · breaks > ${o.breakSpeed} m/s` : "not fragile"}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="glass p-5">
          <p className="hud-label mb-1 !text-[var(--accent)]">Consequences, world by world</p>
          <p className="faint mb-3 text-[12px]">“{actor} {action === "drop" ? "drops" : action + "es"} the {obj.label}” · routed to ★ physical (a push on a table)</p>
          {!events.length && <p className="faint text-sm">Press Simulate. Try a nudge (it stays on the table), a push, a flick, then a drop of the wine glass.</p>}
          <ol className="flex flex-col gap-1.5">
            {events.map((e, k) => (
              <li key={k} className="rise flex items-start gap-2 text-[13px]" style={{ opacity: e.basis === "not modelled" ? 0.6 : 1 }}>
                <span className="mono faint w-12 flex-none pt-0.5 text-right text-[10.5px]">t {e.t.toFixed(2)}s</span>
                <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full" style={{ background: HEX[e.world] }} />
                <span className="flex-1">{e.text} <span className="chip !text-[10px]">{e.basis === "simulation" ? "∿ simulation" : e.basis === "rule" ? "§ rule" : "○ not modelled"}</span></span>
              </li>
            ))}
          </ol>
          {events.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[...new Set(events.map((e) => e.world))].map((w) => <WorldTag key={w} id={w} />)}
            </div>
          )}
          <p className="faint mt-4 text-[11.5px]">Next: Unreal Engine 5 behind the same interface (Chaos physics, Physical Materials, Sequencer renders compared with reality). <Link href="/next" className="accent">What next →</Link></p>
        </section>
      </div>
    </PageShell>
  );
}
