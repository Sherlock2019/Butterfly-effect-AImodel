"use client";

/**
 * Physical World · 3D simulation: Babylon.js (rendering, Apache-2.0) + Havok (rigid-body physics, MIT).
 * Gravity, collisions, friction, impulses and breakage are computed by Havok each 1/60 s step; masses,
 * speeds and break thresholds are ASSUMED per scene (src/lib/physics-scenes.ts) and shown on screen.
 * Illustrative, not a prediction. Honours prefers-reduced-motion (no autoplay), offers a lighter
 * quality for slower computers, and falls back to the schematic when WebGL or Havok is unavailable.
 */

import { useEffect, useRef, useState } from "react";
import * as B from "@babylonjs/core";
import { ASSUMED, SCENE_KIND, SCENE_TITLE, type Scene3D } from "@/lib/physics-scenes";
import { createKit, loadHavok, type Quality } from "./physics/kit";
import { ALL_SCENES } from "./physics/registry";

const KIND_LABEL = {
  simulation: "3D physics (Havok + Babylon.js) · illustrative, properties assumed",
  staging: "3D staging (Babylon.js + Havok) · the action is shown, not simulated · illustrative",
  experiment: "3D experiment · outcome computed from the textbook formula",
} as const;

export type { Scene3D } from "@/lib/physics-scenes";

interface Ev { t: number; text: string }

const DURATION = 12; // seconds of simulated time per run
const QKEY = "acmp.3d.quality";

function savedQuality(): Quality {
  try { return localStorage.getItem(QKEY) === "light" ? "light" : "high"; } catch { return "high"; }
}

export function Physics3D({ scene, onFail, variant }: { scene: Scene3D; onFail: () => void; variant?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [run, setRun] = useState(0);
  const [quality, setQuality] = useState<Quality>(savedQuality);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [reduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [playing, setPlaying] = useState(!reduced);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let engine: B.Engine | null = null;
    let ro: ResizeObserver | null = null;
    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full outline-none";
    canvas.style.touchAction = "none";
    canvas.setAttribute("aria-hidden", "true");
    el.appendChild(canvas);
    setStatus("loading");
    setEvents([]);

    const fail = (why: unknown) => {
      if (disposed) return;
      console.warn("3D physics unavailable:", why);
      onFail();
    };

    (async () => {
      let hk: unknown;
      try { hk = await loadHavok(); } catch (e) { fail(e); return; }
      if (disposed) return;
      try {
        engine = new B.Engine(canvas, true, { stencil: true, antialias: true, powerPreference: "high-performance" }, true);
      } catch (e) { fail(e); return; }
      try {
        const def = ALL_SCENES[scene] ?? ALL_SCENES.generic;
        const evs: Ev[] = [];
        // the kit is created before the log can read its clock, so the log reads it through a holder
        const clock = { t: 0 };
        const kit = createKit({
          engine, canvas, hk, quality, sky: def.sky, cam: def.cam,
          log: (text) => { evs.push({ t: clock.t, text }); if (!disposed) setEvents([...evs]); },
        });
        const tick = def.build(kit, variant);
        const step = 1 / 60;
        kit.scene.onBeforeRenderObservable.add(() => {
          const play = playingRef.current && kit.t < DURATION;
          kit.scene.physicsEnabled = play;
          kit.scene.particlesEnabled = play;
          if (play) { kit.t += step; clock.t = kit.t; tick(step); }
          kit.focus();
        });
        await kit.scene.whenReadyAsync();
        if (disposed) return;
        engine.runRenderLoop(() => kit.scene.render());
        ro = new ResizeObserver(() => engine?.resize());
        ro.observe(el);
        setStatus("ready");
      } catch (e) { fail(e); }
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      if (engine) { engine.stopRenderLoop(); engine.scenes.slice().forEach((s) => s.dispose()); engine.dispose(); }
      canvas.remove();
    };
  }, [scene, variant, run, quality, onFail]);

  const pickQuality = (q: Quality) => {
    try { localStorage.setItem(QKEY, q); } catch { /* per-viewer convenience only */ }
    setQuality(q);
  };

  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0 overflow-hidden rounded-lg bg-[#05070d]" role="img" aria-label={`3D physics simulation: ${SCENE_TITLE[scene]}. Drag to orbit the camera.`} />
      {status === "loading" && <p className="faint pointer-events-none absolute inset-0 grid place-items-center text-[12px]">Loading Babylon.js and Havok physics…</p>}
      {/* one wrapping row: on narrow screens the controls drop below the label instead of covering it */}
      <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap-reverse items-start justify-between gap-1">
        <div className="max-w-full space-y-0.5 sm:max-w-[60%]">
          <span className="prov prov-ill !inline-block max-w-full !whitespace-normal">{KIND_LABEL[SCENE_KIND(scene)]}</span>
          <p className="mono rounded bg-black/45 px-1.5 py-0.5 text-[9.5px] text-[var(--text-dim)]">{ASSUMED[scene]}</p>
        </div>
        <div className="pointer-events-auto ml-auto flex flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-1">
            {!playing && <button type="button" className="hbtn !py-1 !text-[10px]" onClick={() => setPlaying(true)}>▶ Play simulation</button>}
            <button type="button" className="hbtn !py-1 !text-[10px]" onClick={() => { setPlaying(true); setRun((r) => r + 1); }}>↺ Replay</button>
            <span className="flex overflow-hidden rounded" role="group" aria-label="Rendering quality">
              {(["high", "light"] as const).map((q) => (
                <button key={q} type="button" className="hbtn !rounded-none !px-2 !py-1 !text-[10px]" aria-pressed={quality === q} onClick={() => pickQuality(q)}>{q === "high" ? "High" : "Light"}</button>
              ))}
            </span>
          </div>
          {reduced && !playing && <p className="faint rounded bg-black/55 px-1.5 py-0.5 text-[10px]">Reduced motion: press Play to run it.</p>}
        </div>
      </div>
      <ol className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-1rem)] space-y-0.5 sm:max-w-[65%]" aria-live="polite">
        {events.slice(-5).map((e, i) => <li key={i} className="mono rounded bg-black/60 px-1.5 py-0.5 text-[10.5px]"><span className="faint">t={e.t.toFixed(2)}s</span> {e.text}</li>)}
      </ol>
      {events.length === 0 && <p className="faint pointer-events-none absolute bottom-2 right-2 text-[9.5px]">drag to orbit · scroll to zoom</p>}
    </div>
  );
}
