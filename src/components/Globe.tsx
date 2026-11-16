"use client";

/**
 * The globe: CesiumJS (Apache-2.0) loaded from public/cesium, keyless Esri World Imagery with an
 * OpenStreetMap fallback (the same keyless path God's Eye View uses), no Cesium ion token.
 * Exposes a small imperative API the console drives: fly, pins with HUD callouts, rings, arcs.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { LL } from "@/lib/geo";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { Cesium?: any; CESIUM_BASE_URL?: string }
}

const ESRI = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

let loading: Promise<any> | null = null;
function loadCesium(): Promise<any> {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (loading) return loading;
  window.CESIUM_BASE_URL = "/cesium/";
  loading = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/cesium/Widgets/widgets.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "/cesium/Cesium.js";
    s.async = true;
    s.onload = () => resolve(window.Cesium);
    s.onerror = () => reject(new Error("Cesium could not be loaded (run npm install)"));
    document.head.appendChild(s);
  });
  return loading;
}

export interface PinSpec { id: string; at: LL; color: string; label?: string; size?: number; height?: number; big?: boolean; stagger?: number }
export interface GlobeApi {
  fly: (at: LL, height: number, seconds?: number, pitchDeg?: number) => Promise<void>;
  clear: () => void;
  pin: (p: PinSpec) => void;
  ring: (id: string, at: LL, radius: number, color: string, dashed?: boolean, height?: number, alpha?: number) => void;
  /** A floating text tag (world-layer names on the tower). */
  tag: (id: string, at: LL, height: number, color: string, text: string) => void;
  /** Remove every entity whose id contains `tag`. */
  remove: (tag: string) => void;
  arc: (id: string, a: LL, b: LL, color: string) => void;
  pulse: (at: LL, color: string, maxRadius: number) => void;
  spin: (on: boolean) => void;
  home: () => Promise<void>;
  /** Show or hide the callout labels of pins whose id contains `tag` ("*" = all pins). */
  labels: (tag: string, show: boolean) => void;
  /** Show or hide every entity whose id contains `tag` (world layers). */
  setVisible: (tag: string, show: boolean) => void;
}

export const Globe = forwardRef<GlobeApi, { look: string; onReady?: () => void; onError?: (e: string) => void }>(function Globe({ look, onReady, onError }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<any>(null);
  const spinning = useRef(true);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let destroyed = false;
    loadCesium()
      .then(async (C) => {
        if (destroyed || !host.current) return;
        const v = new C.Viewer(host.current, {
          baseLayer: false, animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false,
          sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
          requestRenderMode: false,
        });
        viewer.current = v;
        try {
          v.imageryLayers.addImageryProvider(await C.ArcGisMapServerImageryProvider.fromUrl(ESRI));
        } catch {
          v.imageryLayers.addImageryProvider(new C.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" }));
        }
        const s = v.scene;
        s.backgroundColor = C.Color.fromCssColorString("#07080d");
        s.globe.baseColor = C.Color.fromCssColorString("#0b1a2a");
        s.globe.showGroundAtmosphere = true;
        s.skyAtmosphere.show = true;
        s.globe.enableLighting = false;
        v.camera.setView({ destination: C.Cartesian3.fromDegrees(20, 25, 21000000) });
        v.clock.onTick.addEventListener(() => {
          if (spinning.current) v.camera.rotate(C.Cartesian3.UNIT_Z, 0.0009);
        });
        const stop = () => (spinning.current = false);
        v.screenSpaceEventHandler.setInputAction(stop, C.ScreenSpaceEventType.LEFT_DOWN);
        v.screenSpaceEventHandler.setInputAction(stop, C.ScreenSpaceEventType.WHEEL);
        setState("ready");
        onReady?.();
      })
      .catch((e: Error) => {
        setState("error");
        onError?.(e.message);
      });
    return () => {
      destroyed = true;
      if (viewer.current && !viewer.current.isDestroyed()) viewer.current.destroy();
      viewer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => {
    const C = () => window.Cesium;
    const col = (c: string, a = 1) => C().Color.fromCssColorString(c).withAlpha(a);
    const add = (e: any) => viewer.current?.entities.add(e);
    return {
      fly: (at, height, seconds = 2.4, pitchDeg) =>
        new Promise<void>((resolve) => {
          const v = viewer.current;
          if (!v) return resolve();
          spinning.current = false;
          // oblique, so the world layers stacked over the action are visible; top-down only from orbit
          const pitch = pitchDeg ?? (height > 8000000 ? -90 : height > 400000 ? -62 : -42);
          const back = pitch === -90 ? 0 : (height / Math.tan((-pitch * Math.PI) / 180)) / 111000;
          v.camera.flyTo({
            destination: C().Cartesian3.fromDegrees(at.lon, at.lat - back, height),
            orientation: { heading: 0, pitch: C().Math.toRadians(pitch), roll: 0 },
            duration: seconds, complete: resolve, cancel: resolve,
          });
        }),
      clear: () => viewer.current?.entities.removeAll(),
      pin: ({ id, at, color, label, size = 10, height = 0, big = false, stagger = 0 }) => {
        const Cs = C();
        const pos = Cs.Cartesian3.fromDegrees(at.lon, at.lat, height);
        add({
          id: `pin-${id}`, position: pos,
          point: { pixelSize: size, color: col(color), outlineColor: col("#000000", 0.8), outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: label ? {
            text: label, font: `${big ? 600 : 500} ${big ? 13 : 11.5}px "JetBrains Mono", monospace`,
            fillColor: col("#e8eaed"), showBackground: true, backgroundColor: col("#0a0c14", 0.84),
            // alternate callouts up and down so neighbours in the same ring do not cover each other
            backgroundPadding: new Cs.Cartesian2(9, 6),
            pixelOffset: big ? new Cs.Cartesian2(-20, -46) : new Cs.Cartesian2(16, stagger % 2 ? 26 + (stagger % 4) * 8 : -16 - (stagger % 4) * 8),
            horizontalOrigin: big ? Cs.HorizontalOrigin.RIGHT : Cs.HorizontalOrigin.LEFT, verticalOrigin: Cs.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          } : undefined,
        });
        if (height > 0) {
          // the leader line down to the ground spot the consequence is about (GEV-style tracking line)
          add({
            id: `lead-${id}`,
            polyline: {
              positions: Cs.Cartesian3.fromDegreesArrayHeights([at.lon, at.lat, 0, at.lon, at.lat, height]),
              width: 1.5, material: col(color, 0.75),
            },
          });
          add({ id: `foot-${id}`, position: Cs.Cartesian3.fromDegrees(at.lon, at.lat, 0), point: { pixelSize: 4, color: col(color, 0.9) } });
        }
      },
      ring: (id, at, radius, color, dashed = false, height = 0, alpha = 0.9) => {
        const Cs = C();
        const pts: number[] = [];
        for (let i = 0; i <= 128; i++) {
          const b = (i / 128) * 2 * Math.PI;
          const dLat = (radius / 111320) * Math.cos(b);
          const dLon = (radius / (111320 * Math.cos((at.lat * Math.PI) / 180))) * Math.sin(b);
          pts.push(at.lon + dLon, at.lat + dLat, height);
        }
        add({
          id: `ring-${id}`,
          polyline: {
            positions: Cs.Cartesian3.fromDegreesArrayHeights(pts), width: dashed ? 1.5 : 2.5,
            material: dashed ? new Cs.PolylineDashMaterialProperty({ color: col(color, alpha), dashLength: 14 }) : new Cs.PolylineGlowMaterialProperty({ color: col(color, alpha), glowPower: 0.22 }),
          },
        });
      },
      tag: (id, at, height, color, text) => {
        const Cs = C();
        add({
          id: `tag-${id}`, position: Cs.Cartesian3.fromDegrees(at.lon, at.lat, height),
          label: {
            text, font: `600 10.5px "JetBrains Mono", monospace`, fillColor: col(color), showBackground: true,
            backgroundColor: col("#07080d", 0.7), backgroundPadding: new Cs.Cartesian2(6, 3),
            horizontalOrigin: Cs.HorizontalOrigin.RIGHT, verticalOrigin: Cs.VerticalOrigin.CENTER, pixelOffset: new Cs.Cartesian2(-6, 0),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      },
      remove: (tag) => {
        const v = viewer.current;
        if (!v) return;
        for (const e of [...v.entities.values]) if (String(e.id).includes(tag)) v.entities.remove(e);
      },
      arc: (id, a, b, color) => {
        const Cs = C();
        const d = Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180)) * 111000;
        const pts: number[] = [];
        for (let i = 0; i <= 48; i++) {
          const t = i / 48;
          pts.push(a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t, Math.sin(Math.PI * t) * d * 0.22);
        }
        add({
          id: `arc-${id}`,
          polyline: { positions: Cs.Cartesian3.fromDegreesArrayHeights(pts), width: 2.5, material: new Cs.PolylineGlowMaterialProperty({ color: col(color, 0.95), glowPower: 0.25 }) },
        });
      },
      pulse: (at, color, maxRadius) => {
        const Cs = C();
        const t0 = Date.now();
        const r = () => 50 + (((Date.now() - t0) % 2600) / 2600) * maxRadius;
        add({
          id: `pulse-${Math.random().toString(36).slice(2)}`,
          position: Cs.Cartesian3.fromDegrees(at.lon, at.lat),
          ellipse: {
            semiMajorAxis: new Cs.CallbackProperty(r, false), semiMinorAxis: new Cs.CallbackProperty(r, false), height: 0,
            material: new Cs.ColorMaterialProperty(new Cs.CallbackProperty(() => col(color, 0.35 * (1 - (r() - 50) / maxRadius)), false)),
          },
        });
      },
      spin: (on) => (spinning.current = on),
      labels: (tag, show) => {
        const v = viewer.current;
        if (!v) return;
        for (const e of v.entities.values) if (e.label && String(e.id).startsWith("pin-") && (tag === "*" || String(e.id).includes(tag))) e.label.show = show;
      },
      setVisible: (tag, show) => {
        const v = viewer.current;
        if (!v) return;
        for (const e of v.entities.values) if (String(e.id).includes(tag)) e.show = show;
      },
      home: () =>
        new Promise<void>((resolve) => {
          const v = viewer.current;
          if (!v) return resolve();
          v.camera.flyTo({ destination: C().Cartesian3.fromDegrees(20, 25, 21000000), duration: 2, complete: () => { spinning.current = true; resolve(); } });
        }),
    };
  }, []);

  return (
    <div className={`absolute inset-0 look-${look}`}>
      <div ref={host} className="absolute inset-0" />
      {look === "crt" && <div className="scanlines" />}
      <div className="vignette" />
      {state === "loading" && <div className="hud-label absolute inset-0 grid place-items-center">acquiring globe…</div>}
      {state === "error" && <div className="hud-label absolute inset-0 grid place-items-center text-[var(--bad)]">globe unavailable · the console still works</div>}
    </div>
  );
});
