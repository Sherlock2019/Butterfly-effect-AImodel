/**
 * Which worlds a scenario impacts. By default a scenario is limited to its directly impacted
 * world(s) and the worlds of their FIRST-STEP consequences; the cascade is then run only between
 * those worlds, so nothing spreads into worlds the scenario does not reach. Scenarios marked
 * scope: "all" (the bottom-up demos) keep every world.
 */

import { propagate, type Cascade, type Connection } from "./cascade";
import { scenarioCtx, type Scenario } from "./catalog";
import { CONNECTIONS, RULES } from "./rules";
import { withAuthored } from "./enabled";
import { TOP_IDS, type TopWorldId } from "./worlds";

export function scenarioWorlds(s: Scenario, pathway?: string | null): Set<TopWorldId> {
  if (s.scope === "all") return new Set(TOP_IDS);
  const full = propagate(s.seeds, scenarioCtx(s, pathway), RULES, CONNECTIONS);
  return new Set(full.effects.filter((e) => e.depth <= 2).map((e) => e.world));
}

export const connectionsWithin = (worlds: Set<TopWorldId>): Connection[] =>
  CONNECTIONS.filter((c) => worlds.has(c.from) && worlds.has(c.to));

/**
 * The scenario's cascade, limited to the worlds it impacts. `extra` worlds (forced on by the user)
 * are added to the set, so the cascade may extend into them if a rule supports it; nothing is
 * invented when none does. `worlds` is the impacted set; `enabled` the set the cascade ran in.
 */
export function runScenario(s: Scenario, pathway?: string | null, extra: Iterable<TopWorldId> = []): { cascade: Cascade; worlds: Set<TopWorldId>; enabled: Set<TopWorldId> } {
  const worlds = scenarioWorlds(s, pathway);
  const enabled = new Set<TopWorldId>([...worlds, ...extra]);
  const ruled = propagate(s.seeds, scenarioCtx(s, pathway), RULES, connectionsWithin(enabled), {}, s.say ?? {});
  // plus the scenario's authored consequences for each world in the run (src/lib/enabled.ts)
  return { cascade: withAuthored(ruled, s, enabled), worlds, enabled };
}
