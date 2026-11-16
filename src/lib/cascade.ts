/**
 * Cross-world consequence propagation: ACMP's own small, explicit PROTOTYPE engine.
 *
 *
 *   action → seed effect(s) in world A → evaluate every configured connection A → B
 *          → EFFECT (a rule applies) | NO EFFECT | UNKNOWN (missing context) | NOT MODELED (no rule)
 *          → each new effect is queued and evaluated in turn, until nothing new or a limit.
 *
 * A connection means "evaluate whether the effect can affect that world", never "always produce
 * an effect there". Rules are data (rules.ts): which state tags they need, which context facts
 * they need, and what possible state change they produce. Every produced effect records its
 * parents, its rule and its assumptions. No probability or confidence is ever produced here.
 *
 * Loops: an effect is identified by (world, entity, state). A rule that would recreate an existing
 * state adds a parent link to it (convergence) instead of a new node, so loops terminate; a NEW
 * state in an already-visited world is still processed. Limits (depth, effects, evaluations) stop
 * the run and mark it truncated.
 */

import type { Scale, TopWorldId } from "./worlds";

export type Outcome = "effect" | "no_effect" | "unknown" | "not_modeled" | "converged" | "limit";
/** engine = recorded example bundled in ACMP · prototype_rule = this module's rules · authored = written by hand for a scenario */
export type Provenance = "engine" | "prototype_rule" | "authored" | "external" | "unavailable";
export type Ctx = Record<string, string | boolean | undefined>;

export interface Seed {
  world: TopWorldId;
  scale?: Scale;
  entity: string;
  change: string;
  tags: string[];
  assumptions?: string[];
  provenance?: Provenance;
}

export interface CEffect {
  id: string;
  world: TopWorldId;
  scale?: Scale;
  entity: string;
  change: string;
  /** State tags: the first one is the effect's state (used for de-duplication). */
  tags: string[];
  parents: string[];
  ruleId?: string;
  mechanism?: string;
  assumptions: string[];
  unknowns: string[];
  /** direct: specified by the scenario / action · possible: derived by a rule */
  kind: "direct" | "possible";
  provenance: Provenance;
  depth: number;
  /** Only ever set from a real model or source; this engine never sets it. */
  confidence?: { value: number; source: string; meaning: string };
}

export interface Evaluation {
  from: string;
  fromWorld: TopWorldId;
  to: TopWorldId;
  ruleId?: string;
  outcome: Outcome;
  note: string;
  effect?: string;
}

export interface RuleOutput { entity: string; change: string; tags: string[]; assumptions?: string[]; unknowns?: string[]; scale?: Scale }

export interface Rule {
  id: string;
  from: TopWorldId;
  to: TopWorldId;
  /** One-line mechanism shown to the user ("why might it change?"). */
  mechanism: string;
  /** The effect must carry at least one of these tags for the rule to apply. */
  whenAny: string[];
  /** Context facts the rule needs; a missing one makes the evaluation UNKNOWN. */
  needs?: string[];
  /** Context conditions: key must equal value (otherwise NO EFFECT: the condition does not hold). */
  only?: Record<string, string | boolean>;
  make: (e: CEffect, ctx: Ctx) => RuleOutput;
}

export interface Connection { from: TopWorldId; to: TopWorldId }

/** Scenario-specific wording, by rule id: the rule still decides WHETHER; this says it for the scenario. */
export type Wording = Record<string, { entity?: string; change?: string }>;

export interface Limits { maxDepth: number; maxEffects: number; maxEvaluations: number }
export const DEFAULT_LIMITS: Limits = { maxDepth: 8, maxEffects: 40, maxEvaluations: 600 };

export interface Cascade {
  effects: CEffect[];
  evaluations: Evaluation[];
  truncated: null | { reason: string };
  limits: Limits;
}

const keyOf = (world: string, entity: string, state: string) => `${world}|${entity.trim().toLowerCase()}|${state}`;

export function propagate(seeds: Seed[], ctx: Ctx, rules: Rule[], connections: Connection[], limits: Partial<Limits> = {}, wording: Wording = {}): Cascade {
  const L: Limits = { ...DEFAULT_LIMITS, ...limits };
  const effects: CEffect[] = [];
  const evaluations: Evaluation[] = [];
  const byKey = new Map<string, CEffect>();
  const queue: CEffect[] = [];
  let truncated: Cascade["truncated"] = null;
  let n = 0;

  for (const s of seeds) {
    const e: CEffect = {
      id: `e${++n}`, world: s.world, scale: s.scale, entity: s.entity, change: s.change, tags: s.tags, parents: [],
      assumptions: s.assumptions ?? [], unknowns: [], kind: "direct", provenance: s.provenance ?? "authored", depth: 1,
    };
    const k = keyOf(e.world, e.entity, e.tags[0] ?? "");
    if (byKey.has(k)) continue;
    byKey.set(k, e);
    effects.push(e);
    queue.push(e);
  }

  const record = (ev: Evaluation) => {
    if (evaluations.length >= L.maxEvaluations) {
      truncated ??= { reason: `stopped after ${L.maxEvaluations} evaluated connections (limit)` };
      return false;
    }
    evaluations.push(ev);
    return true;
  };

  while (queue.length && !truncated) {
    const e = queue.shift()!;
    for (const c of connections.filter((x) => x.from === e.world)) {
      if (truncated) break;
      const pair = rules.filter((r) => r.from === c.from && r.to === c.to);
      if (!pair.length) {
        record({ from: e.id, fromWorld: e.world, to: c.to, outcome: "not_modeled", note: `no rule connects ${c.from} → ${c.to} yet` });
        continue;
      }
      const applicable = pair.filter((r) => r.whenAny.some((t) => e.tags.includes(t)));
      if (!applicable.length) {
        record({ from: e.id, fromWorld: e.world, to: c.to, outcome: "no_effect", note: `checked ${pair.map((r) => r.id).join(", ")}: none applies to this state (${e.tags.join(", ")})` });
        continue;
      }
      for (const r of applicable) {
        const blocked = Object.entries(r.only ?? {}).find(([k, v]) => ctx[k] !== undefined && ctx[k] !== v);
        if (blocked) {
          record({ from: e.id, fromWorld: e.world, to: c.to, ruleId: r.id, outcome: "no_effect", note: `condition not met: ${blocked[0]} is "${String(ctx[blocked[0]])}", rule needs "${String(blocked[1])}"` });
          continue;
        }
        const missing = [...(r.needs ?? []), ...Object.keys(r.only ?? {})].filter((k) => ctx[k] === undefined || ctx[k] === "");
        if (missing.length) {
          record({ from: e.id, fromWorld: e.world, to: c.to, ruleId: r.id, outcome: "unknown", note: `not enough information: needs ${missing.join(", ")}` });
          continue;
        }
        const made = r.make(e, ctx);
        const out = { ...made, entity: wording[r.id]?.entity ?? made.entity, change: wording[r.id]?.change ?? made.change };
        const k = keyOf(r.to, out.entity, out.tags[0] ?? "");
        const existing = byKey.get(k);
        if (existing) {
          if (existing.id !== e.id && !existing.parents.includes(e.id) && existing.kind === "possible") existing.parents.push(e.id);
          record({ from: e.id, fromWorld: e.world, to: c.to, ruleId: r.id, outcome: "converged", note: `same state already derived (${existing.id}); linked as an extra cause, not repeated`, effect: existing.id });
          continue;
        }
        if (e.depth + 1 > L.maxDepth || effects.length >= L.maxEffects) {
          truncated = { reason: e.depth + 1 > L.maxDepth ? `stopped at depth ${L.maxDepth} (limit): further effects were not evaluated` : `stopped at ${L.maxEffects} effects (limit)` };
          record({ from: e.id, fromWorld: e.world, to: c.to, ruleId: r.id, outcome: "limit", note: truncated.reason });
          break;
        }
        const ne: CEffect = {
          id: `e${++n}`, world: r.to, scale: out.scale, entity: out.entity, change: out.change, tags: out.tags, parents: [e.id],
          ruleId: r.id, mechanism: r.mechanism, assumptions: out.assumptions ?? [], unknowns: out.unknowns ?? [],
          kind: "possible", provenance: "prototype_rule", depth: e.depth + 1,
        };
        byKey.set(k, ne);
        effects.push(ne);
        queue.push(ne);
        record({ from: e.id, fromWorld: e.world, to: c.to, ruleId: r.id, outcome: "effect", note: r.mechanism, effect: ne.id });
      }
    }
  }
  return { effects, evaluations, truncated, limits: L };
}

/** Per world: the strongest status the cascade gives it (for the navigator). */
export type WorldMark = "direct" | "possible" | "unknown" | "no_effect" | "not_modeled" | "none";
export function worldMarks(c: Cascade | null): Record<string, WorldMark> {
  const m: Record<string, WorldMark> = {};
  if (!c) return m;
  const rank: WorldMark[] = ["none", "not_modeled", "no_effect", "unknown", "possible", "direct"];
  const up = (w: string, v: WorldMark) => { if (rank.indexOf(v) > rank.indexOf(m[w] ?? "none")) m[w] = v; };
  c.effects.forEach((e) => up(e.world, e.kind));
  c.evaluations.forEach((ev) => up(ev.to, ev.outcome === "unknown" ? "unknown" : ev.outcome === "no_effect" ? "no_effect" : ev.outcome === "not_modeled" ? "not_modeled" : "none"));
  return m;
}
