import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../src/lib/catalog";
import { ASSUMED, SCENES_3D, SCENE_TITLE, doubleSlitIntensity, isScene3D, sceneForText } from "../src/lib/physics-scenes";

test("typed actions pick the nearest authored 3D scene, or none", () => {
  const cases: [string, string | null][] = [
    ["Lightning hits the substation next to the hospital.", "lightning"],
    ["A strong earthquake shakes the old town.", "quake"],
    ["A hurricane makes landfall near the port.", "storm"],
    ["A solar storm disturbs the power grid.", null],
    ["The team holds a brainstorm about pricing.", null],
    ["The operator switches off the cooling pump.", "pump"],
    ["A boy kicks the ball and it smashes the window.", "ball_window"],
    ["The dog knocks the mug off the desk.", "cup"],
    ["A truck driver ignores the road closure sign.", "driver"],
    ["Julie cycles to work instead of driving.", null],
    ["Mark buys an iPhone for his wife Cathy.", null],
    ["The government publishes new disclosure rules for data centers.", null],
  ];
  for (const [text, want] of cases) assert.equal(sceneForText(text)?.scene ?? null, want, text);
});

test("every catalog scenario has its own 3D scene, none shared", () => {
  const scenes = CATALOG.map((s) => s.stage?.scene);
  CATALOG.forEach((s, i) => assert.ok(isScene3D(scenes[i]), `${s.id} has a 3D scene`));
  assert.equal(new Set(scenes).size, CATALOG.length, "no two scenarios share a scene");
});

test("double slit: fringes without a detector, one smooth band with it", () => {
  // centre bright; first dark fringe near u = 1/11 (cos² term) without detector
  assert.ok(doubleSlitIntensity(0) > 0.99);
  assert.ok(doubleSlitIntensity(1 / 11) < 0.01, "dark fringe");
  assert.ok(doubleSlitIntensity(1 / 11, true) > 0.9, "no dark fringe when the path is known");
  // with the detector the pattern decreases monotonically from the centre to the first envelope zero
  let prev = 2;
  for (let u = 0; u <= 0.9; u += 0.05) { const v = doubleSlitIntensity(u, true); assert.ok(v <= prev + 1e-9); prev = v; }
});

test("every 3D scene states what it assumes and has a title", () => {
  for (const s of SCENES_3D) {
    assert.ok(ASSUMED[s] && ASSUMED[s].length > 20, `${s}: assumptions written down`);
    assert.ok(SCENE_TITLE[s], `${s}: title`);
  }
});

test("every scenario with a stage scene points at a real 3D scene", () => {
  for (const s of CATALOG) {
    const scene = s.stage?.scene;
    if (scene) assert.ok(isScene3D(scene), `${s.id}: stage.scene "${scene}" has a 3D scene`);
  }
});

test("assumed values are labelled as assumptions, never as measurements or predictions", () => {
  // "not predicted" is the honest negation and is allowed; a positive claim is not
  for (const s of SCENES_3D) assert.doesNotMatch(ASSUMED[s].replace(/\b(not|(nothing|no \w+) is) predicted\b/gi, ""), /\b(measured|predicted|probability)\b/i, s);
});
