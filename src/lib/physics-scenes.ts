/**
 * Physical World · 3D scenes: what each scene shows and the values it ASSUMES. The scenes themselves
 * (Babylon.js rendering + Havok rigid-body physics) live in src/components/bev/physics/. These values
 * are written down here so the screen can always say what was assumed; nothing here is a measurement.
 *
 * Three kinds of scene, always labelled on screen:
 *  - simulation: Havok computes the key event (an impact, a break, a fall) from assumed properties;
 *  - staging: the action is not itself a physical event (a policy, a report, a purchase…): people and
 *    objects are shown; Havok moves only incidental things (papers, scrap, a lid). Nothing is predicted;
 *  - experiment: a textbook physics experiment whose outcome is computed from its standard formula.
 */

export type SimScene = "ball_window" | "cup" | "driver" | "lightning" | "pump" | "quake" | "storm" | "generic";
export type StagedScene =
  | "datacenter_grid" | "policy_desk" | "price_meter" | "factory_line" | "bank_report" | "seabed_cable"
  | "agent_breach" | "alarm_smoke" | "solar_storm" | "pipe_freeze" | "scrap_portal" | "bit_flip"
  | "gift" | "resignation" | "cycling";
export type ExperimentScene = "double_slit";
export type Scene3D = SimScene | StagedScene | ExperimentScene;
export type SceneKind = "simulation" | "staging" | "experiment";

const SIM: readonly SimScene[] = ["ball_window", "cup", "driver", "lightning", "pump", "quake", "storm", "generic"];
const STAGED: readonly StagedScene[] = ["datacenter_grid", "policy_desk", "price_meter", "factory_line", "bank_report", "seabed_cable", "agent_breach", "alarm_smoke", "solar_storm", "pipe_freeze", "scrap_portal", "bit_flip", "gift", "resignation", "cycling"];
export const SCENES_3D: readonly Scene3D[] = [...SIM, ...STAGED, "double_slit"];

export const SCENE_KIND = (s: Scene3D): SceneKind =>
  s === "double_slit" ? "experiment" : (STAGED as readonly string[]).includes(s) ? "staging" : "simulation";

export const SCENE_TITLE: Record<Scene3D, string> = {
  ball_window: "Ball through a window",
  cup: "Cat pushes a cup off the table",
  driver: "Car on a closed road",
  lightning: "Lightning strikes a transformer",
  pump: "Cooling pump switched off",
  quake: "Earthquake shakes masonry",
  storm: "Hurricane-force wind",
  generic: "A push toward the table edge",
  datacenter_grid: "An AI data center joins the grid",
  policy_desk: "A ministry publishes a disclosure proposal",
  price_meter: "Electricity prices rise at the meter",
  factory_line: "A production line stops: no component",
  bank_report: "An incorrect bank headline spreads",
  seabed_cable: "A submarine cable is cut",
  agent_breach: "An AI agent reaches the payment system",
  alarm_smoke: "A fire alarm and smoke on the street",
  solar_storm: "A solar storm reaches Earth",
  pipe_freeze: "Water freezes and splits a pipe",
  scrap_portal: "A scrap truck sets off the radiation portal",
  bit_flip: "A cosmic ray flips one memory bit",
  gift: "Mark gives Cathy an iPhone",
  resignation: "Lina hands in her resignation",
  cycling: "Julie cycles to work; the car stays parked",
  double_slit: "Double-slit experiment (single electrons)",
};

export const ASSUMED: Record<Scene3D, string> = {
  ball_window: "ball 0.43 kg kicked at ≈12.5 m/s · glass breaks above 3 m/s impact",
  cup: "porcelain cup 0.3 kg · paw impulse 0.4 N·s · breaks above 2.5 m/s on the floor · table 0.78 m",
  driver: "car 1,200 kg at 10 m/s · driver brakes at 4.5 m/s² from 12 m before the barrier (no incident assumed)",
  lightning: "strike at t = 1 s · sparks 20 g each · the server hall loses grid power",
  pump: "pump stops at t = 1 s · rack temperature rises (colour), no fluid or heat model",
  quake: "ground motion 0.05 m at 2 Hz (≈0.8 g peak) for 5.5 s (assumed) · dry-stacked bricks 20 kg, no mortar",
  storm: "gusting wind 40–70 N on light objects (assumed) · rain is visual only",
  generic: "box 2 kg, push 4 N·s toward the table edge",
  datacenter_grid: "staged · power flow shown as light pulses · pathway A gas plant / B solar + wind follows the pathway buttons · years compressed into seconds",
  policy_desk: "staged · a proposal, not an adopted law · the paper copies fall under Havok gravity",
  price_meter: "staged · fictional price per kWh on the meter, not market data · lights switched off = households cutting use (possible, not predicted)",
  factory_line: "staged · the line stops at t = 2 s (stated by the scenario) · boxes are Havok bodies",
  bank_report: "staged · fictional, incorrect headline · people looking at phones; no reaction is predicted",
  seabed_cable: "staged · cause ASSUMED for the 3D scene: a dragged anchor (the scenario says only “a cable fault”) · light pulses = traffic",
  agent_breach: "staged · the agent is drawn as a light; no method is shown · payments paused (stated by the scenario's consequences)",
  alarm_smoke: "staged · no audio · smoke source unknown (not a fire model)",
  solar_storm: "staged · not to scale · field lines and aurora drawn, not computed",
  pipe_freeze: "staged · water expands ≈9% when it freezes (physics) · closed, full pipe assumed · the split is shown, not computed",
  scrap_portal: "staged · truck 8 t at 3 m/s, brakes at the portal alarm · scrap pieces are Havok bodies · radiation is drawn, not computed",
  bit_flip: "staged · one particle, one memory cell · memory without error correction (assumed)",
  gift: "staged · price ≈ €900 assumed · the box lid falls under Havok gravity",
  resignation: "staged · one month's notice · the letter falls onto the desk under Havok gravity",
  cycling: "staged · 6 km at ≈18 km/h (assumed) · the car stays parked for this trip",
  double_slit: "single electrons, one at a time · slit spacing 5× slit width (assumed) · each hit sampled from the far-field formula cos²·sinc² · wave rings are illustrative",
};

export function isScene3D(x: unknown): x is Scene3D {
  return typeof x === "string" && (SCENES_3D as readonly string[]).includes(x);
}

/**
 * Double slit: relative probability of a hit at screen position u ∈ [-1, 1] (Fraunhofer far field).
 * With the which-path detector on, the interference term vanishes and only the single-slit envelope
 * remains (the two shifted envelopes overlap at this distance).
 */
export function doubleSlitIntensity(u: number, whichPath = false): number {
  const beta = Math.PI * 1.1 * u;           // single-slit term (slit width)
  const alpha = Math.PI * 5.5 * u;          // two-slit term (spacing = 5 × width)
  const sinc = beta === 0 ? 1 : Math.sin(beta) / beta;
  return whichPath ? sinc * sinc : Math.cos(alpha) ** 2 * sinc * sinc;
}

/**
 * For a typed action: the nearest AUTHORED 3D scene by explicit words, or null. Ordered: the first
 * rule that matches wins. This only picks an existing scene to show; it never builds a new one, and
 * the screen says which words matched. Catalog scenarios use their own stage.scene instead.
 */
const SCENE_WORDS: { scene: Scene3D; re: RegExp; unless?: RegExp }[] = [
  { scene: "lightning", re: /\b(lightning|thunderbolt)\b/i },
  { scene: "quake", re: /\b(earthquake|quake|tremors?|seismic)\b/i },
  { scene: "storm", re: /\b(hurricane|typhoon|cyclone|tornado|gales?|storm|windstorm)\b/i, unless: /\b(solar|geomagnetic|space weather|cosmic|brainstorm|storms? of (criticism|protest))\b/i },
  { scene: "pump", re: /\b(cooling pump|chiller|coolant pump|pump)\b/i },
  { scene: "ball_window", re: /\bball\b[^.]*\bwindow|\bwindow\b[^.]*\bball\b/i },
  { scene: "cup", re: /\b(knocks?|push(es)?|drops?|falls?|tips?)\b[^.]*\b(cup|mug|teacup|vase|glass of)\b|\b(cup|mug|teacup|vase)\b[^.]*\b(falls?|breaks?|shatters?|off the table)\b/i },
  { scene: "driver", re: /\b(drives?|driving|driver|car|truck|lorry)\b[^.]*\b(road|closure|closed|sign|barrier|detour|junction)\b|\b(road closure|road closed|closed road)\b/i, unless: /\binstead of driving\b|\bcycles?\b|\bbike\b/i },
];

export function sceneForText(text: string): { scene: Scene3D; matched: string } | null {
  for (const r of SCENE_WORDS) {
    if (r.unless?.test(text)) continue;
    const m = text.match(r.re);
    if (m) return { scene: r.scene, matched: m[0].trim().slice(0, 60) };
  }
  return null;
}
