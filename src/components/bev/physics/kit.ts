/**
 * Physical World · 3D kit: Babylon.js (rendering, Apache-2.0) + Havok (rigid-body physics, MIT).
 *
 * Everything is local: the sky is a small shader, image-based lighting comes from a reflection probe of
 * that sky, and every texture (brick, wood, asphalt, grass…) is drawn on a canvas in code. Havok's
 * WebAssembly file is served from /havok (copied from node_modules by scripts/copy-havok.mjs).
 */

import * as B from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";

export type Quality = "high" | "light";
export type V3 = [number, number, number];

/* ---------- Havok: loaded once per page --------------------------------------------------------- */

let hkPromise: Promise<unknown> | null = null;
export function loadHavok(): Promise<unknown> {
  if (!hkPromise) {
    hkPromise = HavokPhysics({ locateFile: () => "/havok/HavokPhysics.wasm" }).catch((e: unknown) => {
      hkPromise = null;
      throw e;
    });
  }
  return hkPromise;
}

/* ---------- deterministic randomness (same scene every replay) ---------------------------------- */

export function rngOf(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- sky presets ------------------------------------------------------------------------- */

export interface Sky {
  zenith: string; horizon: string; ground: string;
  sun: V3; sunColor: string; sunIntensity: number;
  env: number; exposure: number;
  fog?: { color: string; density: number };
  stars?: number;
}

export const SKIES = {
  day: { zenith: "#3f78c8", horizon: "#cfe0f2", ground: "#6d6a5f", sun: [-0.45, 0.75, 0.5], sunColor: "#fff3e0", sunIntensity: 3.2, env: 1.0, exposure: 1.0 },
  indoor: { zenith: "#b9c3cf", horizon: "#efe6d8", ground: "#7a6a58", sun: [0.35, 0.8, 0.6], sunColor: "#ffe9cc", sunIntensity: 2.4, env: 0.9, exposure: 1.05 },
  hall: { zenith: "#8a9bb3", horizon: "#c7d2e0", ground: "#4a5260", sun: [0.3, 0.85, 0.55], sunColor: "#eaf2ff", sunIntensity: 2.0, env: 0.8, exposure: 1.0 },
  night: { zenith: "#070a14", horizon: "#283149", ground: "#0e1117", sun: [-0.3, 0.8, 0.4], sunColor: "#a9bce3", sunIntensity: 0.6, env: 0.9, exposure: 1.4 },
  storm: { zenith: "#3a4347", horizon: "#8d9a98", ground: "#3a3d38", sun: [-0.3, 0.85, 0.3], sunColor: "#d5ddda", sunIntensity: 1.6, env: 1.0, exposure: 1.3, fog: { color: "#6f7b79", density: 0.035 } },
  dusk: { zenith: "#2c3e6b", horizon: "#e8a77a", ground: "#5a4a40", sun: [-0.8, 0.25, 0.3], sunColor: "#ffc48a", sunIntensity: 2.4, env: 0.9, exposure: 1.1 },
  space: { zenith: "#000000", horizon: "#03040a", ground: "#000000", sun: [-1, 0.15, 0.2], sunColor: "#fff4dc", sunIntensity: 3.0, env: 0.25, exposure: 1.0, stars: 1 },
  underwater: { zenith: "#4f9fc8", horizon: "#1d5a7a", ground: "#0e3447", sun: [0.1, 1, 0.2], sunColor: "#b8e4ff", sunIntensity: 3.2, env: 1.3, exposure: 1.55, fog: { color: "#1f6684", density: 0.04 } },
  office: { zenith: "#c9d3dd", horizon: "#f2ede4", ground: "#8a8076", sun: [0.4, 0.75, 0.5], sunColor: "#fff1dc", sunIntensity: 2.2, env: 1.0, exposure: 1.05 },
} satisfies Record<string, Sky>;

const SKY_VS = `precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main(void){ vDir = position; gl_Position = worldViewProjection * vec4(position, 1.0); }`;

const SKY_FS = `precision highp float;
varying vec3 vDir;
uniform vec3 zenith; uniform vec3 horizon; uniform vec3 groundC; uniform vec3 sunDir; uniform vec3 sunC; uniform float flash; uniform float stars;
void main(void){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = h > 0.0 ? mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.5)) : mix(horizon, groundC, pow(clamp(-h, 0.0, 1.0), 0.35));
  float s = max(dot(d, normalize(sunDir)), 0.0);
  c += sunC * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.25);
  c += vec3(0.75, 0.8, 1.0) * flash;
  float n = fract(sin(dot(floor(d * 380.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  c += vec3(0.9, 0.95, 1.0) * step(0.9975, n) * stars * (0.5 + 0.5 * fract(n * 91.0));
  gl_FragColor = vec4(c, 1.0);
}`;

/* ---------- canvas textures --------------------------------------------------------------------- */

type Draw = (c: CanvasRenderingContext2D, r: () => number, S: number) => void;

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const speckle = (c: CanvasRenderingContext2D, r: () => number, S: number, n: number, base: string, spread: number, size = 2) => {
  for (let i = 0; i < n; i++) { c.fillStyle = shade(base, 1 + (r() - 0.5) * spread); c.fillRect(r() * S, r() * S, size, size); }
};

const DRAW = {
  brick: ((c, r, S) => {
    c.fillStyle = "#a39a8e"; c.fillRect(0, 0, S, S);
    const rows = 12, bh = S / rows, bw = S / 4;
    for (let y = 0; y < rows; y++) for (let x = -1; x < 5; x++) {
      const ox = (y % 2) * bw * 0.5;
      c.fillStyle = shade(["#8f3f2b", "#9c4a31", "#84392a", "#a6573a"][Math.floor(r() * 4)], 0.9 + r() * 0.2);
      c.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, bh - 6);
    }
    speckle(c, r, S, 5000, "#8f4a35", 0.5);
  }) as Draw,
  plaster: ((c, r, S) => { c.fillStyle = "#e6dfd3"; c.fillRect(0, 0, S, S); speckle(c, r, S, 9000, "#e6dfd3", 0.08, 3); }) as Draw,
  planks: ((c, r, S) => {
    const n = 5, w = S / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = shade("#8a5a33", 0.85 + r() * 0.3); c.fillRect(i * w, 0, w, S);
      for (let g = 0; g < 26; g++) { c.strokeStyle = shade("#5e3a1e", 0.8 + r() * 0.5); c.globalAlpha = 0.35; c.lineWidth = 1 + r() * 1.5; const x = i * w + r() * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + (r() - 0.5) * 12, S * 0.3, x + (r() - 0.5) * 12, S * 0.7, x, S); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = "#3a2414"; c.fillRect(i * w, 0, 2, S); c.fillRect(i * w, r() * S, w, 2);
    }
  }) as Draw,
  wood: ((c, r, S) => {
    c.fillStyle = "#a8774a"; c.fillRect(0, 0, S, S);
    for (let g = 0; g < 70; g++) { c.strokeStyle = shade("#6e4524", 0.8 + r() * 0.5); c.globalAlpha = 0.3; c.lineWidth = 1 + r() * 2; const y = r() * S; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(S * 0.3, y + (r() - 0.5) * 20, S * 0.6, y + (r() - 0.5) * 20, S, y); c.stroke(); }
    c.globalAlpha = 1;
  }) as Draw,
  asphalt: ((c, r, S) => {
    c.fillStyle = "#34363a"; c.fillRect(0, 0, S, S); speckle(c, r, S, 16000, "#3a3c40", 0.6, 2);
    // box top faces map u across the road and v along it: lane lines are vertical on the canvas
    c.fillStyle = "#e9e6dc"; c.fillRect(S * 0.06, 0, 5, S); c.fillRect(S * 0.94 - 5, 0, 5, S);
    c.fillStyle = "#e3b23c"; c.fillRect(S * 0.5 - 3, 0, 6, S * 0.5);
  }) as Draw,
  grass: ((c, r, S) => {
    c.fillStyle = "#4c7a35"; c.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) { c.strokeStyle = shade(["#4c7a35", "#5d8c3e", "#3e6a2c", "#6b9a48"][Math.floor(r() * 4)], 0.85 + r() * 0.3); c.lineWidth = 1; const x = r() * S, y = r() * S; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 6); c.stroke(); }
  }) as Draw,
  concrete: ((c, r, S) => {
    c.fillStyle = "#8e8f8d"; c.fillRect(0, 0, S, S); speckle(c, r, S, 14000, "#8e8f8d", 0.25, 2);
    c.fillStyle = "rgba(40,40,40,0.35)"; c.fillRect(0, 0, S, 2); c.fillRect(0, 0, 2, S);
  }) as Draw,
  floorTiles: ((c, r, S) => {
    const n = 2, w = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.fillStyle = shade("#c9ccd1", 0.95 + r() * 0.08); c.fillRect(i * w, j * w, w, w); }
    speckle(c, r, S, 4000, "#c9ccd1", 0.08, 2);
    c.fillStyle = "#5b6068"; for (let i = 0; i <= n; i++) { c.fillRect(i * w - 2, 0, 4, S); c.fillRect(0, i * w - 2, S, 4); }
  }) as Draw,
  stripes: ((c, _r, S) => {
    c.fillStyle = "#f2f2ee"; c.fillRect(0, 0, S, S); c.fillStyle = "#d13b2f";
    for (let k = -S; k < S * 2; k += S / 4) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + S / 8, 0); c.lineTo(k + S / 8 - S, S); c.lineTo(k - S, S); c.closePath(); c.fill(); }
  }) as Draw,
  roadSign: ((c, _r, S) => {
    c.fillStyle = "#c62f26"; c.fillRect(0, 0, S, S); c.strokeStyle = "#f6f3ea"; c.lineWidth = S * 0.04; c.strokeRect(S * 0.05, S * 0.08, S * 0.9, S * 0.84);
    c.fillStyle = "#f6f3ea"; c.font = `bold ${Math.round(S * 0.2)}px Arial, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("ROAD", S / 2, S * 0.36); c.fillText("CLOSED", S / 2, S * 0.64);
  }) as Draw,
  bark: ((c, r, S) => {
    c.fillStyle = "#5b4330"; c.fillRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) { c.strokeStyle = shade("#3b2a1c", 0.8 + r() * 0.6); c.lineWidth = 2 + r() * 3; const x = r() * S; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 18, S); c.stroke(); }
  }) as Draw,
  windows: ((c, r, S) => {
    c.fillStyle = "#b9b2a6"; c.fillRect(0, 0, S, S); speckle(c, r, S, 4000, "#b9b2a6", 0.15, 2);
    const n = 4, w = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      c.fillStyle = r() < 0.35 ? "#f3dfa8" : "#2a3442"; c.fillRect(i * w + w * 0.18, j * w + w * 0.15, w * 0.64, w * 0.62);
      c.fillStyle = "#e9e4da"; c.fillRect(i * w + w * 0.15, j * w + w * 0.75, w * 0.7, w * 0.05);
    }
  }) as Draw,
  pcb: ((c, r, S) => {
    c.fillStyle = "#1d5b34"; c.fillRect(0, 0, S, S);
    c.strokeStyle = "#c9a54a"; c.globalAlpha = 0.55; c.lineWidth = 2;
    for (let i = 0; i < 90; i++) { const y = r() * S; c.beginPath(); c.moveTo(0, y); c.lineTo(S * r(), y); c.lineTo(S * r(), y + (r() - 0.5) * 60); c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = "#d8b860"; for (let i = 0; i < 64; i++) c.fillRect(i * (S / 64) + 1, S - 22, S / 64 - 3, 20);
  }) as Draw,
  sand: ((c, r, S) => { c.fillStyle = "#6f6a55"; c.fillRect(0, 0, S, S); speckle(c, r, S, 20000, "#6f6a55", 0.4, 2); for (let i = 0; i < 40; i++) { c.strokeStyle = "rgba(0,0,0,0.12)"; c.lineWidth = 3; const y = r() * S; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(S * 0.3, y + 10, S * 0.6, y - 10, S, y); c.stroke(); } }) as Draw,
  optTable: ((c, _r, S) => { c.fillStyle = "#2a2d33"; c.fillRect(0, 0, S, S); c.fillStyle = "#15171b"; const n = 16, w = S / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.beginPath(); c.arc(i * w + w / 2, j * w + w / 2, 3, 0, Math.PI * 2); c.fill(); } }) as Draw,
  carpet: ((c, r, S) => { c.fillStyle = "#5d6470"; c.fillRect(0, 0, S, S); speckle(c, r, S, 20000, "#5d6470", 0.25, 2); }) as Draw,
  metal: ((c, r, S) => { c.fillStyle = "#8d949c"; c.fillRect(0, 0, S, S); for (let i = 0; i < 600; i++) { c.fillStyle = `rgba(255,255,255,${r() * 0.05})`; c.fillRect(0, r() * S, S, 1); } }) as Draw,
} satisfies Record<string, Draw>;
export type TexKind = keyof typeof DRAW;

/* ---------- the kit ----------------------------------------------------------------------------- */

export interface MatOpts {
  color?: string; tex?: TexKind; uv?: [number, number];
  rough?: number; metal?: number; alpha?: number; clearcoat?: number;
  sheen?: string; emissive?: string; emissiveIntensity?: number; unlit?: boolean;
}
export interface BodyOpts {
  mass?: number; friction?: number; restitution?: number;
  extents?: V3; center?: V3; animated?: boolean; rot?: V3; cast?: boolean; parent?: B.TransformNode;
}
export interface Item { mesh: B.Mesh; agg: B.PhysicsAggregate | null }
export interface Hit { other: B.PhysicsBody; speed: number; point: B.Nullable<B.Vector3>; vel: B.Vector3 }

export interface Human { root: B.TransformNode; hipL: B.TransformNode; hipR: B.TransformNode; shL: B.TransformNode; shR: B.TransformNode }

export type Kit = ReturnType<typeof createKit>;

export function createKit(opts: {
  engine: B.Engine; canvas: HTMLCanvasElement; hk: unknown; quality: Quality; sky: Sky;
  cam: { pos: V3; target: V3 }; log: (text: string) => void; seed?: number;
}) {
  const { engine, canvas, hk, sky } = opts;
  const high = opts.quality === "high" && engine.webGLVersion >= 2;
  const rng = rngOf(opts.seed ?? 7);
  const scene = new B.Scene(engine);
  // scenes are laid out with +x to the right and +z toward the viewer (same as the 2D schematics)
  scene.useRightHandedSystem = true;
  scene.clearColor = new B.Color4(0, 0, 0, 1);
  scene.enablePhysics(new B.Vector3(0, -9.81, 0), new B.HavokPlugin(false, hk));
  scene.getPhysicsEngine()?.setTimeStep(1 / 60);

  const lin = (hex: string) => B.Color3.FromHexString(hex).toLinearSpace();
  const v = (a: V3) => new B.Vector3(a[0], a[1], a[2]);

  /* camera: orbit with the mouse or a finger, no panning */
  const target = v(opts.cam.target);
  const cam = new B.ArcRotateCamera("cam", 0, 1, 10, target, scene);
  cam.setPosition(v(opts.cam.pos));
  const r0 = cam.radius;
  cam.lowerRadiusLimit = r0 * 0.4; cam.upperRadiusLimit = r0 * 2.2;
  cam.lowerBetaLimit = 0.15; cam.upperBetaLimit = Math.PI / 2 - 0.03;
  cam.panningSensibility = 0; cam.wheelDeltaPercentage = 0.02; cam.pinchDeltaPercentage = 0.004;
  cam.minZ = 0.03; cam.maxZ = 1500; cam.fov = 0.78;
  cam.attachControl(canvas, false);

  /* sky */
  B.Effect.ShadersStore["acmpSkyVertexShader"] = SKY_VS;
  B.Effect.ShadersStore["acmpSkyFragmentShader"] = SKY_FS;
  const skyMat = new B.ShaderMaterial("sky", scene, "acmpSky", { attributes: ["position"], uniforms: ["worldViewProjection", "zenith", "horizon", "groundC", "sunDir", "sunC", "flash", "stars"] });
  skyMat.backFaceCulling = false;
  const sunDir = v(sky.sun).normalize();
  skyMat.setColor3("zenith", lin(sky.zenith)); skyMat.setColor3("horizon", lin(sky.horizon)); skyMat.setColor3("groundC", lin(sky.ground));
  skyMat.setVector3("sunDir", sunDir); skyMat.setColor3("sunC", lin(sky.sunColor).scale(Math.min(1, sky.sunIntensity / 3))); skyMat.setFloat("flash", 0); skyMat.setFloat("stars", sky.stars ?? 0);
  const skyMesh = B.MeshBuilder.CreateSphere("sky", { diameter: 1000, segments: 24, sideOrientation: B.Mesh.BACKSIDE }, scene);
  skyMesh.material = skyMat; skyMesh.infiniteDistance = true; skyMesh.isPickable = false;

  /* image-based lighting from the sky (rendered once into a cube map) */
  const probe = new B.ReflectionProbe("env", 128, scene, true, engine.getCaps().textureHalfFloatRender, true);
  probe.renderList!.push(skyMesh);
  probe.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  scene.environmentTexture = probe.cubeTexture;
  scene.environmentIntensity = sky.env;

  /* sun + soft shadows */
  const sun = new B.DirectionalLight("sun", sunDir.scale(-1), scene);
  sun.position = sunDir.scale(30); sun.intensity = sky.sunIntensity; sun.diffuse = lin(sky.sunColor);
  sun.autoCalcShadowZBounds = true;
  const shadows = new B.ShadowGenerator(high ? 2048 : 1024, sun);
  if (high) { shadows.useContactHardeningShadow = true; shadows.contactHardeningLightSizeUVRatio = 0.03; }
  else shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.0006; shadows.normalBias = 0.012; shadows.transparencyShadow = true;
  const fill = new B.HemisphericLight("fill", new B.Vector3(0, 1, 0), scene);
  fill.intensity = 0.12; fill.groundColor = lin(sky.ground);

  if (sky.fog) { scene.fogMode = B.Scene.FOGMODE_EXP2; scene.fogDensity = sky.fog.density; scene.fogColor = lin(sky.fog.color); }

  /* post: ambient occlusion, tone mapping, bloom, light depth of field */
  if (high) {
    const ssao = new B.SSAO2RenderingPipeline("ssao", scene, { ssaoRatio: 0.5, blurRatio: 0.5 }, [cam], true);
    ssao.radius = 0.7; ssao.totalStrength = 1.1; ssao.samples = 16; ssao.maxZ = 60; ssao.expensiveBlur = true; ssao.base = 0.15;
  }
  const dp = new B.DefaultRenderingPipeline("post", true, scene, [cam]);
  dp.samples = high ? 4 : 1;
  dp.fxaaEnabled = true;
  dp.imageProcessingEnabled = true;
  dp.imageProcessing.toneMappingEnabled = true;
  dp.imageProcessing.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
  dp.imageProcessing.exposure = sky.exposure;
  dp.imageProcessing.contrast = 1.12;
  dp.imageProcessing.vignetteEnabled = true; dp.imageProcessing.vignetteWeight = 1.4; dp.imageProcessing.vignetteColor = new B.Color4(0, 0, 0, 0);
  dp.bloomEnabled = true; dp.bloomThreshold = 0.9; dp.bloomWeight = high ? 0.35 : 0.25; dp.bloomKernel = high ? 64 : 32; dp.bloomScale = 0.5;
  dp.sharpenEnabled = true; dp.sharpen.edgeAmount = 0.2;
  if (high) {
    dp.depthOfFieldEnabled = true; dp.depthOfFieldBlurLevel = B.DepthOfFieldEffectBlurLevel.Low;
    dp.depthOfField.fStop = 5.6; dp.depthOfField.focalLength = 35;
    dp.grainEnabled = true; dp.grain.intensity = 4; dp.grain.animated = false;
  }
  const focus = () => { if (dp.depthOfFieldEnabled) dp.depthOfField.focusDistance = cam.radius * 1000; };

  /* textures + materials (cached) */
  const canvases = new Map<TexKind, HTMLCanvasElement>();
  const canvasOf = (kind: TexKind) => {
    let cv = canvases.get(kind);
    if (!cv) {
      const S = 512; cv = document.createElement("canvas"); cv.width = cv.height = S;
      DRAW[kind](cv.getContext("2d")!, rngOf(kind.length * 977), S);
      canvases.set(kind, cv);
    }
    return cv;
  };
  const tex = (kind: TexKind, u = 1, w = 1) => {
    const t = new B.DynamicTexture(`${kind}-tex`, canvasOf(kind), scene, true);
    t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; t.uScale = u; t.vScale = w; t.anisotropicFilteringLevel = 8;
    t.update();
    return t;
  };
  const mats = new Map<string, B.PBRMaterial>();
  const mat = (name: string, o: MatOpts = {}) => {
    const key = `${name}|${o.uv?.join("x") ?? ""}`;
    const hit = mats.get(key);
    if (hit) return hit;
    const m = new B.PBRMaterial(name, scene);
    m.albedoColor = lin(o.color ?? "#ffffff");
    if (o.tex) m.albedoTexture = tex(o.tex, o.uv?.[0] ?? 1, o.uv?.[1] ?? 1);
    m.roughness = o.rough ?? 0.7; m.metallic = o.metal ?? 0;
    if (o.alpha !== undefined && o.alpha < 1) { m.alpha = o.alpha; m.transparencyMode = B.Material.MATERIAL_ALPHABLEND; m.backFaceCulling = false; }
    if (o.clearcoat) { m.clearCoat.isEnabled = true; m.clearCoat.intensity = o.clearcoat; m.clearCoat.roughness = 0.05; }
    if (o.sheen) { m.sheen.isEnabled = true; m.sheen.color = lin(o.sheen); m.sheen.intensity = 0.7; m.sheen.roughness = 0.5; }
    if (o.emissive) { m.emissiveColor = lin(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; }
    if (o.unlit) m.unlit = true;
    m.realTimeFiltering = true; m.realTimeFilteringQuality = B.Constants.TEXTURE_FILTERING_QUALITY_LOW;
    mats.set(key, m);
    return m;
  };

  /* bodies */
  const finish = (m: B.Mesh, mt: B.Material, o: BodyOpts) => {
    m.material = mt; m.receiveShadows = true;
    if (o.parent) m.parent = o.parent;
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o.cast !== false) shadows.addShadowCaster(m);
  };
  const phys = (m: B.Mesh, type: B.PhysicsShapeType, o: BodyOpts, extra: Partial<B.PhysicsAggregateParameters> = {}) => {
    if (o.mass === undefined) return null;
    const p: B.PhysicsAggregateParameters = { mass: o.mass, friction: o.friction ?? 0.5, restitution: o.restitution ?? 0.15, ...extra };
    if (o.extents) p.extents = v(o.extents);
    if (o.center) p.center = v(o.center);
    const agg = new B.PhysicsAggregate(m, type, p, scene);
    if (o.animated) agg.body.setMotionType(B.PhysicsMotionType.ANIMATED);
    return agg;
  };
  const box = (name: string, size: V3, pos: V3, mt: B.Material, o: BodyOpts = {}): Item => {
    const m = B.MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
    m.position.set(pos[0], pos[1], pos[2]); finish(m, mt, o);
    return { mesh: m, agg: phys(m, B.PhysicsShapeType.BOX, o) };
  };
  const sphere = (name: string, d: number, pos: V3, mt: B.Material, o: BodyOpts & { seg?: number; scale?: V3 } = {}): Item => {
    const m = B.MeshBuilder.CreateSphere(name, { diameter: d, segments: o.seg ?? 24 }, scene);
    m.position.set(pos[0], pos[1], pos[2]); if (o.scale) m.scaling.set(o.scale[0], o.scale[1], o.scale[2]); finish(m, mt, o);
    return { mesh: m, agg: phys(m, B.PhysicsShapeType.SPHERE, o) };
  };
  const cyl = (name: string, c: { h: number; d?: number; top?: number; bottom?: number; tess?: number }, pos: V3, mt: B.Material, o: BodyOpts = {}): Item => {
    const m = B.MeshBuilder.CreateCylinder(name, { height: c.h, diameter: c.d, diameterTop: c.top ?? c.d, diameterBottom: c.bottom ?? c.d, tessellation: c.tess ?? 32 }, scene);
    m.position.set(pos[0], pos[1], pos[2]); finish(m, mt, o);
    const r = Math.max(c.top ?? c.d ?? 0, c.bottom ?? c.d ?? 0) / 2;
    return { mesh: m, agg: phys(m, B.PhysicsShapeType.CYLINDER, o, { radius: r, pointA: new B.Vector3(0, -c.h / 2, 0), pointB: new B.Vector3(0, c.h / 2, 0) }) };
  };
  /** a static ground slab whose top face is at y = 0 */
  const ground = (size: number, mt: B.Material, friction = 0.6): Item => {
    const m = B.MeshBuilder.CreateBox("ground", { width: size, height: 0.4, depth: size }, scene);
    m.position.y = -0.2; m.material = mt; m.receiveShadows = true;
    return { mesh: m, agg: new B.PhysicsAggregate(m, B.PhysicsShapeType.BOX, { mass: 0, friction, restitution: 0.1 }, scene) };
  };
  const remove = (it: Item) => { if (it.agg) { tracked.delete(it.agg.body); it.agg.dispose(); } it.mesh.dispose(); };

  /* collisions with the impact speed measured just before the step */
  const tracked = new Map<B.PhysicsBody, B.Vector3>();
  scene.onBeforePhysicsObservable.add(() => tracked.forEach((vel, b) => b.getLinearVelocityToRef(vel)));
  const onHit = (agg: B.PhysicsAggregate, fn: (h: Hit) => void) => {
    const body = agg.body;
    body.setCollisionCallbackEnabled(true);
    const prev = new B.Vector3(); tracked.set(body, prev);
    body.getCollisionObservable().add((ev) => {
      if (ev.type !== B.PhysicsEventType.COLLISION_STARTED) return;
      const other = ev.collider === body ? ev.collidedAgainst : ev.collider;
      const speed = ev.normal ? Math.abs(B.Vector3.Dot(prev, ev.normal)) : prev.length();
      fn({ other, speed, point: ev.point, vel: prev.clone() });
    });
  };

  /* breaking: small convex shards that keep flying under Havok */
  const shatter = (at: B.Vector3, n: number, size: number, mt: B.Material, push: V3, spread = 1.6): Item[] => {
    const out: Item[] = [];
    for (let k = 0; k < n; k++) {
      const m = B.MeshBuilder.CreatePolyhedron("shard", { type: Math.floor(rng() * 4), size: size * (0.6 + rng() * 0.8) }, scene);
      m.position.set(at.x + (rng() - 0.5) * size * 3, at.y + rng() * size * 2, at.z + (rng() - 0.5) * size * 3);
      m.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      finish(m, mt, {});
      const agg = new B.PhysicsAggregate(m, B.PhysicsShapeType.CONVEX_HULL, { mass: 0.02, friction: 0.6, restitution: 0.25 }, scene);
      agg.body.setLinearVelocity(new B.Vector3(push[0] + (rng() - 0.5) * spread * 2, push[1] + rng() * spread, push[2] + (rng() - 0.5) * spread * 2));
      agg.body.setAngularVelocity(new B.Vector3((rng() - 0.5) * 20, (rng() - 0.5) * 20, (rng() - 0.5) * 20));
      out.push({ mesh: m, agg });
    }
    return out;
  };

  /* particles (visual only: rain, smoke, sparks, dust) */
  const dotTex = (name: string, inner: string, outer: string, streak = false) => {
    const t = new B.DynamicTexture(name, { width: 64, height: 64 }, scene, false);
    const c = t.getContext() as unknown as CanvasRenderingContext2D;
    if (streak) { const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, outer); g.addColorStop(0.5, inner); g.addColorStop(1, outer); c.fillStyle = g; c.fillRect(28, 0, 8, 64); }
    else { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, inner); g.addColorStop(1, outer); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
    t.hasAlpha = true; t.update();
    return t;
  };
  let texSpark: B.DynamicTexture | null = null, texSmoke: B.DynamicTexture | null = null, texRain: B.DynamicTexture | null = null;
  const c4 = (hex: string, a: number) => { const c = B.Color3.FromHexString(hex); return new B.Color4(c.r, c.g, c.b, a); };
  const burst = (at: B.Vector3, o: { n: number; color: string; kind: "spark" | "dust" | "splash"; power?: [number, number]; size?: [number, number]; life?: [number, number] }) => {
    const ps = new B.ParticleSystem(`burst-${o.kind}`, o.n, scene);
    if (o.kind === "spark") ps.particleTexture = texSpark ??= dotTex("spark", "rgba(255,255,240,1)", "rgba(255,170,40,0)");
    else ps.particleTexture = texSmoke ??= dotTex("smoke", "rgba(255,255,255,0.9)", "rgba(255,255,255,0)");
    ps.emitter = at.clone();
    ps.createSphereEmitter(0.05, 1);
    ps.manualEmitCount = o.n; ps.updateSpeed = 1 / 60;
    ps.minEmitPower = o.power?.[0] ?? 1; ps.maxEmitPower = o.power?.[1] ?? 3;
    ps.minSize = o.size?.[0] ?? 0.03; ps.maxSize = o.size?.[1] ?? 0.08;
    ps.minLifeTime = o.life?.[0] ?? 0.4; ps.maxLifeTime = o.life?.[1] ?? 1.2;
    ps.gravity = new B.Vector3(0, o.kind === "dust" ? 0.3 : -9.81, 0);
    ps.color1 = c4(o.color, 1); ps.color2 = c4(o.color, 0.8); ps.colorDead = c4(o.color, 0);
    ps.blendMode = o.kind === "spark" ? B.ParticleSystem.BLENDMODE_ADD : B.ParticleSystem.BLENDMODE_STANDARD;
    ps.targetStopDuration = 2.5; ps.disposeOnStop = true;
    ps.start();
    return ps;
  };
  const smoke = (at: B.Vector3, color = "#3b3b3b", rate = 60) => {
    const ps = new B.ParticleSystem("smoke", 800, scene);
    ps.particleTexture = texSmoke ??= dotTex("smoke", "rgba(255,255,255,0.9)", "rgba(255,255,255,0)");
    ps.emitter = at.clone(); ps.createConeEmitter(0.3, 0.5);
    ps.emitRate = rate; ps.updateSpeed = 1 / 60;
    ps.minEmitPower = 0.6; ps.maxEmitPower = 1.4; ps.minSize = 0.4; ps.maxSize = 1.2; ps.minLifeTime = 2; ps.maxLifeTime = 4;
    ps.gravity = new B.Vector3(0.3, 0.6, 0); ps.minAngularSpeed = -0.5; ps.maxAngularSpeed = 0.5;
    ps.color1 = c4(color, 0.55); ps.color2 = c4(color, 0.35); ps.colorDead = c4(color, 0);
    ps.addSizeGradient(0, 0.4); ps.addSizeGradient(1, 2.2);
    ps.blendMode = B.ParticleSystem.BLENDMODE_STANDARD;
    ps.start();
    return ps;
  };
  const rain = (rate: number, wind: V3 = [0, 0, 0], area: V3 = [28, 2, 20]) => {
    const ps = new B.ParticleSystem("rain", 9000, scene);
    ps.particleTexture = texRain ??= dotTex("rain", "rgba(220,230,240,0.9)", "rgba(220,230,240,0)", true);
    ps.emitter = new B.Vector3(0, 12, 0);
    const dir = new B.Vector3(wind[0] * 0.06, -1, wind[2] * 0.06);
    ps.createBoxEmitter(dir, dir, new B.Vector3(-area[0] / 2, 0, -area[2] / 2), new B.Vector3(area[0] / 2, area[1], area[2] / 2));
    ps.emitRate = rate; ps.updateSpeed = 1 / 60;
    ps.minEmitPower = 12; ps.maxEmitPower = 16; ps.minLifeTime = 0.9; ps.maxLifeTime = 1.1;
    ps.minSize = 0.025; ps.maxSize = 0.04; ps.minScaleY = 6; ps.maxScaleY = 9;
    ps.billboardMode = B.ParticleSystem.BILLBOARDMODE_STRETCHED;
    ps.gravity = new B.Vector3(wind[0], -9.81, wind[2]);
    ps.color1 = new B.Color4(0.75, 0.8, 0.86, 0.35); ps.color2 = new B.Color4(0.7, 0.75, 0.82, 0.25); ps.colorDead = new B.Color4(0.7, 0.75, 0.82, 0);
    ps.blendMode = B.ParticleSystem.BLENDMODE_STANDARD;
    ps.start();
    return ps;
  };

  const labels: B.Mesh[] = [];
  /** a sign or a screen: a plane with text drawn on a canvas; draw() redraws it (e.g. a meter reading) */
  const label = (name: string, lines: string[], size: [number, number], pos: V3, o: { bg?: string; fg?: string; rot?: V3; glow?: boolean; px?: number; parent?: B.TransformNode } = {}) => {
    const W = 512, H = Math.max(64, Math.round((512 * size[1]) / size[0]));
    const t = new B.DynamicTexture(`${name}-label`, { width: W, height: H }, scene, true);
    const m = B.MeshBuilder.CreatePlane(name, { width: size[0], height: size[1], sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    m.position.set(pos[0], pos[1], pos[2]); if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]); if (o.parent) m.parent = o.parent;
    const mt = new B.PBRMaterial(`${name}-mat`, scene);
    mt.roughness = 0.5; mt.metallic = 0;
    if (o.glow) { mt.albedoColor = new B.Color3(0, 0, 0); mt.emissiveTexture = t; mt.emissiveColor = new B.Color3(1, 1, 1); mt.emissiveIntensity = 0.85; }
    else mt.albedoTexture = t;
    m.material = mt;
    // text must stay readable: keep signs and screens out of the glow effect
    labels.push(m); glowLayer?.addExcludedMesh(m);
    const draw = (ls: string[], fg = o.fg ?? "#ffffff", bg = o.bg ?? "#1b2230") => {
      const c = t.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      const px = o.px ?? Math.min(56, Math.floor((H * 0.8) / Math.max(1, ls.length)));
      c.fillStyle = fg; c.font = `bold ${px}px Arial, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
      ls.forEach((l, i) => c.fillText(l, W / 2, (H / (ls.length + 1)) * (i + 1)));
      t.update();
    };
    draw(lines);
    return { mesh: m, mat: mt, draw };
  };

  let glowLayer: B.GlowLayer | null = null;
  const glow = (intensity = 0.8) => {
    if (!glowLayer) { const g = new B.GlowLayer("glow", scene, { mainTextureSamples: high ? 4 : 1, blurKernelSize: 48 }); labels.forEach((m) => g.addExcludedMesh(m)); glowLayer = g; }
    glowLayer.intensity = intensity; return glowLayer;
  };
  const skyFlash = (f: number) => skyMat.setFloat("flash", f);

  /* scenery */
  const tree = (pos: V3, h = 3.2, s = 1) => {
    const trunk = cyl("trunk", { h, top: 0.16 * s, bottom: 0.26 * s, tess: 14 }, [pos[0], h / 2, pos[2]], mat("bark", { tex: "bark", uv: [1, 2], rough: 0.95 }));
    const leaf = mat("leaves", { color: "#3f6e2e", rough: 0.85, sheen: "#7fae5a" });
    for (let k = 0; k < 4; k++) sphere("canopy", (1.5 + rng() * 0.8) * s, [pos[0] + (rng() - 0.5) * 0.9 * s, h + (rng() - 0.2) * 0.8 * s, pos[2] + (rng() - 0.5) * 0.9 * s], leaf, { seg: 12, scale: [1, 0.85, 1] });
    return trunk;
  };
  /** a simple person facing +x; returns the joints so scenes can animate them */
  const human = (name: string, pos: V3, o: { shirt: string; pants: string; skin?: string; height?: number; facing?: number }): Human => {
    const root = new B.TransformNode(name, scene);
    root.position.set(pos[0], pos[1], pos[2]); root.rotation.y = o.facing ?? 0; root.scaling.setAll((o.height ?? 1.75) / 1.75);
    const skin = mat(`skin-${o.skin ?? "a"}`, { color: o.skin ?? "#d9a27e", rough: 0.6, sheen: "#f0c0a0" });
    const shirt = mat(`cloth-${o.shirt}`, { color: o.shirt, rough: 0.85, sheen: o.shirt });
    const pants = mat(`cloth-${o.pants}`, { color: o.pants, rough: 0.8 });
    const joint = (n: string, at: V3) => { const j = new B.TransformNode(n, scene); j.parent = root; j.position.set(at[0], at[1], at[2]); return j; };
    const limb = (j: B.TransformNode, len: number, r: number, mt: B.Material) => {
      const m = B.MeshBuilder.CreateCapsule("limb", { height: len, radius: r, tessellation: 12 }, scene);
      m.parent = j; m.position.y = -len / 2 + r; finish(m, mt, {});
      return m;
    };
    const hipL = joint("hipL", [0, 0.92, -0.1]), hipR = joint("hipR", [0, 0.92, 0.1]);
    limb(hipL, 0.92, 0.075, pants); limb(hipR, 0.92, 0.075, pants);
    const torso = B.MeshBuilder.CreateCapsule("torso", { height: 0.66, radius: 0.17, tessellation: 14 }, scene);
    torso.parent = root; torso.position.y = 1.24; torso.scaling.z = 1.25; finish(torso, shirt, {});
    const head = B.MeshBuilder.CreateSphere("head", { diameter: 0.23, segments: 18 }, scene);
    head.parent = root; head.position.y = 1.68; finish(head, skin, {});
    const hair = B.MeshBuilder.CreateSphere("hair", { diameter: 0.245, segments: 14, slice: 0.55 }, scene);
    hair.parent = root; hair.position.set(-0.01, 1.7, 0); finish(hair, mat("hair", { color: "#2b1d14", rough: 0.6, sheen: "#5a4030" }), {});
    const shL = joint("shL", [0, 1.5, -0.24]), shR = joint("shR", [0, 1.5, 0.24]);
    limb(shL, 0.62, 0.05, shirt); limb(shR, 0.62, 0.05, shirt);
    return { root, hipL, hipR, shL, shR };
  };

  return {
    B, scene, cam, sun, shadows, rng, high,
    t: 0,
    log: opts.log, v, lin, mat, tex, box, sphere, cyl, ground, remove, onHit, shatter,
    burst, smoke, rain, glow, skyFlash, tree, human, focus, label, finish,
    addShadow: (m: B.AbstractMesh) => shadows.addShadowCaster(m),
  };
}
