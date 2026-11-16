import { test } from "node:test";
import assert from "node:assert/strict";
import { CARDS, FICTIONAL, NO_PROBABILITY, fictionalSeries } from "../src/lib/boards";
import { CATALOG } from "../src/lib/catalog";
import { runScenario } from "../src/lib/scope";

test("event cards carry no probabilities or odds", () => {
  for (const c of CARDS) {
    for (const o of [c.question, ...c.outcomes]) assert.doesNotMatch(o, /\d+\s?%|\bodds\b|\bchance of \d/i, `${c.id}: ${o}`);
    assert.ok(c.outcomes.length >= 2);
  }
  assert.match(NO_PROBABILITY, /no probability/i);
});

test("both event boards exist and reference real catalog scenarios", () => {
  assert.ok(CARDS.some((c) => c.world === "government") && CARDS.some((c) => c.world === "society"));
  const ids = new Set(CATALOG.map((s) => s.id));
  for (const c of CARDS) for (const s of c.scenarios) assert.ok(ids.has(s), `${c.id} → ${s}`);
});

test("every scenario that reaches Business has its own business event question", () => {
  for (const s of CATALOG) {
    if (!runScenario(s, s.pathways?.[0]?.id).worlds.has("business")) continue;
    assert.ok(CARDS.some((c) => c.world === "business" && c.scenarios.includes(s.id)), `${s.id} has no business card`);
  }
});

test("market widgets are fictional and labelled", () => {
  assert.match(FICTIONAL, /fictional/i);
  const s = fictionalSeries();
  assert.ok(s.length >= 6 && s.every((x) => x.points.length === 24));
  assert.deepEqual(fictionalSeries()[0].points, s[0].points, "deterministic, not live");
});
