import { test } from "node:test";
import assert from "node:assert/strict";
import { propagate, type Connection, type Rule } from "../src/lib/cascade";
import { CONNECTIONS, RULES } from "../src/lib/rules";
import { CATALOG, scenarioById, scenarioCtx } from "../src/lib/catalog";
import { runScenario } from "../src/lib/scope";

const run = (id: string, pathway?: string) => {
  const s = scenarioById(id)!;
  return propagate(s.seeds, scenarioCtx(s, pathway), RULES, CONNECTIONS);
};

// tiny synthetic rule set for the engine's acceptance tests
const R = (id: string, from: Rule["from"], to: Rule["to"], whenAny: string[], tag: string, extra: Partial<Rule> = {}): Rule => ({
  id, from, to, whenAny, mechanism: id, make: () => ({ entity: `${to}-entity`, change: `${tag} happens`, tags: [tag] }), ...extra,
});

test("1. a direct consequence is evaluated against every configured outgoing connection", () => {
  const c = run("ai_agent_bank_breach");
  const seed = c.effects[0];
  const targets = new Set(c.evaluations.filter((e) => e.from === seed.id).map((e) => e.to));
  const configured = new Set(CONNECTIONS.filter((x) => x.from === seed.world).map((x) => x.to));
  assert.deepEqual([...targets].sort(), [...configured].sort());
});

test("2–4. effects land in the right world, chain further, and branch", () => {
  const c = run("ai_agent_bank_breach");
  const ops = c.effects.find((e) => e.ruleId === "dig.operations")!;
  assert.equal(ops.world, "business");
  const society = c.effects.find((e) => e.parents.includes(ops.id) && e.world === "society");
  assert.ok(society, "a downstream effect triggers another");
  const seedChildren = c.effects.filter((e) => e.parents.includes(c.effects[0].id));
  assert.ok(new Set(seedChildren.map((e) => e.world)).size >= 2, "branches into several worlds");
});

test("5. no applicable rule → no effect is fabricated", () => {
  const conns: Connection[] = [{ from: "physical", to: "earth" }];
  const rules = [R("x", "physical", "earth", ["smoke"], "emissions")];
  const c = propagate([{ world: "physical", entity: "a cup", change: "falls", tags: ["impact"] }], {}, rules, conns);
  assert.equal(c.effects.length, 1);
  assert.equal(c.evaluations[0].outcome, "no_effect");
});

test("6. missing information → unknown; missing rule → not modeled", () => {
  const conns: Connection[] = [{ from: "digital", to: "business" }, { from: "digital", to: "earth" }];
  const rules = [R("needs", "digital", "business", ["down"], "ops", { needs: ["dependents"] })];
  const c = propagate([{ world: "digital", entity: "app", change: "down", tags: ["down"] }], {}, rules, conns);
  assert.deepEqual(c.evaluations.map((e) => e.outcome).sort(), ["not_modeled", "unknown"]);
  assert.match(c.evaluations.find((e) => e.outcome === "unknown")!.note, /dependents/);
});

test("7. a Business → Media → Society → Business loop terminates", () => {
  const conns: Connection[] = [{ from: "business", to: "media" }, { from: "media", to: "society" }, { from: "society", to: "business" }];
  const rules = [
    R("b-m", "business", "media", ["disrupted"], "coverage"),
    R("m-s", "media", "society", ["coverage"], "trust_down"),
    // society → business recreates the SAME business state: must converge, not loop
    { ...R("s-b", "society", "business", ["trust_down"], "disrupted"), make: () => ({ entity: "the bank", change: "disrupted", tags: ["disrupted"] }) },
  ];
  const c = propagate([{ world: "business", entity: "the bank", change: "disrupted", tags: ["disrupted"] }], {}, rules, conns);
  assert.equal(c.truncated, null);
  assert.equal(c.effects.length, 3);
  assert.ok(c.evaluations.some((e) => e.outcome === "converged"));
});

test("8. a genuinely new state in a visited world is still processed", () => {
  const c = run("submarine_cable_outage");
  const reroute = c.effects.find((e) => e.ruleId === "dig.reroute");
  assert.ok(reroute && reroute.world === "network" && reroute.kind === "possible", "network visited again with a new state");
});

test("9. a propagation limit is enforced and reported", () => {
  const conns: Connection[] = [{ from: "business", to: "business" }];
  let k = 0;
  const rules: Rule[] = [{ id: "grow", from: "business", to: "business", whenAny: ["s"], mechanism: "grow", make: () => ({ entity: `e${++k}`, change: "new", tags: ["s"] }) }];
  const c = propagate([{ world: "business", entity: "start", change: "x", tags: ["s"] }], {}, rules, conns, { maxDepth: 4 });
  assert.ok(c.truncated);
  assert.match(c.truncated!.reason, /depth 4/);
  assert.ok(c.effects.every((e) => e.depth <= 4));
});

test("10. every effect says where it comes from; no confidence is invented", () => {
  for (const s of CATALOG) {
    const c = propagate(s.seeds, scenarioCtx(s), RULES, CONNECTIONS);
    for (const e of c.effects) {
      assert.ok(["authored", "prototype_rule"].includes(e.provenance), `${s.id}: ${e.provenance}`);
      assert.equal(e.confidence, undefined);
      if (e.kind === "possible") assert.ok(e.ruleId && e.parents.length > 0, "possible effects name their rule and parent");
    }
    assert.equal(s.provenance, "illustrative");
  }
});

test("11. parents are recorded and convergence keeps several parents", () => {
  const c = run("submarine_cable_outage");
  const biz = c.effects.find((e) => e.world === "business" && e.tags[0] === "operations_disrupted")!;
  assert.ok(biz.parents.length >= 2, "network and digital both lead to the same business state");
});

test("every scenario: starts in its world, reaches its named downstream worlds, does not truncate", () => {
  const worlds = new Set(CATALOG.map((s) => s.world));
  assert.equal(worlds.size, 10, "one scenario per top-level world");
  for (const s of CATALOG) {
    const { cascade: c } = runScenario(s, s.pathways?.[0]?.id);
    assert.equal(c.effects[0].world, s.world, s.id);
    assert.equal(c.truncated, null, s.id);
    const reached = new Set(c.effects.map((e) => e.world));
    if (s.pathways) s.pathways.forEach((p) => runScenario(s, p.id).cascade.effects.forEach((e) => reached.add(e.world)));
    for (const d of s.downstream) assert.ok(reached.has(d), `${s.id} should reach ${d}`);
  }
});

test("scenarios are limited to the worlds they impact (direct + first step)", () => {
  for (const s of CATALOG) {
    const { cascade: c, worlds } = runScenario(s, s.pathways?.[0]?.id);
    // nothing is produced or even evaluated outside the scenario's worlds
    assert.ok(c.effects.every((e) => worlds.has(e.world)), s.id);
    assert.ok(c.evaluations.every((e) => worlds.has(e.to)), s.id);
    if (s.scope !== "all") assert.deepEqual([...worlds].sort(), [...new Set([s.world, ...s.seeds.map((x) => x.world), ...s.downstream])].sort(), s.id);
  }
  // the alarm stays in Perception → Behaviour (no physical or society spill-over)
  assert.deepEqual([...runScenario(scenarioById("alarm_and_smoke")!).worlds].sort(), ["behaviour", "perception"]);
  // the bottom-up demos keep all ten worlds
  assert.equal(runScenario(scenarioById("lightning_datacenter")!).worlds.size, 10);
  assert.equal(runScenario(scenarioById("cooling_pump_off")!).worlds.size, 10);
});

test("the bank breach starts in Digital, the cable in Network, the news in Media, the data center in Earth", () => {
  assert.equal(scenarioById("ai_agent_bank_breach")!.world, "digital");
  assert.equal(scenarioById("submarine_cable_outage")!.world, "network");
  assert.equal(scenarioById("incorrect_bank_report")!.world, "media");
  assert.equal(scenarioById("ai_datacenter_energy")!.world, "earth");
});

test("energy pathways are conditional: A, B, and not specified differ", () => {
  const a = run("ai_datacenter_energy", "fossil");
  const b = run("ai_datacenter_energy", "low_carbon");
  const none = run("ai_datacenter_energy", "none");
  assert.ok(a.effects.some((e) => e.tags[0] === "fossil_generation_up") && !a.effects.some((e) => e.tags[0] === "low_carbon_investment"));
  assert.ok(b.effects.some((e) => e.tags[0] === "low_carbon_investment") && !b.effects.some((e) => e.tags[0] === "fossil_generation_up"));
  assert.ok(!none.effects.some((e) => ["fossil_generation_up", "low_carbon_investment"].includes(e.tags[0])));
  assert.ok(none.evaluations.some((e) => e.ruleId === "earth.fossil" && e.outcome === "unknown"));
  // never a nuclear plant "built": only possible investment with multi-year timelines
  assert.ok(b.effects.every((e) => !/\bbuilt\b|will build/i.test(e.change)));
});

test("lightning and cooling pump reach all ten worlds without forcing a linear order", () => {
  assert.equal(new Set(run("lightning_datacenter").effects.map((e) => e.world)).size, 10, "lightning reaches all ten");
  // cooling pump: nine worlds; Earth is not reached because the shutdown prevents hardware damage
  const pumpWorlds = new Set(runScenario(scenarioById("cooling_pump_off")!).cascade.effects.map((e) => e.world));
  assert.equal(pumpWorlds.size, 9);
  assert.ok(!pumpWorlds.has("earth"));
  const c = run("lightning_datacenter");
  const biz = c.effects.find((e) => e.world === "business" && e.tags[0] === "operations_disrupted")!;
  const parentWorlds = biz.parents.map((p) => c.effects.find((e) => e.id === p)!.world);
  assert.ok(!parentWorlds.includes("media"), "business is affected via digital, not via a media report");
  const earth = c.effects.filter((e) => e.world === "earth");
  assert.ok(earth.some((e) => c.effects.find((p) => p.id === e.parents[0])!.world === "physical"), "physical → earth directly");
});

test("each scenario shows its own consequences: no consequence text is shared between scenarios", () => {
  const seen = new Map<string, string>();
  for (const s of CATALOG) {
    const runs = s.pathways ? s.pathways.map((p) => runScenario(s, p.id)) : [runScenario(s)];
    const mine = new Set<string>();
    runs.forEach((r) => r.cascade.effects.filter((e) => e.kind === "possible").forEach((e) => mine.add(`${e.world}|${e.entity}|${e.change}`)));
    for (const k of mine) {
      assert.ok(!seen.has(k), `"${k}" appears in both ${seen.get(k)} and ${s.id}`);
      seen.set(k, s.id);
    }
  }
});

test("every consequence reads as a sentence: no empty or repeated entity in the change", () => {
  for (const s of CATALOG) {
    for (const e of runScenario(s, s.pathways?.[0]?.id).cascade.effects) {
      assert.ok(e.entity.trim() && e.change.trim(), `${s.id}: empty text`);
      assert.ok(!e.change.toLowerCase().includes(e.entity.toLowerCase()), `${s.id}: "${e.entity}" repeated in "${e.change}"`);
    }
  }
});

test("scenarios are sorted top-down: Earth first, Physical last (human → quantum)", () => {
  const idx = CATALOG.map((s) => ["earth", "government", "society", "business", "media", "network", "digital", "behaviour", "perception", "physical"].indexOf(s.world));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  const phys = CATALOG.filter((s) => s.world === "physical").map((s) => ["human", "molecular", "atomic", "quantum"].indexOf(s.scale ?? "human"));
  assert.deepEqual(phys, [...phys].sort((a, b) => a - b));
  assert.equal(CATALOG[0].world, "earth");
  assert.equal(CATALOG[CATALOG.length - 1].scale, "quantum");
});

test("enabled worlds show the scenario's own consequences (Lina: LinkedIn, salary, holiday)", () => {
  const lina = scenarioById("lina_resigns")!;
  const base = runScenario(lina);
  assert.ok(!base.cascade.effects.some((e) => e.world === "media"), "Media is not in the run until enabled");
  const r = runScenario(lina, null, ["media", "society"]);
  const media = r.cascade.effects.find((e) => e.world === "media")!;
  assert.match(media.change, /open to work/i);
  const salary = r.cascade.effects.find((e) => e.world === "society")!;
  assert.match(salary.change, /salary/i);
  const holiday = r.cascade.effects.find((e) => /holiday/i.test(e.change))!;
  assert.equal(holiday.world, "behaviour");
  assert.deepEqual(holiday.parents, [salary.id], "the holiday follows the salary stopping");
  for (const e of r.cascade.effects.filter((x) => x.provenance === "authored" && x.kind === "possible")) {
    assert.ok(e.ruleId?.startsWith("authored.") && e.parents.length === 1 && /\bmay\b|might|could|would|\bif\b|are |is |stands|sees|schedules|shows|logs|fall/.test(e.change), e.change);
    assert.equal(e.confidence, undefined);
  }
});

test("authored consequences never appear in a world outside the run", () => {
  for (const s of CATALOG) {
    const { cascade, enabled } = runScenario(s, s.pathways?.[0]?.id);
    assert.ok(cascade.effects.every((e) => enabled.has(e.world)), s.id);
  }
});

test("enabling a world lets the cascade extend into it only when a rule supports it", () => {
  const bank = scenarioById("ai_agent_bank_breach")!;
  const base = runScenario(bank);
  assert.ok(!base.worlds.has("behaviour"));
  // behaviour: media → behaviour has a rule (customers may become concerned)
  const withBeh = runScenario(bank, null, ["behaviour"]);
  assert.ok(withBeh.cascade.effects.some((e) => e.world === "behaviour"), "a consequence appears in the enabled world");
  assert.ok(!withBeh.worlds.has("behaviour"), "still reported as enabled, not impacted");
  // earth: no rule reaches it from this scenario: nothing is invented
  const withEarth = runScenario(bank, null, ["earth"]);
  assert.ok(!withEarth.cascade.effects.some((e) => e.world === "earth"));
});

test("coherence: the cooling-pump shutdown prevents hardware damage; a solar storm trips, it does not destroy", () => {
  const pump = runScenario(scenarioById("cooling_pump_off")!).cascade;
  assert.ok(!pump.effects.some((e) => ["equipment_damage", "repair_job", "resource_use"].includes(e.tags[0])), "no damage / repair / e-waste after a preventive shutdown");
  assert.ok(pump.evaluations.some((e) => e.ruleId === "phys.overheat" && e.outcome === "no_effect"));
  const solar = runScenario(scenarioById("solar_storm")!).cascade;
  assert.ok(!solar.effects.some((e) => e.tags[0] === "resource_use"), "no replacement assumed for a tripped transformer");
});

test("the bank market reaction is unknown, not assumed", () => {
  const c = run("ai_agent_bank_breach");
  assert.ok(!c.effects.some((e) => e.tags[0] === "market_reaction"));
  assert.ok(c.evaluations.some((e) => e.ruleId === "bus.market" && e.outcome === "unknown"));
});
