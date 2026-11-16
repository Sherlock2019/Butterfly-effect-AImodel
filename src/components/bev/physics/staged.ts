/**
 * Physical World · staged 3D scenes (one per scenario whose action is not itself a physical event)
 * and the double-slit experiment. Staging shows the people, places and objects involved; scripted
 * moves run at set times; Havok only moves incidental bodies (papers, scrap, a lid, a cut cable).
 * Nothing here is predicted: every scene is labelled "staging" on screen (src/lib/physics-scenes.ts).
 */

import * as B from "@babylonjs/core";
import { doubleSlitIntensity, type ExperimentScene, type StagedScene } from "@/lib/physics-scenes";
import { SKIES, type Human, type Item, type Kit, type Sky, type V3 } from "./kit";
import { room, serverHall, type SceneDef } from "./scenes";

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const LAB: Sky = { zenith: "#1a1e26", horizon: "#3a4150", ground: "#14161b", sun: [0.3, 0.9, 0.4], sunColor: "#dfe8ff", sunIntensity: 2.6, env: 1.1, exposure: 1.3 };

/* ---------- small builders ---------------------------------------------------------------------- */

const UP = new B.Vector3(0, 1, 0);
/** a straight cable / pipe between two points (a unit cylinder scaled and turned) */
function wire(k: Kit, a: B.Vector3, b: B.Vector3, d: number, mt: B.Material, cast = false) {
  const m = B.MeshBuilder.CreateCylinder("wire", { height: 1, diameter: d, tessellation: 8 }, k.scene);
  m.material = mt; m.receiveShadows = true; if (cast) k.addShadow(m);
  setWire(m, a, b);
  return m;
}
function setWire(m: B.Mesh, a: B.Vector3, b: B.Vector3) {
  const dir = b.subtract(a), len = dir.length();
  m.position.copyFrom(a.add(b).scale(0.5));
  m.scaling.y = Math.max(0.001, len);
  m.rotationQuaternion ??= new B.Quaternion();
  B.Quaternion.FromUnitVectorsToRef(UP, dir.normalize(), m.rotationQuaternion);
}

function walkPose(h: Human, phase: number, amp = 0.45) {
  const s = Math.sin(phase) * amp;
  h.hipL.rotation.z = s; h.hipR.rotation.z = -s; h.shL.rotation.z = -s * 0.7; h.shR.rotation.z = s * 0.7;
}

/** a parked or moving car without physics (body, cabin, wheels) */
function carMesh(k: Kit, pos: V3, color: string, rotY = 0) {
  const root = new B.TransformNode("car", k.scene); root.position.set(pos[0], pos[1], pos[2]); root.rotation.y = rotY;
  const paint = k.mat(`paint-${color}`, { color, rough: 0.32, metal: 0.55, clearcoat: 1 });
  k.box("carBody", [4.2, 0.6, 1.8], [0, 0.55, 0], paint, { parent: root });
  k.box("carCabin", [2.2, 0.55, 1.62], [-0.25, 1.1, 0], k.mat("cabinGlass", { color: "#1a222c", rough: 0.05, metal: 0.2, clearcoat: 1 }), { parent: root });
  const tyre = k.mat("tyre", { color: "#161616", rough: 0.9 });
  const wheels: B.TransformNode[] = [];
  for (const [x, z] of [[1.35, -0.86], [1.35, 0.86], [-1.35, -0.86], [-1.35, 0.86]]) {
    const hub = new B.TransformNode("hub", k.scene); hub.parent = root; hub.position.set(x, 0.33, z);
    k.cyl("wheel", { h: 0.24, d: 0.66, tess: 24 }, [0, 0, 0], tyre, { parent: hub, rot: [Math.PI / 2, 0, 0] });
    wheels.push(hub);
  }
  return { root, wheels };
}

/** a building block with a window facade */
function building(k: Kit, size: V3, pos: V3, o: { color?: string; sign?: string; signColor?: string } = {}) {
  const b = k.box("building", size, [pos[0], size[1] / 2, pos[2]], k.mat(`facade-${size.join("x")}`, { tex: "windows", uv: [size[0] / 4, size[1] / 4], color: o.color ?? "#ffffff", rough: 0.75 }), { mass: 0 });
  if (o.sign) k.label("sign", [o.sign], [Math.min(size[0] * 0.8, 7), 0.8], [pos[0], size[1] - 0.6, pos[2] + size[2] / 2 + 0.03], { bg: o.signColor ?? "#1b2a44", fg: "#ffffff", glow: true });
  return b;
}

function pylon(k: Kit, x: number, z: number, h = 9) {
  const steel = k.mat("pylonSteel", { color: "#9aa0a6", rough: 0.45, metal: 0.85 });
  k.cyl("pylon", { h, top: 0.25, bottom: 0.9, tess: 4 }, [x, h / 2, z], steel);
  k.box("arm", [0.25, 0.2, 4], [x, h - 0.6, z], steel);
  k.box("arm2", [0.25, 0.2, 3], [x, h - 1.8, z], steel);
  return [new B.Vector3(x, h - 0.8, z - 1.8), new B.Vector3(x, h - 0.8, z + 1.8), new B.Vector3(x, h - 2, z)];
}

function turbine(k: Kit, pos: V3, h = 12) {
  const white = k.mat("turbineWhite", { color: "#eef0f2", rough: 0.35 });
  k.cyl("tower", { h, top: 0.35, bottom: 0.7, tess: 20 }, [pos[0], h / 2, pos[2]], white);
  k.box("nacelle", [1.6, 0.8, 0.8], [pos[0], h + 0.3, pos[2]], white);
  const rotor = new B.TransformNode("rotor", k.scene); rotor.position.set(pos[0] + 0.9, h + 0.3, pos[2]);
  for (let i = 0; i < 3; i++) { const p = new B.TransformNode("bladePivot", k.scene); p.parent = rotor; p.rotation.x = (i / 3) * Math.PI * 2; k.box("blade", [0.12, 5.5, 0.45], [0, 2.9, 0], white, { parent: p }); }
  return rotor;
}

/* ---------- scenes ------------------------------------------------------------------------------ */

export const STAGED_SCENES: Record<StagedScene, SceneDef> = {
  /* An AI data center joins the grid; power comes from pathway A (gas) or B (solar + wind). */
  datacenter_grid: {
    sky: SKIES.day,
    cam: { pos: [14, 15, 30], target: [-12, 2, 0] },
    build(k, variant) {
      k.ground(220, k.mat("grass", { tex: "grass", uv: [80, 80], rough: 0.95 }), 0.7);
      const concrete = k.mat("concrete", { tex: "concrete", uv: [4, 1], rough: 0.85 });
      k.box("dc", [12, 4, 7], [9, 2, 0], concrete, { mass: 0 });
      k.label("dcSign", ["AI DATA CENTER (fictional)"], [6, 0.7], [9, 3.2, 3.53], { bg: "#14233a", glow: true });
      const fans: B.TransformNode[] = [];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
        k.box("chiller", [1.6, 0.6, 1.6], [4.6 + i * 2.2, 4.3, -1.5 + j * 3], k.mat("chiller", { color: "#c9ced4", rough: 0.4, metal: 0.6 }));
        const f = new B.TransformNode("fan", k.scene); f.position.set(4.6 + i * 2.2, 4.62, -1.5 + j * 3);
        for (let b = 0; b < 3; b++) k.box("fanBlade", [1.1, 0.02, 0.18], [0, 0, 0], k.mat("fanBlade", { color: "#3b3f45", rough: 0.4 }), { parent: f, rot: [0, (b / 3) * Math.PI, 0], cast: false });
        fans.push(f);
      }
      // transmission line from the plant site (x ≈ −40) to the data center
      const xs = [-30, -20, -10, 0];
      const heads = xs.map((x) => pylon(k, x, 0));
      const cable = k.mat("cable", { color: "#202020", rough: 0.6 });
      const path: B.Vector3[] = [new B.Vector3(-38, 6, 0)];
      for (let i = 0; i < heads.length; i++) { path.push(heads[i][2].clone()); if (i) for (let c = 0; c < 3; c++) wire(k, heads[i - 1][c], heads[i][c], 0.05, cable); }
      path.push(new B.Vector3(3, 3, 0));
      for (let c = 0; c < 3; c++) wire(k, heads[3][c], new B.Vector3(3, 3.2, (c - 1) * 1.2), 0.05, cable);
      // the plant site follows the pathway
      const pw = variant === "low_carbon" ? "low_carbon" : variant === "fossil" ? "fossil" : "none";
      const rotors: B.TransformNode[] = [];
      if (pw === "fossil") {
        const profile: B.Vector3[] = [];
        for (let i = 0; i <= 12; i++) { const y = (i / 12) * 11; const r = 2.6 - 1.1 * Math.sin((i / 12) * Math.PI * 0.85); profile.push(new B.Vector3(r, y, 0)); }
        const tower = B.MeshBuilder.CreateLathe("coolingTower", { shape: profile, tessellation: 32, sideOrientation: B.Mesh.DOUBLESIDE }, k.scene);
        tower.position.set(-44, 0, -4); tower.material = k.mat("towerConcrete", { tex: "concrete", uv: [3, 2], color: "#d8d6d0", rough: 0.9 }); tower.receiveShadows = true; k.addShadow(tower);
        k.box("plantHall", [8, 5, 6], [-40, 2.5, 5], k.mat("plantHall", { color: "#8a8f96", rough: 0.6, metal: 0.4 }), { mass: 0 });
        k.cyl("stack", { h: 14, d: 0.9 }, [-37, 7, 7], k.mat("stack", { color: "#b0b4b8", rough: 0.5 }));
        k.label("plantSign", ["PATHWAY A · GAS PLANT"], [6, 0.8], [-40, 4.2, 8.03], { bg: "#4a2a1a", glow: true });
        k.smoke(new B.Vector3(-44, 11, -4), "#e9ecef", 30);
        k.smoke(new B.Vector3(-37, 14, 7), "#6b6b6b", 25);
      } else if (pw === "low_carbon") {
        const panel = k.mat("solar", { color: "#14244a", rough: 0.15, metal: 0.5, clearcoat: 1 });
        const proto = k.box("panel", [1.8, 0.05, 1.0], [-46, 0.9, -12], panel).mesh; proto.rotation.z = 0.5;
        for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) { if (!i && !j) continue; const inst = proto.createInstance("panelI"); inst.position.set(-46 + i * 2.4, 0.9, -12 + j * 1.6); inst.rotation.z = 0.5; k.addShadow(inst); }
        for (const z of [6, 13, 20]) rotors.push(turbine(k, [-42, 0, z]));
        k.label("plantSign", ["PATHWAY B · SOLAR + WIND (multi-year)"], [8, 0.8], [-40, 2, -2], { bg: "#1a3a2a", glow: true });
      } else {
        k.label("plantSign", ["ENERGY SOURCE NOT SPECIFIED", "pick pathway A or B"], [7, 1.4], [-40, 1.6, 0], { bg: "#2a2a2a", glow: true });
        const fence = k.mat("fence", { color: "#9aa0a6", rough: 0.4, metal: 0.8, alpha: 0.35 });
        k.box("plot", [14, 1.2, 0.05], [-42, 0.6, -6], fence, { cast: false }); k.box("plot2", [14, 1.2, 0.05], [-42, 0.6, 6], fence, { cast: false });
      }
      k.glow(0.8);
      // power pulses travelling along the line: more pulses once the data center is online
      const pulseMat = k.mat("pulse", { color: "#fff2b0", emissive: "#ffd34a", emissiveIntensity: 4, unlit: true });
      const pulses = Array.from({ length: 18 }, (_, i) => ({ m: k.sphere("pulse", 0.35, [0, -10, 0], pulseMat, { cast: false, seg: 8 }).mesh, s: i / 18 }));
      const seg = path.slice(1).map((p, i) => p.subtract(path[i]).length());
      const total = seg.reduce((a, b) => a + b, 0);
      const at = (u: number) => { let d = u * total; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) return B.Vector3.Lerp(path[i], path[i + 1], d / seg[i]); d -= seg[i]; } return path[path.length - 1]; };
      let online = false, said = false;
      return (dt) => {
        const t = k.t;
        if (!online && t >= 0.5) { online = true; k.log("the AI data center comes online: electricity demand rises (stated)"); }
        if (!said && t >= 2) { said = true; k.log(pw === "fossil" ? "pathway A: the gas plant may burn more fuel to meet the load (CO₂ may rise)" : pw === "low_carbon" ? "pathway B: providers may add solar, wind and grid capacity over years (compressed here)" : "energy pathway not specified: both outcomes stay UNKNOWN"); }
        const active = pw === "none" ? 0 : online ? 18 : 6;
        pulses.forEach((p, i) => { p.s = (p.s + dt * 0.12) % 1; p.m.setEnabled(i < active); if (i < active) p.m.position.copyFrom(at(p.s)); });
        fans.forEach((f) => (f.rotation.y += dt * (online ? 14 : 3)));
        rotors.forEach((r) => (r.rotation.x += dt * 1.6));
      };
    },
  },

  /* A ministry publishes a disclosure proposal; copies land on the press desk. */
  policy_desk: {
    sky: SKIES.day,
    cam: { pos: [7, 4.2, 10], target: [0, 2.2, -2] },
    build(k) {
      k.ground(80, k.mat("plaza", { tex: "concrete", uv: [20, 20], color: "#c9c4b8", rough: 0.8 }), 0.6);
      const stone = k.mat("stone", { tex: "plaster", uv: [4, 2], color: "#efe9dc", rough: 0.8 });
      k.box("ministry", [16, 7, 5], [0, 3.5, -8], stone, { mass: 0 });
      for (let i = 0; i < 8; i++) k.cyl("column", { h: 5.4, d: 0.6, tess: 20 }, [-6.3 + i * 1.8, 3.4, -5.1], stone);
      for (let s = 0; s < 3; s++) k.box("step", [15 - s * 0.6, 0.25, 1.2 - s * 0.3], [0, 0.125 + s * 0.25, -4.5 - s * 0.2], stone, { mass: 0 });
      const ped = k.cyl("pediment", { h: 15, d: 3, tess: 3 }, [0, 7.4, -5.3], stone, { rot: [0, 0, Math.PI / 2] }); ped.mesh.rotation.x = Math.PI / 2; ped.mesh.scaling.set(1, 1, 0.45);
      k.label("ministrySign", ["MINISTRY (fictional)"], [5, 0.6], [0, 6.25, -5.35], { bg: "#efe9dc", fg: "#3a3428" });
      // flag
      k.cyl("flagPole", { h: 6, d: 0.08 }, [6.5, 3, -2], k.mat("steel", { tex: "metal", color: "#cfd3d8", rough: 0.35, metal: 0.9 }));
      const flag = B.MeshBuilder.CreatePlane("flag", { width: 1.6, height: 1, sideOrientation: B.Mesh.DOUBLESIDE }, k.scene);
      flag.position.set(7.3, 5.4, -2); flag.material = k.mat("flagCloth", { color: "#2e5aa8", rough: 0.8, sheen: "#88aaff" });
      // press desk, podium, speaker, press
      const wood = k.mat("table", { tex: "wood", uv: [1, 1], rough: 0.35, clearcoat: 0.6 });
      k.box("desk", [3, 0.06, 1], [0, 0.78, 0.5], wood, { mass: 0, friction: 0.7 });
      for (const [x, z] of [[-1.4, 0.1], [1.4, 0.1], [-1.4, 0.9], [1.4, 0.9]]) k.box("leg", [0.06, 0.76, 0.06], [x, 0.38, z], wood);
      k.box("podium", [0.7, 1.2, 0.5], [0, 0.6, -1.4], k.mat("podium", { color: "#2b3a55", rough: 0.5 }), { mass: 0 });
      const speaker = k.human("speaker", [0, 0, -2.1], { shirt: "#22324d", pants: "#1d2533", facing: -Math.PI / 2 });
      for (let i = 0; i < 4; i++) k.human(`press${i}`, [-2.6 + i * 1.7, 0, 2.6 + (i % 2) * 0.4], { shirt: ["#8a5a3a", "#3f6b8c", "#6b6b6b", "#7a3f5a"][i], pants: "#2b2b30", facing: Math.PI / 2 });
      const paper = k.mat("paper", { color: "#f7f5ef", rough: 0.9 });
      let published = false, dropped = false, said = false;
      const papers: Item[] = [];
      return (dt) => {
        const t = k.t;
        flag.rotation.y = Math.sin(t * 2.2) * 0.25;
        speaker.shR.rotation.z = t < 1 ? ease(t) * 0.9 : 0.9 - ease(t - 1) * 0.9;
        void dt;
        if (!published && t >= 0.3) { published = true; k.log("the ministry publishes a proposal: large data centers would disclose power and water use (not adopted)"); }
        if (!dropped && t >= 1) {
          dropped = true;
          for (let i = 0; i < 7; i++) {
            const p = k.box("copy", [0.21, 0.004, 0.297], [(k.rng() - 0.5) * 1.6, 1.5 + i * 0.12, 0.5 + (k.rng() - 0.5) * 0.4], paper, { mass: 0.01, extents: [0.21, 0.01, 0.297], friction: 0.8, restitution: 0 });
            p.mesh.rotation.y = k.rng() * 3; papers.push(p);
          }
          const cover = k.label("cover", ["PROPOSAL", "data-center disclosure", "(not adopted)"], [0.2, 0.28], [0, 0.003, 0], { bg: "#f7f5ef", fg: "#1b2230", parent: papers[0].mesh, rot: [Math.PI / 2, 0, 0] });
          void cover;
          k.log("copies of the proposal land on the press desk (paper falls under Havok gravity)");
        }
        if (!said && t >= 3) { said = true; k.log("journalists may report it; nothing is decided yet"); }
      };
    },
  },

  /* Electricity prices rise: the meter's (fictional) price climbs; rooms go dark one by one. */
  price_meter: {
    sky: SKIES.dusk,
    cam: { pos: [-7.2, 2.8, 6.2], target: [-2.2, 1.4, 0.2] },
    build(k) {
      k.ground(60, k.mat("grass", { tex: "grass", uv: [24, 24], rough: 0.95 }), 0.7);
      const plaster = k.mat("plaster", { tex: "plaster", uv: [3, 1.5], rough: 0.9 });
      k.box("floor", [8, 0.1, 5], [0, 0.05, 0], k.mat("planks", { tex: "planks", uv: [4, 3], rough: 0.55, clearcoat: 0.3 }), { mass: 0, cast: false });
      k.box("back", [8, 2.8, 0.15], [0, 1.4, -2.5], plaster, { mass: 0 });
      k.box("left", [0.15, 2.8, 5], [-4, 1.4, 0], plaster, { mass: 0 });
      k.box("mid1", [0.12, 2.8, 3.2], [-1.3, 1.4, -0.9], plaster, { mass: 0 });
      k.box("mid2", [0.12, 2.8, 3.2], [1.3, 1.4, -0.9], plaster, { mass: 0 });
      // furniture
      k.box("sofa", [1.8, 0.7, 0.8], [-2.7, 0.4, -1.8], k.mat("sofa", { color: "#3f5878", rough: 0.9, sheen: "#7a96b8" }));
      k.box("fridge", [0.7, 1.8, 0.7], [2.2, 0.95, -2.0], k.mat("fridge", { color: "#e8eaec", rough: 0.3, metal: 0.2 }));
      k.box("bed", [1.6, 0.5, 2], [0, 0.3, -1.4], k.mat("bed", { color: "#c9b8a0", rough: 0.9, sheen: "#f0e0c8" }));
      k.box("tv", [1.2, 0.7, 0.05], [-2.7, 1.5, -2.4], k.mat("tvScreen", { color: "#05070a", rough: 0.1, emissive: "#3a6bd0", emissiveIntensity: 1.2 }));
      // three rooms with a ceiling lamp each
      const rooms = [-2.7, 0, 2.7].map((x) => {
        const bulb = k.mat(`bulb${x}`, { color: "#fff3d6", emissive: "#ffd89a", emissiveIntensity: 4 });
        k.sphere("bulb", 0.18, [x, 2.55, -0.6], bulb, { cast: false, seg: 12 });
        const l = new B.PointLight("lamp", new B.Vector3(x, 2.4, -0.6), k.scene); l.intensity = 5; l.range = 6; l.diffuse = k.lin("#ffd9a0");
        return { bulb, l };
      });
      // the meter on the outside wall
      k.box("meterBox", [0.1, 0.7, 0.5], [-4.12, 1.5, 1.4], k.mat("meterBox", { color: "#d8d8d2", rough: 0.5 }), { mass: 0 });
      const screen = k.label("meter", ["€0.24 / kWh", "fictional price"], [0.42, 0.3], [-4.18, 1.55, 1.4], { bg: "#06140a", fg: "#7dff9a", glow: true, rot: [0, -Math.PI / 2, 0] });
      const person = k.human("resident", [-2.4, 0.1, 0.8], { shirt: "#7a3f5a", pants: "#2b3040", facing: 0 });
      k.glow(0.7);
      let rose = false, off1 = false, off2 = false, last = "";
      return () => {
        const t = k.t;
        if (!rose && t >= 0.5) { rose = true; k.log("regional electricity prices rise sharply (stated; the meter's price is fictional)"); }
        const p = 0.24 + 0.15 * ease((t - 0.5) / 2.5);
        const txt = `€${p.toFixed(2)} / kWh`;
        if (txt !== last) { last = txt; screen.draw([txt, "fictional price"], p > 0.33 ? "#ff8a6a" : "#7dff9a", "#06140a"); }
        const off = (r: (typeof rooms)[number]) => { r.l.intensity = 0; r.bulb.emissiveIntensity = 0; };
        if (!off1 && t >= 3.5) { off1 = true; off(rooms[1]); k.log("a household may cut its use to lower the bill: a light goes off (possible, not predicted)"); }
        if (!off2 && t >= 4.6) { off2 = true; off(rooms[2]); k.log("…and another room (illustration of reduced use)"); }
        if (t > 3 && t < 3.6) person.shR.rotation.z = Math.sin((t - 3) * 5) * 0.9;
      };
    },
  },

  /* The production line runs, then stops: the critical component was not delivered. */
  factory_line: {
    sky: SKIES.hall,
    cam: { pos: [7, 5, 9.5], target: [0, 1, -0.5] },
    build(k) {
      k.ground(60, k.mat("factoryFloor", { tex: "concrete", uv: [20, 20], color: "#9a9c9e", rough: 0.7, clearcoat: 0.2 }), 0.6);
      const steel = k.mat("steel", { tex: "metal", color: "#cfd3d8", rough: 0.35, metal: 0.9 });
      k.box("belt", [10, 0.1, 0.8], [0, 0.8, 0], k.mat("belt", { color: "#1d1f22", rough: 0.85 }), { mass: 0, friction: 0.9 });
      k.box("rail", [10, 0.12, 0.06], [0, 0.88, 0.43], steel, { mass: 0 }); k.box("rail2", [10, 0.12, 0.06], [0, 0.88, -0.43], steel, { mass: 0 });
      for (let i = 0; i < 6; i++) k.box("leg", [0.08, 0.78, 0.7], [-4.6 + i * 1.84, 0.39, 0], steel);
      k.box("machine", [1.6, 1.8, 1.4], [-5.6, 0.9, 0], k.mat("machine", { color: "#e3a21a", rough: 0.4, metal: 0.3 }), { mass: 0 });
      // the bin at the end of the line
      const binMat = k.mat("bin", { color: "#3b5f8a", rough: 0.5, metal: 0.4 });
      k.box("binFloor", [1.6, 0.06, 1.6], [6, 0.03, 0], binMat, { mass: 0 });
      for (const [sx, sz, x, z] of [[0.06, 1.6, 5.2, 0], [0.06, 1.6, 6.8, 0], [1.6, 0.06, 6, -0.8], [1.6, 0.06, 6, 0.8]] as const) k.box("binWall", [sx, 0.7, sz], [x, 0.35, z], binMat, { mass: 0 });
      // robot arm (animated)
      const base = new B.TransformNode("robot", k.scene); base.position.set(0, 0, -1.4);
      k.cyl("robotBase", { h: 0.5, d: 0.6 }, [0, 0.25, 0], k.mat("robot", { color: "#e8eaec", rough: 0.35, metal: 0.4 }), { parent: base });
      const j1 = new B.TransformNode("j1", k.scene); j1.parent = base; j1.position.y = 0.5;
      k.box("armA", [0.18, 1.1, 0.18], [0, 0.55, 0], k.mat("robot", { color: "#e8eaec", rough: 0.35, metal: 0.4 }), { parent: j1 });
      const j2 = new B.TransformNode("j2", k.scene); j2.parent = j1; j2.position.y = 1.1;
      k.box("armB", [0.14, 0.9, 0.14], [0, 0.45, 0], k.mat("robotOrange", { color: "#ef6a1a", rough: 0.4 }), { parent: j2 });
      // empty loading bay at the back wall
      k.box("backWall", [16, 5, 0.2], [0, 2.5, -4], k.mat("wallPanel", { tex: "metal", color: "#b8bec6", rough: 0.5, metal: 0.4 }), { mass: 0, cast: false });
      k.box("dockDoor", [3.4, 3, 0.05], [3.5, 1.5, -3.88], k.mat("dockDark", { color: "#0d0f12", rough: 0.9 }), { cast: false });
      const sign = k.label("dockSign", ["LOADING BAY", "awaiting component"], [3, 0.7], [3.5, 3.5, -3.86], { bg: "#1b2230", glow: true });
      const beaconMat = k.mat("amber", { color: "#3a2a0a", emissive: "#ffb020", emissiveIntensity: 0 });
      k.cyl("beacon", { h: 0.2, d: 0.16 }, [-5.6, 1.95, 0], beaconMat, { cast: false });
      k.human("worker1", [-3, 0, 1.4], { shirt: "#2f6fb5", pants: "#2e3a48", facing: Math.PI / 2 });
      k.human("worker2", [2.5, 0, 1.6], { shirt: "#2f6fb5", pants: "#2e3a48", facing: Math.PI / 2 + 0.5 });
      k.glow(0.6);
      const carton = k.mat("carton", { color: "#b58a5a", rough: 0.9 });
      const boxes: Item[] = [];
      let next = 0, stopped = false, said = false;
      const v = new B.Vector3();
      return () => {
        const t = k.t;
        const running = t < 2.5;
        if (running && t >= next) { next = t + 0.9; boxes.push(k.box("carton", [0.45, 0.35, 0.45], [-4.6, 1.05, (k.rng() - 0.5) * 0.2], carton, { mass: 3, friction: 0.8 })); }
        for (const b of boxes) {
          const p = b.mesh.position;
          if (running && p.x < 5 && p.y < 1.2 && p.y > 0.85) { b.agg!.body.getLinearVelocityToRef(v); b.agg!.body.setLinearVelocity(new B.Vector3(1.6, v.y, 0)); }
        }
        if (running) { j1.rotation.z = Math.sin(t * 2) * 0.5; j2.rotation.z = Math.sin(t * 2 + 1) * 0.8; }
        if (!stopped && !running) {
          stopped = true;
          for (const b of boxes) { if (b.mesh.position.y > 0.85 && b.mesh.position.x < 5) { b.agg!.body.getLinearVelocityToRef(v); b.agg!.body.setLinearVelocity(new B.Vector3(0, v.y, 0)); } }
          sign.draw(["DELIVERY CANCELLED", "critical component (fictional)"], "#ffffff", "#7a1a14");
          k.log("the critical component was not delivered: the line stops (stated)");
        }
        if (stopped) beaconMat.emissiveIntensity = Math.sin(t * 8) > 0 ? 4 : 0;
        if (!said && t >= 4) { said = true; k.log("orders may be delayed; shifts may be paused (possible consequences)"); }
      };
    },
  },

  /* An incorrect headline about a bank spreads; passers-by look at their phones. */
  bank_report: {
    sky: SKIES.day,
    cam: { pos: [5, 4.5, 14], target: [-2.5, 3.6, -4] },
    build(k) {
      k.ground(90, k.mat("pavement", { tex: "concrete", uv: [20, 20], rough: 0.8 }), 0.6);
      k.box("road", [60, 0.02, 6], [0, 0.01, 4], k.mat("asphalt", { tex: "asphalt", uv: [1, 10], rough: 0.8 }), { mass: 0, cast: false });
      building(k, [12, 9, 4], [0, 0, -7], { sign: "EXAMPLE BANK (fictional)", signColor: "#173a5e" });
      building(k, [8, 12, 5], [-11, 0, -7.5], { color: "#d9d2c6" });
      building(k, [8, 7, 5], [11, 0, -7.5], { color: "#c7cfd8" });
      k.box("screenFrame", [5.2, 3.0, 0.2], [-5.5, 6.5, -4.85], k.mat("frame", { color: "#1a1a1a", rough: 0.5 }), { mass: 0 });
      const screen = k.label("screen", ["Weather · 18 °C", "(advert)"], [5, 2.8], [-5.5, 6.5, -4.73], { bg: "#0c2340", fg: "#cfe6ff", glow: true });
      const phoneMat = k.mat("phoneScreen", { color: "#05070a", emissive: "#9cc8ff", emissiveIntensity: 0.2 });
      const people = [[-4, 0.8], [-1.5, 1.4], [1.2, 0.9], [3.6, 1.5], [6, 0.8]].map(([x, z], i) => {
        const h = k.human(`p${i}`, [x, 0, z], { shirt: ["#8a5a3a", "#3f6b8c", "#c8456c", "#5a7a3a", "#6b6b6b"][i], pants: "#2b2b30", facing: i % 2 ? 0 : Math.PI });
        k.box("phone", [0.08, 0.15, 0.01], [0.3, 1.2, 0], phoneMat, { parent: h.root, cast: false, rot: [0, Math.PI / 2, 0] });
        return h;
      });
      k.glow(0.6);
      let shown = false, spread = false, said = false;
      return () => {
        const t = k.t;
        people.forEach((h, i) => { if (!shown || t < 1.3 + i * 0.2) { walkPose(h, t * 6 + i, 0.35); h.root.position.x += (i % 2 ? 1 : -1) * 0.012; } else walkPose(h, 0, 0); });
        if (!shown && t >= 1) { shown = true; screen.draw(["BANK FACES CASH SHORTFALL", "INCORRECT · FICTIONAL REPORT"], "#ffffff", "#7a1a14"); k.log("an outlet publishes an incorrect report about the bank (fictional headline)"); }
        if (shown && t > 1.4) { phoneMat.emissiveIntensity = 2.5; people.forEach((h, i) => { if (t > 1.3 + i * 0.2) h.shR.rotation.z = Math.min(1.3, (t - 1.3 - i * 0.2) * 3); }); }
        if (!spread && t >= 2.2) { spread = true; k.log("the story is shared on social media (fictional counts)"); }
        if (!said && t >= 3.5) { said = true; k.log("some customers may worry about their savings; no reaction is predicted"); }
      };
    },
  },

  /* A submarine cable is cut (cause assumed: a dragged anchor); traffic pulses stop. */
  seabed_cable: {
    sky: SKIES.underwater,
    cam: { pos: [-11, 4.5, 11], target: [-5, 0.6, 0] },
    build(k) {
      k.ground(120, k.mat("sand", { tex: "sand", uv: [30, 30], rough: 0.95 }), 0.8);
      for (let i = 0; i < 14; i++) { const r = B.MeshBuilder.CreatePolyhedron("rock", { type: 1 + (i % 3), size: 0.3 + k.rng() * 0.6 }, k.scene); r.position.set(-18 + k.rng() * 30, 0.15, -8 + k.rng() * 16); k.finish(r, k.mat("rock", { color: "#4a4a42", rough: 0.95 }), {}); }
      const sheath = k.mat("cableSheath", { color: "#1f1f1f", rough: 0.6 });
      const segs: Item[] = [];
      for (let i = 0; i < 32; i++) segs.push(k.cyl("cableSeg", { h: 0.98, d: 0.14, tess: 12 }, [-16 + i, 0.07, 0], sheath, { mass: 4, animated: true, rot: [0, 0, Math.PI / 2], friction: 0.8 }));
      k.glow(1);
      const pulseMat = k.mat("light", { color: "#e8fbff", emissive: "#6ff2ff", emissiveIntensity: 5, unlit: true });
      const pulses = Array.from({ length: 10 }, (_, i) => ({ m: k.sphere("pulse", 0.12, [0, 0.16, 0], pulseMat, { cast: false, seg: 8 }).mesh, x: -16 + i * 3.2 }));
      // the ship at the surface and its anchor
      const surf = B.MeshBuilder.CreateGround("surface", { width: 120, height: 120 }, k.scene); surf.position.y = 11; surf.material = k.mat("surface", { color: "#9fd8ff", rough: 0.1, alpha: 0.3, emissive: "#2a6f8f", emissiveIntensity: 0.4 });
      k.box("hull", [14, 2, 3.6], [-6, 11.3, -7], k.mat("hull", { color: "#2b2f36", rough: 0.6, metal: 0.4 }));
      const anchorMat = k.mat("anchor", { color: "#3b3d40", rough: 0.6, metal: 0.8 });
      const anchor = k.box("anchor", [0.25, 1.4, 0.25], [-6, 0.75, -6], anchorMat, { mass: 400, animated: true, extents: [1.2, 1.4, 0.4] });
      k.box("fluke", [1.2, 0.2, 0.25], [0, -0.6, 0], anchorMat, { parent: anchor.mesh });
      const chain = wire(k, new B.Vector3(-6, 1.4, -6), new B.Vector3(-6, 11, -7), 0.08, anchorMat);
      let cut = false, cutX = 99, said = false, rerouted = false;
      const pos = new B.Vector3(-6, 0.75, -6), q = B.Quaternion.Identity();
      k.onHit(anchor.agg!, (h) => {
        if (cut) return;
        const hit = segs.find((s) => s.agg!.body === h.other);
        if (!hit) return;
        cut = true; cutX = hit.mesh.position.x;
        segs.forEach((s) => { if (Math.abs(s.mesh.position.x - cutX) < 1.6) s.agg!.body.setMotionType(B.PhysicsMotionType.DYNAMIC); });
        k.log("the anchor snags and drags the cable: the segment breaks (Havok)");
        k.burst(hit.mesh.position.clone(), { n: 60, color: "#9a9070", kind: "dust", power: [0.3, 1], size: [0.2, 0.5], life: [1, 2.5] });
      });
      k.log("an anchor is dragged along the seabed (cause ASSUMED for this 3D scene)");
      return (dt) => {
        const t = k.t;
        if (t > 0.3) { pos.z = Math.min(4, -6 + (t - 0.3) * 1.3); anchor.agg!.body.setTargetTransform(pos, q); }
        setWire(chain, anchor.mesh.position.add(new B.Vector3(0, 0.7, 0)), new B.Vector3(-6, 11, -7));
        pulses.forEach((p) => {
          if (cut && p.x > cutX - 0.6 && p.x < cutX + 0.6) { p.m.setEnabled(false); return; }
          p.x += dt * 4; if (p.x > 16) p.x = -16;
          const blocked = cut && p.x > cutX; p.m.setEnabled(!blocked); p.m.position.set(p.x, 0.16, 0);
        });
        if (cut && !said && t > 0.5) { said = true; k.log("traffic on the route stops beyond the cut (light pulses)"); }
        if (cut && !rerouted && t >= 6) { rerouted = true; k.log("traffic may be rerouted to other cables or satellites (possible)"); }
      };
    },
  },

  /* An AI agent obtains an admin token and reaches the payments rack; payments are paused. */
  agent_breach: {
    sky: SKIES.hall,
    cam: { pos: [7.5, 4.6, 8.6], target: [1.6, 1.1, 0] },
    build(k) {
      k.ground(40, k.mat("hallFloor", { tex: "floorTiles", uv: [33, 33], rough: 0.45, clearcoat: 0.2 }), 0.6);
      const hall = serverHall(k, [0.8, 0, 0], true);
      k.box("desk", [1.4, 0.06, 0.7], [-2.6, 0.76, 1.2], k.mat("table", { tex: "wood", uv: [1, 1], rough: 0.35, clearcoat: 0.6 }), { mass: 0 });
      k.box("deskLeg", [1.3, 0.74, 0.05], [-2.6, 0.37, 0.9], k.mat("deskMetal", { color: "#3b3f45", rough: 0.4, metal: 0.6 }));
      k.label("terminal", ["ops-bot · AI agent", "token: ADMIN (unauthorized)"], [0.9, 0.5], [-2.6, 1.15, 1.0], { bg: "#0a1a24", fg: "#7fe7ff", glow: true });
      const payIdx = 7; // second row, third rack
      const target = hall.rackPos[payIdx].add(new B.Vector3(0, 1.0, 0.8));
      const tag = k.label("payTag", ["PAYMENTS"], [0.9, 0.3], [hall.rackPos[payIdx].x, 2.35, hall.rackPos[payIdx].z + 0.52], { bg: "#1b2230", glow: true });
      const agentMat = k.mat("agent", { color: "#bff6ff", emissive: "#4fe3ff", emissiveIntensity: 4, unlit: true });
      const agent = k.sphere("agent", 0.22, [-2.6, 1.5, 1.0], agentMat, { cast: false, seg: 16 }).mesh;
      const light = new B.PointLight("agentLight", agent.position.clone(), k.scene); light.diffuse = k.lin("#4fe3ff"); light.intensity = 3; light.range = 4;
      const beaconMat = k.mat("beacon", { color: "#3a0b0b", emissive: "#ff2a1a", emissiveIntensity: 0 });
      k.cyl("beacon", { h: 0.14, d: 0.12 }, [6.9, 2.6, -2.2], beaconMat, { cast: false });
      k.glow(0.9);
      const way = [agent.position.clone(), new B.Vector3(-0.5, 2.6, 1.6), new B.Vector3(target.x, 2.6, target.z + 0.6), target];
      let token = false, reached = false, alert = false;
      return () => {
        const t = k.t;
        if (!token && t >= 0.5) { token = true; k.log("the AI agent obtains a payment-system admin token without authorization (stated)"); }
        const u = ease((t - 0.8) / 2.2) * (way.length - 1), i = Math.min(way.length - 2, Math.floor(u));
        agent.position.copyFrom(B.Vector3.Lerp(way[i], way[i + 1], u - i)); light.position.copyFrom(agent.position);
        agent.scaling.setAll(1 + Math.sin(t * 9) * 0.12);
        if (!reached && t >= 3.0) { reached = true; hall.alertRack(payIdx); tag.draw(["PAYMENTS · PAUSED"], "#ffffff", "#7a1a14"); k.log("the payment system is compromised: card payments and transfers may be paused while it is contained"); }
        if (!alert && t >= 3.8) { alert = true; k.log("the security team is alerted (beacon); regulators may investigate (possible)"); }
        if (alert) beaconMat.emissiveIntensity = Math.sin(t * 9) > 0 ? 4 : 0;
      };
    },
  },

  /* A fire alarm sounds and smoke rises; a pedestrian stops, then walks away. */
  alarm_smoke: {
    sky: SKIES.day,
    cam: { pos: [9, 6, 17], target: [-1, 5, -4] },
    build(k) {
      k.ground(90, k.mat("pavement", { tex: "concrete", uv: [20, 20], rough: 0.8 }), 0.6);
      k.box("road", [60, 0.02, 6], [0, 0.01, 5], k.mat("asphalt", { tex: "asphalt", uv: [1, 10], rough: 0.8 }), { mass: 0, cast: false });
      building(k, [11, 10, 5], [0, 0, -6], { color: "#d9cfc0" });
      building(k, [7, 7, 5], [-10, 0, -6.5], { color: "#c7cfd8" });
      k.smoke(new B.Vector3(1.5, 10.2, -6), "#4a4a4a", 70);
      k.smoke(new B.Vector3(-1.2, 10.2, -5.4), "#5a5a5a", 40);
      k.cyl("bell", { h: 0.1, d: 0.4 }, [-3, 3.2, -3.44], k.mat("bell", { color: "#c62f26", rough: 0.3, metal: 0.5 }), { rot: [Math.PI / 2, 0, 0] });
      const flashMat = k.mat("alarmLight", { color: "#3a0b0b", emissive: "#ff2a1a", emissiveIntensity: 0 });
      k.sphere("alarmLight", 0.2, [-2.4, 3.2, -3.4], flashMat, { cast: false });
      const flash = new B.PointLight("alarm", new B.Vector3(-2.4, 3.2, -3), k.scene); flash.diffuse = k.lin("#ff3a2a"); flash.range = 8; flash.intensity = 0;
      const ped = k.human("pedestrian", [-6, 0, 1.2], { shirt: "#2f6fb5", pants: "#2b2b30", facing: 0 });
      k.human("other1", [4, 0, 2.2], { shirt: "#8a5a3a", pants: "#3a3a40", facing: Math.PI });
      k.glow(0.8);
      let rang = false, saw = false, left = false;
      return () => {
        const t = k.t;
        if (!rang && t >= 0.5) { rang = true; k.log("the fire alarm sounds (no audio in ACMP); smoke rises from the roof"); }
        if (rang) { const on = Math.sin(t * 10) > 0 ? 1 : 0; flashMat.emissiveIntensity = 4 * on; flash.intensity = 8 * on; }
        if (t < 1.6) { walkPose(ped, t * 7); ped.root.position.x = -6 + t * 1.5; }
        else if (t < 3) { walkPose(ped, 0, 0); ped.root.rotation.y = -0.5 * ease((t - 1.6) / 0.5); if (!saw) { saw = true; k.log("the pedestrian hears the alarm and sees the smoke"); } }
        else { ped.root.rotation.y = Math.PI; walkPose(ped, t * 7); ped.root.position.x -= 0.025; if (!left) { left = true; k.log("they may decide to move away from the building (possible)"); } }
      };
    },
  },

  /* A coronal mass ejection reaches Earth; the field compresses; auroras brighten. Not to scale. */
  solar_storm: {
    sky: SKIES.space,
    cam: { pos: [-8, 12, 46], target: [-10, 0, 0] },
    build(k) {
      const sunMat = k.mat("sun", { color: "#fff3c0", emissive: "#ffb347", emissiveIntensity: 5, unlit: true });
      k.sphere("sun", 14, [-42, 0, 0], sunMat, { cast: false, seg: 32 });
      const sunLight = new B.PointLight("sunLight", new B.Vector3(-42, 0, 0), k.scene); sunLight.intensity = 3000; sunLight.diffuse = k.lin("#fff1d0");
      const earthTex = new B.DynamicTexture("earthTex", { width: 512, height: 256 }, k.scene, true);
      const c = earthTex.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = "#1d4f8f"; c.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 26; i++) { c.fillStyle = ["#3f7a3a", "#7a6a3a", "#4f8a40"][i % 3]; c.beginPath(); c.ellipse(k.rng() * 512, 50 + k.rng() * 156, 20 + k.rng() * 50, 10 + k.rng() * 30, k.rng() * 3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#f2f6fa"; c.fillRect(0, 0, 512, 18); c.fillRect(0, 238, 512, 18); earthTex.update();
      const earthMat = new B.PBRMaterial("earth", k.scene); earthMat.albedoTexture = earthTex; earthMat.roughness = 0.6; earthMat.metallic = 0;
      const earth = B.MeshBuilder.CreateSphere("earth", { diameter: 4, segments: 48 }, k.scene); earth.position.set(12, 0, 0); earth.material = earthMat; earth.rotation.z = 0.4;
      // dipole field lines r = L·sin²θ, in several planes around the axis
      const field = new B.TransformNode("field", k.scene); field.position.copyFrom(earth.position);
      const lineMat = k.mat("fieldLine", { color: "#7fb6ff", emissive: "#3f86ff", emissiveIntensity: 1.5, alpha: 0.55, unlit: true });
      for (const L of [4, 6, 8.5]) for (let a = 0; a < 6; a++) {
        const pts: B.Vector3[] = [];
        for (let i = 4; i <= 56; i++) { const th = (i / 60) * Math.PI, r = L * Math.sin(th) ** 2; pts.push(new B.Vector3(r * Math.sin(th) * Math.cos((a / 6) * Math.PI * 2), r * Math.cos(th), r * Math.sin(th) * Math.sin((a / 6) * Math.PI * 2))); }
        const tube = B.MeshBuilder.CreateTube("fieldLine", { path: pts, radius: 0.04, tessellation: 6 }, k.scene); tube.material = lineMat; tube.parent = field;
      }
      const auroraMat = k.mat("aurora", { color: "#8affc0", emissive: "#3dff8a", emissiveIntensity: 0, alpha: 0.75, unlit: true });
      for (const y of [1.75, -1.75]) { const ring = B.MeshBuilder.CreateTorus("aurora", { diameter: 1.9, thickness: 0.18, tessellation: 40 }, k.scene); ring.position.set(12, y, 0); ring.material = auroraMat; ring.rotation.z = 0.4; ring.position.x += y > 0 ? -0.7 : 0.7; }
      k.glow(1.2);
      let left = false, hit = false, glow = false;
      let cme: B.ParticleSystem | null = null;
      return (dt) => {
        const t = k.t;
        earth.rotation.y += dt * 0.15;
        if (!left && t >= 0.3) {
          left = true; k.log("a coronal mass ejection leaves the Sun (the alert says it has arrived)");
          cme = k.burst(new B.Vector3(-35, 0, 0), { n: 900, color: "#ffb35a", kind: "spark", power: [16, 22], size: [0.15, 0.4], life: [2.2, 2.8] });
          cme.createConeEmitter(2, 0.25); cme.direction1 = new B.Vector3(1, 0, 0); cme.gravity = B.Vector3.Zero(); cme.manualEmitCount = 900;
          cme.minEmitPower = 16; cme.maxEmitPower = 22;
          // aim the cone toward Earth (+x)
          (cme.particleEmitterType as B.ConeParticleEmitter).directionRandomizer = 0.15;
          cme.emitter = new B.Vector3(-35, 0, 0); cme.worldOffset = B.Vector3.Zero();
          const n = new B.TransformNode("cmeAim", k.scene); n.position.set(-35, 0, 0); n.rotation.z = -Math.PI / 2; cme.emitter = n as unknown as B.AbstractMesh;
        }
        if (!hit && t >= 2.6) { hit = true; k.log("the burst compresses Earth's magnetic field on the day side (drawn, not computed)"); }
        if (hit) { const s = 1 - 0.18 * ease((t - 2.6) / 0.8); field.scaling.set(s, 1, 1); field.position.x = 12 + (1 - s) * 3; }
        if (!glow && t >= 3.4) { glow = true; k.log("auroras brighten near the poles; grids and satellites may be affected (possible)"); }
        if (glow) auroraMat.emissiveIntensity = Math.min(3, (t - 3.4) * 2) * (0.85 + 0.15 * Math.sin(t * 6));
      };
    },
  },

  /* Water freezes in a pipe; ice grows ≈9% bigger than the water; the pipe splits. */
  pipe_freeze: {
    sky: { ...SKIES.hall, sunIntensity: 1.2, exposure: 1.15 },
    cam: { pos: [1.5, 1.85, 1.6], target: [0, 1.5, -1.1] },
    build(k) {
      k.ground(20, k.mat("basementFloor", { tex: "concrete", uv: [6, 6], color: "#7f8182", rough: 0.85 }), 0.6);
      const wall = k.mat("basementWall", { tex: "concrete", uv: [3, 1.5], color: "#9a9b9c", rough: 0.9 });
      k.box("back", [8, 3, 0.2], [0, 1.5, -1.6], wall, { mass: 0, cast: false });
      k.box("side", [0.2, 3, 5], [-3, 1.5, 0.8], wall, { mass: 0, cast: false });
      const frostWin = k.mat("frostWindow", { color: "#e6f2ff", rough: 0.6, emissive: "#9fc6ff", emissiveIntensity: 0.5 });
      k.box("window", [1, 0.45, 0.05], [1.6, 2.5, -1.48], frostWin, { cast: false });
      const copper = k.mat("copper", { color: "#b87333", rough: 0.3, metal: 1 });
      k.cyl("pipeL", { h: 2.4, d: 0.12 }, [-1.8, 1.5, -1.2], copper, { rot: [0, 0, Math.PI / 2] });
      k.cyl("pipeR", { h: 2.4, d: 0.12 }, [1.8, 1.5, -1.2], copper, { rot: [0, 0, Math.PI / 2] });
      for (const x of [-2.4, -1, 1, 2.4]) k.box("clamp", [0.05, 0.3, 0.05], [x, 1.62, -1.38], k.mat("clamp", { color: "#555", rough: 0.5, metal: 0.8 }));
      // the clear section shows the ice growing inside
      k.cyl("pipeGlass", { h: 1.2, d: 0.13 }, [0, 1.5, -1.2], k.mat("pipeGlass", { color: "#d8ecff", rough: 0.05, alpha: 0.28 }), { rot: [0, 0, Math.PI / 2], cast: false });
      const water = k.cyl("water", { h: 1.18, d: 0.1 }, [0, 1.5, -1.2], k.mat("water", { color: "#4f9fd8", rough: 0.05, alpha: 0.6 }), { rot: [0, 0, Math.PI / 2], cast: false });
      const ice = k.cyl("ice", { h: 1.18, d: 0.105 }, [0, 1.5, -1.2], k.mat("ice", { color: "#eef7ff", rough: 0.35, emissive: "#9fd0ff", emissiveIntensity: 0.3 }), { rot: [0, 0, Math.PI / 2], cast: false });
      ice.mesh.scaling.y = 0.001;
      const therm = k.label("thermo", ["outdoor −12 °C", "pipe +1 °C"], [0.6, 0.35], [-1.2, 2.2, -1.48], { bg: "#0a1420", fg: "#9fd8ff", glow: true });
      let start = false, split = false, thaw = false, last = "";
      return () => {
        const t = k.t;
        if (!start && t >= 0.5) { start = true; k.log("the pipe cools to 0 °C: water starts to freeze (molecules lock into an ice lattice)"); }
        const f = ease((t - 0.5) / 3.5);
        ice.mesh.scaling.y = Math.max(0.001, f); water.mesh.setEnabled(f < 0.98);
        const tp = `pipe ${f > 0 ? (0 - f * 2).toFixed(1) : "+1.0"} °C`;
        if (tp !== last) { last = tp; therm.draw(["outdoor −12 °C", tp]); }
        if (!split && t >= 4.2) {
          split = true;
          k.log("the ice takes ≈9% more room than the water: pressure splits the pipe");
          const at = new B.Vector3(0.25, 1.55, -1.12);
          const shard = k.box("pipeShard", [0.25, 0.03, 0.08], [at.x, at.y + 0.05, at.z + 0.05], copper, { mass: 0.05 });
          shard.agg!.body.setLinearVelocity(new B.Vector3(0.4, 1.2, 1.1));
          k.shatter(at, 10, 0.012, k.mat("ice", { color: "#eef7ff", rough: 0.35 }), [0, 0.6, 0.8], 0.8);
        }
        if (!thaw && t >= 5.5) { thaw = true; k.log("when it thaws, water may leak here (not simulated)"); }
      };
    },
  },

  /* A scrap truck passes the radiation portal; the alarm trips; it brakes; the scrap shifts. */
  scrap_portal: {
    sky: SKIES.day,
    cam: { pos: [7, 5.5, 12], target: [-1.5, 1.5, 0] },
    build(k) {
      k.ground(90, k.mat("yard", { tex: "concrete", uv: [20, 20], color: "#8f8a80", rough: 0.85 }), 0.6);
      for (let i = 0; i < 8; i++) { const r = B.MeshBuilder.CreatePolyhedron("scrapPile", { type: i % 4, size: 0.8 + k.rng() }, k.scene); r.position.set(-8 + k.rng() * 16, 0.4, -7 - k.rng() * 4); k.finish(r, k.mat("rust", { color: "#7a4a2a", rough: 0.85, metal: 0.4 }), {}); }
      const steel = k.mat("portal", { color: "#d8dcdf", rough: 0.4, metal: 0.5 });
      k.box("pillarL", [0.5, 4, 0.7], [2, 2, -2.4], steel, { mass: 0 }); k.box("pillarR", [0.5, 4, 0.7], [2, 2, 2.4], steel, { mass: 0 });
      k.box("beam", [0.5, 0.4, 5.5], [2, 4.2, 0], steel, { mass: 0 });
      const lampMat = k.mat("portalLamp", { color: "#0a2a0a", emissive: "#2bff5a", emissiveIntensity: 2.5 });
      k.cyl("lamp", { h: 0.25, d: 0.25 }, [2, 4.55, 0], lampMat, { cast: false });
      const panel = k.label("portalPanel", ["RADIATION PORTAL", "background"], [1.6, 0.6], [2.27, 2.6, 2.4], { bg: "#0a1a24", glow: true, rot: [0, Math.PI / 2, 0] });
      // the truck: bed floor and walls are animated Havok bodies, moved together; cab and wheels follow
      const red = k.mat("truckCab", { color: "#b5322a", rough: 0.35, metal: 0.4, clearcoat: 0.8 });
      const bedMat = k.mat("bedSteel", { color: "#5a5f66", rough: 0.6, metal: 0.7 });
      const parts: { it: Item; off: B.Vector3 }[] = [];
      const part = (size: V3, off: V3) => { const it = k.box("bed", size, [off[0] - 14, off[1], off[2]], bedMat, { mass: 1000, animated: true, friction: 0.9 }); parts.push({ it, off: new B.Vector3(off[0], off[1], off[2]) }); return it; };
      const floor = part([5, 0.2, 2.3], [0, 1.1, 0]);
      part([5, 0.9, 0.1], [0, 1.65, 1.1]); part([5, 0.9, 0.1], [0, 1.65, -1.1]); part([0.1, 0.9, 2.3], [-2.45, 1.65, 0]); part([0.1, 0.9, 2.3], [2.45, 1.65, 0]);
      k.box("cab", [1.9, 2, 2.3], [3.6, 0.9, 0], red, { parent: floor.mesh });
      k.box("windscreen", [0.05, 0.8, 2.0], [4.56, 1.3, 0], k.mat("cabinGlass", { color: "#1a222c", rough: 0.05, metal: 0.2, clearcoat: 1 }), { parent: floor.mesh, cast: false });
      const tyre = k.mat("tyre", { color: "#161616", rough: 0.9 });
      for (const [x, z] of [[3.6, -1.05], [3.6, 1.05], [-1.2, -1.05], [-1.2, 1.05], [-2.1, -1.05], [-2.1, 1.05]]) k.cyl("wheel", { h: 0.3, d: 0.9, tess: 24 }, [x, -0.65, z], tyre, { parent: floor.mesh, rot: [Math.PI / 2, 0, 0] });
      const rust = ["#7a4a2a", "#5a5f66", "#8a6a4a", "#4a4f55"].map((c, i) => k.mat(`scrap${i}`, { color: c, rough: 0.7, metal: 0.7 }));
      for (let i = 0; i < 16; i++) {
        const x = -14 + (k.rng() - 0.5) * 3.8, z = (k.rng() - 0.5) * 1.6, y = 1.5 + Math.floor(i / 6) * 0.45;
        if (i % 3) k.box("scrap", [0.4 + k.rng() * 0.5, 0.2 + k.rng() * 0.3, 0.3 + k.rng() * 0.4], [x, y, z], rust[i % 4], { mass: 20, friction: 0.6 });
        else k.cyl("scrapPipe", { h: 0.9 + k.rng() * 0.6, d: 0.2 }, [x, y, z], rust[i % 4], { mass: 15, friction: 0.6, rot: [0, 0, Math.PI / 2] });
      }
      const src = k.sphere("source", 0.12, [-14.3, 1.35, 0.2], k.mat("source", { color: "#d6ff9a", emissive: "#9aff3a", emissiveIntensity: 2 }), { cast: false });
      const halo = k.sphere("halo", 3, [0, 0, 0], k.mat("halo", { color: "#bfff8a", emissive: "#8aff3a", emissiveIntensity: 0.5, alpha: 0.08, unlit: true }), { cast: false, seg: 20 });
      halo.mesh.parent = src.mesh; src.mesh.parent = floor.mesh; src.mesh.position.set(-0.3, 0.25, 0.2);
      k.glow(0.8);
      let x = -14, v = 3, alarm = false, stopped = false;
      const q = B.Quaternion.Identity(), p = new B.Vector3();
      k.log("a scrap truck drives toward the radiation portal (8 t at 3 m/s, assumed)");
      return (dt) => {
        const t = k.t;
        if (!alarm && x + 0 > -1.5) { alarm = true; lampMat.emissiveColor = k.lin("#ff2a1a"); panel.draw(["GAMMA 40× BACKGROUND", "ALARM (fictional)"], "#ffffff", "#7a1a14"); k.log("the portal detects elevated gamma radiation: alarm"); }
        if (alarm && v > 0) { v = Math.max(0, v - 2.5 * dt); if (v === 0 && !stopped) { stopped = true; k.log("the driver brakes; the scrap shifts forward in the bed (Havok)"); } }
        x += v * dt;
        for (const { it, off } of parts) { p.set(x + off.x, off.y, off.z); it.agg!.body.setTargetTransform(p, q); }
        halo.mesh.scaling.setAll(1 + Math.sin(t * 4) * 0.08);
        if (alarm) lampMat.emissiveIntensity = Math.sin(t * 9) > 0 ? 4 : 1;
      };
    },
  },

  /* A cosmic-ray particle strikes one memory cell; one bit flips; the program may crash. */
  bit_flip: {
    sky: LAB,
    cam: { pos: [2.3, 1.7, 2.7], target: [0, 0.55, 0] },
    build(k) {
      k.ground(20, k.mat("benchTop", { color: "#2a2d33", rough: 0.6 }), 0.6);
      k.box("board", [3, 0.05, 1.6], [0, 0.025, 0], k.mat("pcb", { tex: "pcb", uv: [2, 1], rough: 0.5 }), { mass: 0 });
      const dimm = k.mat("dimm", { tex: "pcb", uv: [1, 0.3], rough: 0.5 });
      k.box("dimm", [2.4, 0.6, 0.03], [0, 0.35, 0], dimm, { mass: 0 });
      const chipMat = k.mat("chip", { color: "#121214", rough: 0.4 });
      const hitMat = k.mat("chipHit", { color: "#121214", rough: 0.4, emissive: "#ff5a3a", emissiveIntensity: 0 });
      for (let i = 0; i < 8; i++) k.box("chip", [0.22, 0.32, 0.03], [-1.0 + i * 0.285, 0.38, 0.03], i === 3 ? hitMat : chipMat, { cast: true });
      const bits = "01101001";
      const display = k.label("bits", [bits.split("").join(" "), "memory word (8 bits)"], [1.4, 0.5], [0, 1.25, -0.3], { bg: "#05080d", fg: "#7dff9a", glow: true });
      const log = k.label("log", ["server running"], [1.2, 0.3], [0, 0.85, -0.6], { bg: "#05080d", fg: "#cfd8e3", glow: true });
      const streakMat = k.mat("ray", { color: "#ffffff", emissive: "#b8c8ff", emissiveIntensity: 6, unlit: true });
      const head = k.sphere("ray", 0.05, [-1.6, 4, 1.4], streakMat, { cast: false, seg: 10 }).mesh;
      const trail = wire(k, head.position.clone(), head.position.clone(), 0.015, streakMat);
      const from = new B.Vector3(-1.6, 4, 1.4), to = new B.Vector3(-1.0 + 3 * 0.285, 0.45, 0.06);
      k.glow(1.2);
      let hit = false, crash = false;
      return () => {
        const t = k.t;
        const u = Math.min(1, Math.max(0, (t - 0.5) / 1.0));
        head.position.copyFrom(B.Vector3.Lerp(from, to, u)); setWire(trail, B.Vector3.Lerp(from, to, Math.max(0, u - 0.35)), head.position);
        head.setEnabled(u < 1); trail.setEnabled(u > 0 && u < 1);
        if (!hit && u >= 1) {
          hit = true; hitMat.emissiveIntensity = 3;
          k.burst(to.clone(), { n: 40, color: "#ffd0a0", kind: "spark", power: [0.5, 1.5], size: [0.01, 0.03], life: [0.2, 0.5] });
          const flipped = bits.slice(0, 5) + "1" + bits.slice(6);
          display.draw([flipped.split("").join(" "), "bit 6 flipped 0 → 1"], "#ffb38a", "#05080d");
          k.log("a high-energy particle deposits charge in one memory cell: one bit flips (single-event upset)");
        }
        if (hit) hitMat.emissiveIntensity = Math.max(0, hitMat.emissiveIntensity - 0.05);
        if (!crash && t >= 2.6) { crash = true; log.draw(["uncorrected memory error", "process 4411 terminated (fictional)"], "#ff8a6a", "#05080d"); k.log("no error correction: the program using that memory may crash or compute a wrong result"); }
      };
    },
  },

  /* Mark gives Cathy a wrapped box; she opens it; the lid falls; an iPhone inside. */
  gift: {
    sky: SKIES.indoor,
    cam: { pos: [0.1, 1.7, 3.9], target: [-0.1, 1.05, 0.8] },
    build(k) {
      room(k);
      const mark = k.human("Mark", [-1.25, 0, 0.95], { shirt: "#2f4f7a", pants: "#2b2b30", facing: 0 });
      const cathy = k.human("Cathy", [1.0, 0, 0.95], { shirt: "#b8456c", pants: "#3a3040", facing: Math.PI, skin: "#c98f6e" });
      const wrap = k.mat("wrap", { color: "#c62f3a", rough: 0.4, clearcoat: 0.6 });
      const gold = k.mat("ribbon", { color: "#e3b23c", rough: 0.3, metal: 0.8 });
      const gift = new B.TransformNode("gift", k.scene); gift.position.set(-0.9, 1.05, 0.95);
      k.box("giftBase", [0.22, 0.12, 0.16], [0, 0, 0], wrap, { parent: gift });
      k.box("ribbonA", [0.23, 0.125, 0.03], [0, 0, 0], gold, { parent: gift, cast: false });
      const lidAt = new B.Vector3(0, 0.075, 0);
      const lid = k.box("lid", [0.235, 0.03, 0.175], [0, 0, 0], wrap, { parent: gift });
      lid.mesh.position.copyFrom(lidAt);
      const phone = k.box("iphone", [0.075, 0.005, 0.15], [0, 0.065, 0], k.mat("iphone", { color: "#1a1c20", rough: 0.15, metal: 0.6, emissive: "#2a3a5a", emissiveIntensity: 0 }), { parent: gift, cast: false });
      const price = k.label("price", ["≈ €900 (assumed)"], [0.6, 0.15], [-0.2, 1.9, 0.95], { bg: "#1b2230", glow: true });
      price.mesh.setEnabled(false);
      let given = false, opened = false, said = false;
      return () => {
        const t = k.t;
        const reach = ease((t - 0.3) / 1.0);
        mark.shR.rotation.z = reach * 1.2 * (t < 2 ? 1 : 1 - ease((t - 2) / 0.6));
        cathy.shL.rotation.z = ease((t - 0.9) / 0.6) * 1.1; cathy.shR.rotation.z = ease((t - 0.9) / 0.6) * 1.1;
        if (!opened) gift.position.x = -0.9 + reach * 1.45;
        if (!given && t >= 0.3) { given = true; price.mesh.setEnabled(true); k.log("Mark gives Cathy the gift he bought (an iPhone, ≈ €900 assumed)"); }
        if (!opened && t >= 2.2) {
          opened = true;
          const wp = lid.mesh.getAbsolutePosition().clone();
          lid.mesh.dispose();
          const free = k.box("lidFree", [0.235, 0.03, 0.175], [wp.x, wp.y + 0.02, wp.z], wrap, { mass: 0.05, friction: 0.6 });
          free.agg!.body.setLinearVelocity(new B.Vector3(0.6, 1.4, 0.3));
          free.agg!.body.setAngularVelocity(new B.Vector3(4, 0, 6));
          (phone.mesh.material as B.PBRMaterial).emissiveIntensity = 1.5;
          k.log("Cathy opens it: the lid falls away (Havok) and a new iPhone is inside");
        }
        if (opened) phone.mesh.position.y = Math.min(0.12, 0.065 + (t - 2.2) * 0.05);
        if (!said && t >= 3.2) { said = true; k.log("Cathy may be surprised and pleased (possible, not predicted)"); }
      };
    },
  },

  /* Lina walks to her manager's desk and hands in her letter; the email is on the laptop. */
  resignation: {
    sky: SKIES.office,
    cam: { pos: [3.8, 2.3, 4.6], target: [0.1, 1.0, 0] },
    build(k) {
      k.ground(20, k.mat("carpet", { tex: "carpet", uv: [8, 8], rough: 0.95 }), 0.7);
      const wall = k.mat("officeWall", { tex: "plaster", uv: [3, 1.5], color: "#eef0f2", rough: 0.9 });
      k.box("back", [10, 3, 0.15], [0, 1.5, -2], wall, { mass: 0, cast: false });
      k.box("side", [0.15, 3, 6], [-4, 1.5, 1], wall, { mass: 0, cast: false });
      k.box("windowView", [3, 1.6, 0.02], [1.2, 1.7, -1.9], k.mat("cityView", { tex: "windows", uv: [2, 1], color: "#bcd0e8", emissive: "#5a7090", emissiveIntensity: 0.5, rough: 0.3 }), { cast: false });
      const wood = k.mat("table", { tex: "wood", uv: [1, 1], rough: 0.35, clearcoat: 0.6 });
      k.box("desk", [1.6, 0.06, 0.8], [1.0, 0.75, -0.4], wood, { mass: 0, friction: 0.8 });
      k.box("deskSide", [0.05, 0.72, 0.75], [0.25, 0.37, -0.4], wood); k.box("deskSide2", [0.05, 0.72, 0.75], [1.75, 0.37, -0.4], wood);
      k.box("laptopBase", [0.36, 0.02, 0.25], [1.1, 0.79, -0.5], k.mat("laptop", { color: "#c8ccd2", rough: 0.3, metal: 0.8 }));
      k.label("email", ["From: Lina", "Subject: My resignation", "last day in one month"], [0.36, 0.24], [1.1, 0.92, -0.62], { bg: "#f4f6f8", fg: "#1b2230", glow: true, rot: [-0.25, 0, 0] });
      k.cyl("pot", { h: 0.4, top: 0.35, bottom: 0.28 }, [-3.3, 0.2, -1.4], k.mat("pot", { color: "#b5653d", rough: 0.7 }));
      k.sphere("plant", 0.8, [-3.3, 0.8, -1.4], k.mat("leaves", { color: "#3f6e2e", rough: 0.85, sheen: "#7fae5a" }), { seg: 12, scale: [1, 1.3, 1] });
      const manager = k.human("manager", [1.2, 0, -1.2], { shirt: "#e9e6dc", pants: "#2b2b30", facing: Math.PI / 2 + 0.6 });
      const lina = k.human("Lina", [-3, 0, 0.6], { shirt: "#3f7a6a", pants: "#2e3040", facing: 0, skin: "#e0b090" });
      const paper = k.mat("paper", { color: "#f7f5ef", rough: 0.9 });
      const letter = k.box("letterHeld", [0.21, 0.004, 0.297], [0.32, 1.0, 0.05], paper, { parent: lina.root, cast: false });
      let emailed = false, handed = false, said = false;
      return () => {
        const t = k.t;
        if (!emailed && t >= 0.3) { emailed = true; k.log("Lina emails her manager: she is resigning, with one month's notice"); }
        if (t < 2.4) { walkPose(lina, t * 7); lina.root.position.x = -3 + ease(t / 2.4) * 2.85; }
        else walkPose(lina, 0, 0);
        lina.shR.rotation.z = t > 2.2 && t < 3.0 ? ease((t - 2.2) / 0.4) * 1.2 : t >= 3 ? 1.2 - ease((t - 3) / 0.5) * 1.2 : lina.shR.rotation.z;
        if (!handed && t >= 2.7) {
          handed = true;
          const wp = letter.mesh.getAbsolutePosition().clone(); letter.mesh.dispose();
          const free = k.box("letter", [0.21, 0.004, 0.297], [Math.max(0.45, wp.x), 0.95, -0.25], paper, { mass: 0.01, extents: [0.21, 0.01, 0.297], friction: 0.8, restitution: 0 });
          free.mesh.rotation.y = 0.4;
          k.log("she puts her letter on the manager's desk (paper falls under Havok gravity)");
        }
        manager.root.rotation.y = Math.PI / 2 + 0.6 - 0.5 * ease((t - 2.6) / 0.6);
        if (!said && t >= 3.4) { said = true; k.log("the manager may be surprised and ask what would make her stay (possible)"); }
      };
    },
  },

  /* Julie cycles to work; her car stays parked in the driveway. */
  cycling: {
    sky: SKIES.day,
    cam: { pos: [-7, 3.6, 14.5], target: [-7, 1, 1.5] },
    build(k) {
      k.ground(160, k.mat("grass", { tex: "grass", uv: [60, 60], rough: 0.95 }), 0.7);
      k.box("road", [120, 0.02, 7], [20, 0.01, 2.5], k.mat("asphalt", { tex: "asphalt", uv: [1, 17], rough: 0.8 }), { mass: 0, cast: false });
      k.box("bikeLane", [120, 0.021, 1.4], [20, 0.012, 5.4], k.mat("bikeLane", { color: "#3f7a4a", rough: 0.8 }), { mass: 0, cast: false });
      k.box("driveway", [4, 0.02, 5], [-12, 0.011, -3.5], k.mat("concrete", { tex: "concrete", uv: [2, 2], rough: 0.85 }), { cast: false });
      building(k, [7, 5, 6], [-17, 0, -6], { color: "#e6dccd" });
      for (let i = 0; i < 6; i++) building(k, [6, 4 + (i % 3), 6], [-4 + i * 9, 0, -7.5], { color: ["#d9cfc0", "#c7cfd8", "#e2d6c4"][i % 3] });
      for (let i = 0; i < 9; i++) k.tree([-14 + i * 7, 0, -2.6], 3.6, 0.9);
      const parked = carMesh(k, [-12, 0, -3.5], "#7a8a9a", Math.PI / 2);
      void parked;
      k.label("carTag", ["Julie's car · parked"], [2.2, 0.35], [-12, 2.1, -3.5], { bg: "#1b2230", glow: true });
      const passing = carMesh(k, [40, 0, 1.2], "#b5322a", Math.PI);
      // Julie on her bike
      const bike = new B.TransformNode("bike", k.scene); bike.position.set(-10, 0, 5.4);
      const frame = k.mat("bikeFrame", { color: "#1f7a8c", rough: 0.3, metal: 0.6, clearcoat: 0.8 });
      const tyre = k.mat("tyre", { color: "#161616", rough: 0.9 });
      const wheels: B.Mesh[] = [];
      for (const x of [-0.55, 0.55]) { const w = B.MeshBuilder.CreateTorus("bikeWheel", { diameter: 0.66, thickness: 0.04, tessellation: 32 }, k.scene); w.parent = bike; w.position.set(x, 0.35, 0); w.rotation.x = Math.PI / 2; w.material = tyre; k.addShadow(w); wheels.push(w); }
      const tube = (a: V3, b: V3) => { const m = wire(k, new B.Vector3(...a), new B.Vector3(...b), 0.035, frame, true); m.parent = bike; };
      tube([-0.55, 0.35, 0], [-0.05, 0.35, 0]); tube([-0.05, 0.35, 0], [-0.15, 0.85, 0]); tube([-0.15, 0.85, 0], [0.4, 0.85, 0]); tube([0.4, 0.85, 0], [0.55, 0.35, 0]); tube([-0.05, 0.35, 0], [0.4, 0.85, 0]); tube([-0.55, 0.35, 0], [-0.15, 0.85, 0]);
      tube([0.4, 0.85, 0], [0.45, 1.0, 0]); tube([0.45, 1.0, -0.25], [0.45, 1.0, 0.25]);
      k.box("saddle", [0.25, 0.05, 0.12], [-0.17, 0.9, 0], k.mat("saddle", { color: "#151515", rough: 0.6 }), { parent: bike });
      const julie = k.human("Julie", [0, 0, 0], { shirt: "#e3a21a", pants: "#2e3a48", height: 1.65, skin: "#e3b28e" });
      julie.root.parent = bike; julie.root.position.set(-0.2, 0.05, 0);
      julie.shL.rotation.z = 1.15; julie.shR.rotation.z = 1.15;
      k.box("helmet", [0.28, 0.12, 0.24], [-0.01, 1.84, 0], k.mat("helmet", { color: "#e8eaec", rough: 0.3, clearcoat: 0.8 }), { parent: julie.root });
      let s1 = false, s2 = false, s3 = false;
      return (dt) => {
        const t = k.t;
        const v = Math.min(5, t * 3); // ≈18 km/h
        bike.position.x += v * dt;
        wheels.forEach((w) => (w.rotation.y += (v * dt) / 0.33));
        julie.hipL.rotation.z = 0.9 + Math.sin(t * 9) * 0.45; julie.hipR.rotation.z = 0.9 - Math.sin(t * 9) * 0.45;
        passing.root.position.x -= 12 * dt; passing.wheels.forEach((w) => (w.rotation.z += (12 * dt) / 0.33));
        k.cam.target.x += (bike.position.x - k.cam.target.x) * 0.06;
        if (!s1 && t >= 0.3) { s1 = true; k.log("Julie cycles to work: 6 km ≈ 20 min at ≈18 km/h (assumed)"); }
        if (!s2 && t >= 1.6) { s2 = true; k.log("her car stays parked: no fuel or parking cost for this trip"); }
        if (!s3 && t >= 3.2) { s3 = true; k.log("commute emissions for this trip ≈ 0 (no engine)"); }
      };
    },
  },
};

/* ---------- the double-slit experiment (Physical World › Quantum) ------------------------------- */

export const EXPERIMENT_SCENES: Record<ExperimentScene, SceneDef> = {
  double_slit: {
    sky: LAB,
    cam: { pos: [-4.2, 4.8, 6.4], target: [0.8, 0.6, 0] },
    build(k, variant) {
      const whichPath = variant === "which_path";
      k.ground(30, k.mat("optTable", { tex: "optTable", uv: [10, 10], rough: 0.5, metal: 0.4 }), 0.6);
      const dark = k.mat("anodised", { color: "#24272d", rough: 0.4, metal: 0.7 });
      // electron source
      k.cyl("gun", { h: 1.0, d: 0.32 }, [-4.2, 0.6, 0], dark, { rot: [0, 0, Math.PI / 2] });
      const tipMat = k.mat("gunTip", { color: "#9fd8ff", emissive: "#5ab8ff", emissiveIntensity: 2 });
      k.cyl("tip", { h: 0.06, d: 0.18 }, [-3.68, 0.6, 0], tipMat, { rot: [0, 0, Math.PI / 2], cast: false });
      k.label("gunLabel", ["electron source", "one electron at a time"], [1.1, 0.32], [-4.2, 1.25, 0], { bg: "#0b1220", glow: true });
      // the barrier with two slits (gaps at z = ±0.25, each 0.08 wide)
      const plate = k.mat("barrier", { color: "#b8bec6", rough: 0.3, metal: 0.9 });
      k.box("barrierL", [0.04, 1.2, 1.31], [0, 0.6, -0.945], plate, { mass: 0 });
      k.box("barrierM", [0.04, 1.2, 0.42], [0, 0.6, 0], plate, { mass: 0 });
      k.box("barrierR", [0.04, 1.2, 1.31], [0, 0.6, 0.945], plate, { mass: 0 });
      k.label("slitLabel", ["two slits"], [0.7, 0.2], [0, 1.4, 0], { bg: "#0b1220", glow: true });
      // which-path detectors (on when the variant asks for them)
      const ledL = k.mat("ledL", { color: "#2a0a0a", emissive: "#ff3a2a", emissiveIntensity: 0 });
      const ledR = k.mat("ledR", { color: "#2a0a0a", emissive: "#ff3a2a", emissiveIntensity: 0 });
      if (whichPath) {
        k.box("detL", [0.18, 0.18, 0.18], [0.2, 1.05, -0.25], dark); k.box("detR", [0.18, 0.18, 0.18], [0.2, 1.05, 0.25], dark);
        k.sphere("ledL", 0.06, [0.2, 1.17, -0.25], ledL, { cast: false }); k.sphere("ledR", 0.06, [0.2, 1.17, 0.25], ledR, { cast: false });
        k.label("detLabel", ["which-path detector ON"], [1.1, 0.2], [0.3, 1.45, 0], { bg: "#3a1414", glow: true });
      }
      // detection screen: hits are drawn on a canvas, one dot per electron
      const W = 1024, H = 384;
      const tex = new B.DynamicTexture("hits", { width: W, height: H }, k.scene, true);
      const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
      ctx.fillStyle = "#04060a"; ctx.fillRect(0, 0, W, H); tex.update();
      const screen = B.MeshBuilder.CreatePlane("screen", { width: 3, height: 1.2, sideOrientation: B.Mesh.DOUBLESIDE }, k.scene);
      screen.position.set(4, 0.6, 0); screen.rotation.y = -Math.PI / 2;
      const sm = new B.PBRMaterial("screenMat", k.scene); sm.albedoColor = new B.Color3(0, 0, 0); sm.emissiveTexture = tex; sm.emissiveColor = new B.Color3(1, 1, 1); sm.roughness = 0.9; screen.material = sm;
      k.box("screenFrame", [0.06, 1.3, 3.1], [4.05, 0.6, 0], dark, { mass: 0 });
      const counter = k.label("count", ["hits: 0"], [1.2, 0.25], [4, 1.45, 0], { bg: "#0b1220", glow: true, rot: [0, -Math.PI / 2, 0] });
      k.glow(0.9);
      // illustrative wave rings: from the source, then from the slit(s)
      const ringMat = k.mat("ring", { color: "#7fb8e0", alpha: 0.35, unlit: true });
      const arc: B.Vector3[] = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI; arc.push(new B.Vector3(Math.cos(a), 0, Math.sin(a))); }
      const mkRing = () => { const r = B.MeshBuilder.CreateTube("ring", { path: arc, radius: 0.012, tessellation: 5 }, k.scene); r.material = ringMat; r.setEnabled(false); return r; };
      const rings = Array.from({ length: 18 }, () => ({ m: mkRing(), born: -9, x: 0, z: 0, max: 0 }));
      let ri = 0;
      const emit = (x: number, z: number, max: number, at: number) => { const r = rings[ri++ % rings.length]; r.born = at; r.x = x; r.z = z; r.max = max; r.m.setEnabled(true); };
      let hits = 0, nextWave = 0, said100 = false, said1k = false, saidStart = false;
      const dot = (u: number, vy: number) => {
        const x = ((u + 1) / 2) * W, y = vy * H;
        ctx.fillStyle = "rgba(140,255,170,0.85)"; ctx.fillRect(x, y, 2.2, 2.2);
      };
      const sample = () => { for (let tries = 0; tries < 200; tries++) { const u = k.rng() * 2 - 1; if (k.rng() < doubleSlitIntensity(u, whichPath)) return u; } return 0; };
      return () => {
        const t = k.t;
        if (!saidStart && t >= 0.2) { saidStart = true; k.log(whichPath ? "detector ON: each electron's slit is recorded" : "electrons are sent one at a time; nobody watches the slits"); }
        if (t >= nextWave) {
          nextWave = t + 0.45;
          emit(-3.65, 0, 3.6, t);
          const side = k.rng() < 0.5 ? -0.25 : 0.25;
          if (whichPath) { emit(0.02, side, 4, t + 0.5); (side < 0 ? ledL : ledR).emissiveIntensity = 4; }
          else { emit(0.02, -0.25, 4, t + 0.5); emit(0.02, 0.25, 4, t + 0.5); }
        }
        ledL.emissiveIntensity *= 0.9; ledR.emissiveIntensity *= 0.9;
        rings.forEach((r) => {
          const age = t - r.born, rad = age * 6;
          if (age < 0 || rad > r.max) { r.m.setEnabled(false); return; }
          r.m.setEnabled(true); r.m.position.set(r.x, 0.6, r.z); r.m.scaling.set(Math.max(0.01, rad), 1, Math.max(0.01, rad));
        });
        // hits accumulate faster over time (one electron at a time, many per second)
        const n = t < 1 ? 1 : Math.min(60, Math.floor(t * 8));
        if (t > 0.9) { for (let i = 0; i < n; i++) { dot(sample(), 0.08 + k.rng() * 0.84); hits++; } tex.update(); counter.draw([`hits: ${hits.toLocaleString("en")}`]); }
        if (!said100 && hits >= 100) { said100 = true; k.log("100 hits: they look random, one dot per electron"); }
        if (!said1k && hits >= 1500) { said1k = true; k.log(whichPath ? "1,500 hits: one broad band, no fringes (the path is known)" : "1,500 hits: interference fringes appear (cos² · sinc² pattern)"); }
      };
    },
  },
};
