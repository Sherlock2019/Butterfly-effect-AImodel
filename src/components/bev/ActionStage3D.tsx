"use client";

/**
 * Action · 3D: an always-visible band at the top of the centre column that plays the action in the
 * Havok + Babylon.js engine, whichever world is selected. Only authored physical scenes are shown: a
 * scenario's own stage.scene, or for a typed action the nearest authored scene by explicit words. When
 * no scene fits (a policy, a post, a purchase…) the band says so instead of showing an unrelated motion.
 */

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SCENE_TITLE, type Scene3D } from "@/lib/physics-scenes";

const Physics3DLazy = dynamic(() => import("./Physics3D").then((m) => m.Physics3D), {
  ssr: false,
  loading: () => <p className="faint grid h-full place-items-center text-[12px]">Loading the 3D physics engine…</p>,
});

export interface Stage3D {
  key: string;            // changes when the action changes (remounts the scene)
  scene: Scene3D | null;  // null = no authored 3D scene fits this action
  how: "scenario" | "words";
  matched?: string;       // the words that picked the scene (typed actions)
  variant?: string;       // e.g. the energy pathway for the data-center scene
  note?: string;          // why there is no scene
}

type Size = "s" | "m" | "l" | "hidden";
const SKEY = "acmp.3d.panel";
const HEIGHT: Record<Exclude<Size, "hidden">, string> = { s: "h-[180px]", m: "h-[clamp(200px,32vh,300px)]", l: "h-[clamp(260px,52vh,520px)]" };

export function ActionStage3D({ stage }: { stage: Stage3D }) {
  const [size, setSize] = useState<Size>("m");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    try { const v = localStorage.getItem(SKEY); if (v === "s" || v === "m" || v === "l" || v === "hidden") setSize(v); } catch { /* per-viewer convenience only */ }
  }, []);
  useEffect(() => setFailed(false), [stage.key]);
  const pick = (v: Size) => { setSize(v); try { localStorage.setItem(SKEY, v); } catch { /* ignore */ } };
  const onFail = useCallback(() => setFailed(true), []);

  const title = stage.scene ? SCENE_TITLE[stage.scene] : "No 3D scene for this action";
  return (
    <section className="flex-none border-b hairline bg-[var(--bg)]" aria-label="Action in 3D">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5">
        <span className="action-chip !py-0.5">⚡ Action · 3D</span>
        <span className="truncate text-[12px] font-semibold">{title}</span>
        {stage.scene && stage.how === "words" && <span className="prov prov-ill">nearest authored scene · matched “{stage.matched}”</span>}
        <span className="ml-auto flex overflow-hidden rounded" role="group" aria-label="3D panel size">
          {(["s", "m", "l"] as const).map((v) => (
            <button key={v} type="button" className="hbtn !rounded-none !px-2 !py-0.5 !text-[10px]" aria-pressed={size === v} onClick={() => pick(v)} disabled={!stage.scene}>{v.toUpperCase()}</button>
          ))}
          <button type="button" className="hbtn !rounded-none !px-2 !py-0.5 !text-[10px]" aria-pressed={size === "hidden"} aria-expanded={size !== "hidden"} onClick={() => pick(size === "hidden" ? "m" : "hidden")}>{size === "hidden" ? "Show" : "Hide"}</button>
        </span>
      </div>
      {size !== "hidden" && (
        stage.scene && !failed ? (
          <div className={`${HEIGHT[size]} px-2 pb-2`}>
            <Physics3DLazy key={stage.key} scene={stage.scene} variant={stage.variant} onFail={onFail} />
          </div>
        ) : (
          <p className="dim px-3 pb-2 text-[11.5px]">
            {failed
              ? "3D is not available on this device (no WebGL or the physics engine could not load). The Physical view has the schematic."
              : stage.note ?? "This action is not a physical event at human scale, so there is nothing to simulate in 3D."}
            {!failed && <span className="faint"> Every catalog scenario has its own 3D scene; typed actions use the nearest one when their words match.</span>}
          </p>
        )
      )}
    </section>
  );
}
