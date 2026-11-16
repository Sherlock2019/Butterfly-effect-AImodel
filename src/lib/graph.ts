/**
 * One list of consequence nodes for the console, from two sources that stay labelled:
 *  - the prototype cascade (cascade.ts): authored seeds + rule-derived possible effects (ILLUSTRATIVE)
 *  - a recorded example bundled in ACMP (RECORDED): consequences by ring, each placed in a world by
 *    the display mapping (butterfly.ts), reported directly from the action (not chained).
 */

import type { ButterflyView } from "./butterfly";
import type { Cascade, Evaluation, Provenance } from "./cascade";
import type { Scale, TopWorldId } from "./worlds";

export type NodeKind = "direct" | "possible" | "engine";

export interface GNode {
  id: string;
  world: TopWorldId;
  scale?: Scale;
  entity: string;
  change: string;
  kind: NodeKind;
  provenance: Provenance;
  parents: string[];
  depth: number;
  ruleId?: string;
  mechanism?: string;
  assumptions: string[];
  unknowns: string[];
  ring?: string;
  basis?: string;
  source?: string;
  legacy?: string;
  tags?: string[];
}

export const ACTION_ID = "action";

const stripStatus = (t: string) => t.replace(/:\s*(advanced|enabled|blocked|at risk|hindered|unaffected)\s*$/, (m) => ` (${m.slice(1).trim()})`);

export function nodesOf(cascade: Cascade | null, engine: ButterflyView | null): GNode[] {
  const out: GNode[] = [];
  cascade?.effects.forEach((e) =>
    out.push({
      id: e.id, world: e.world, scale: e.scale, entity: e.entity, change: e.change, kind: e.kind, provenance: e.provenance,
      parents: e.parents.length ? e.parents : [ACTION_ID], depth: e.depth, ruleId: e.ruleId, mechanism: e.mechanism,
      assumptions: e.assumptions, unknowns: e.unknowns, tags: e.tags,
    }),
  );
  engine?.hits.forEach((h) =>
    out.push({
      id: `acm-${h.id}`, world: (h.world === "action" || h.world === "routing" ? "physical" : h.world) as TopWorldId, scale: h.scale,
      entity: h.about, change: stripStatus(h.text), kind: "engine",
      provenance: h.basis === "authored_demo" ? "authored" : "engine",
      parents: [ACTION_ID], depth: 1, ring: engine.rings[h.ring]?.title, basis: h.basis, source: h.source, legacy: h.legacy,
      assumptions: [], unknowns: [], mechanism: h.reason,
    }),
  );
  return out;
}

export const evaluationsFrom = (c: Cascade | null, id: string): Evaluation[] => (c ? c.evaluations.filter((e) => e.from === id) : []);

export const PROV_LABEL: Record<Provenance, string> = {
  engine: "Recorded example",
  prototype_rule: "Illustrative · prototype rule",
  authored: "Illustrative · authored",
  external: "External source",
  unavailable: "Unavailable",
};

export const KIND_LABEL: Record<NodeKind, string> = {
  direct: "Direct impact",
  possible: "Possible consequence",
  engine: "Recorded (by ring)",
};

export const OUTCOME_LABEL: Record<Evaluation["outcome"], string> = {
  effect: "Effect",
  no_effect: "No effect",
  unknown: "Unknown",
  not_modeled: "Not modeled",
  converged: "Same state (linked)",
  limit: "Limit reached",
};
