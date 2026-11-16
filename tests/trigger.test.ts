import { test } from "node:test";
import assert from "node:assert/strict";
import { actorKindOf, extractAction } from "../src/lib/trigger";
import { CATALOG } from "../src/lib/catalog";

test("actor kind: AI, animal, nature, organisation, human", () => {
  assert.equal(actorKindOf("An AI agent gains unauthorized access to a bank's payment system."), "ai");
  assert.equal(actorKindOf("The cat pushes the tea cup off the table."), "animal");
  assert.equal(actorKindOf("A lightning strike damages the transformer."), "nature");
  assert.equal(actorKindOf("A company deploys a large AI data center."), "organization");
  assert.equal(actorKindOf("A driver decides to ignore a road-closure sign."), "human");
});

test("email: the action is the first sentence of the body", () => {
  const r = extractAction("email", "From: ops@supplier.example\nSubject: Delivery cancelled\n\nWe cannot deliver the brake controller this week. Sorry.");
  assert.equal(r.action, "We cannot deliver the brake controller this week.");
  assert.equal(extractAction("email", "Subject: Plant closed\n\n").action, "Plant closed");
});

test("article: headline skipped, first sentence of the text", () => {
  const r = extractAction("article", "Prices soar\nRegional electricity prices rose sharply on Monday. Households worry.");
  assert.equal(r.action, "Regional electricity prices rose sharply on Monday.");
  assert.equal(extractAction("chat", "  ").action, "");
});

test("every scenario names its trigger: actor and channel; actors include AI, animal, nature, human", () => {
  for (const s of CATALOG) assert.ok(s.trigger && s.trigger.source.length > 10, s.id);
  const kinds = new Set(CATALOG.map((s) => s.trigger.actor));
  for (const k of ["ai", "animal", "nature", "human", "organization"]) assert.ok(kinds.has(k as never), k);
  const channels = new Set(CATALOG.map((s) => s.trigger.channel));
  for (const c of ["email", "article", "video", "image", "sound", "sensor"]) assert.ok(channels.has(c as never), c);
});
