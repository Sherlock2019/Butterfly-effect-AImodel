import { test } from "node:test";
import assert from "node:assert/strict";
import { dnaFromFrame } from "../src/lib/nplm";
import { route } from "../src/lib/router";

test("NPLM frame → Phrase DNA slots, tolerant of shapes", () => {
  const p = dnaFromFrame({
    subject: [{ text: "An AI agent" }], predicate: { lemma: "gain" }, objects: [{ text: "unauthorized access" }],
    location: [{ text: "Paris" }], goal: [], manner: null,
  }, "en");
  const v = Object.fromEntries(p.dna.map((d) => [d.k, d.v]));
  assert.equal(v.WHO, "An AI agent");
  assert.equal(v.DOES, "gain");
  assert.equal(v.WHAT, "unauthorized access");
  assert.equal(v.WHERE, "Paris");
  assert.equal(v.WHY, null);
  assert.equal(p.verb, "gain");
  assert.equal(dnaFromFrame(null).dna.every((d) => d.v === null), true);
});

test("the router uses NPLM's verb and object", () => {
  // "posted" alone is ambiguous; NPLM's object "a video" makes it a media act
  const r = route({ text: "She posted it.", verb: "post", objects: "a video on YouTube" });
  assert.equal(r.world, "media");
});
