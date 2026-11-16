import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTION, ROUTING, SCALES, WORLDS, normalizeWorld, worldById } from "../src/lib/worlds";
import { STACK, viewOfRings } from "../src/lib/butterfly";
import { MISSIONS, missionResult } from "../src/lib/scenarios";

test("exactly ten top-level worlds, top-down in the defined order", () => {
  assert.deepEqual(WORLDS.map((w) => w.id), ["earth", "government", "society", "business", "media", "network", "digital", "behaviour", "perception", "physical"]);
});

test("government above society, media above network, network above digital", () => {
  const i = (id: string) => WORLDS.findIndex((w) => w.id === id);
  assert.ok(i("government") < i("society"));
  assert.ok(i("media") < i("network"));
  assert.ok(i("network") < i("digital"));
});

test("atomic is not a top-level world; physical has four scales", () => {
  assert.ok(!WORLDS.some((w) => (w.id as string) === "atomic" || (w.id as string) === "molecular"));
  assert.deepEqual(SCALES.map((s) => s.id), ["human", "molecular", "atomic", "quantum"]);
});

test("action and routing are not counted as worlds", () => {
  assert.ok(!WORLDS.includes(ACTION) && !WORLDS.includes(ROUTING));
  assert.equal(STACK.length, 10);
});

test("legacy ids map safely", () => {
  assert.deepEqual(normalizeWorld("atomic"), { world: "physical", scale: "atomic", legacy: "atomic" });
  assert.equal(normalizeWorld("human_social").world, "behaviour");
  assert.equal(normalizeWorld("planetary").world, "earth");
  assert.equal(normalizeWorld("no-such-world").world, null);
  assert.equal(normalizeWorld(undefined).world, null);
  assert.equal(worldById("atomic").id, "physical");
  assert.equal(worldById("something-else").id, "physical"); // never crashes
});

test("historical results with an Atomic world render under Physical › Atomic and keep the original id", () => {
  const ball = MISSIONS.find((m) => m.id === "ball_window")!;
  const r = missionResult(ball);
  const v = viewOfRings(r.rings, { world: ball.origin, why: ball.why });
  const window = v.hits.find((h) => h.about === "the window")!;
  assert.equal(window.world, "physical");
  assert.equal(window.scale, "atomic");
  assert.equal(window.legacy, "atomic");
  assert.ok(v.hits.every((h) => WORLDS.some((w) => w.id === h.world)));
});
