/**
 * The Butterfly view of one recorded result: every consequence on two axes, its WORLD (which laws
 * judge it) and its RING (how far it reaches). Today's rule engine assigns rings, not worlds
 * (README: "which world each consequence sits in is a mapping for the picture"), so the world of
 * each consequence and the action's own world (its WHERE) are mapped here, for display, from the
 * concept, the ring and the words. Every mapped value says so in the UI.
 */

import { route, type RouteResult } from "./router";
import type { PhraseResult, Ring, RingRow } from "./types";
import { WORLDS, normalizeWorld, type Scale, type WorldId } from "./worlds";

/** The ten worlds bottom-up (physical … earth): the visual order, not a causal order. */
export const STACK: WorldId[] = WORLDS.map((w) => w.id).reverse();

export const RING_ORDER = ["actor", "impacted", "other_actors", "environment", "neighbour", "organization", "city", "country", "society", "earth"] as const;
export const RING_LABEL: Record<string, string> = {
  actor: "Self / actor", impacted: "Impacted", other_actors: "Other actors", environment: "Local",
  neighbour: "Neighbours", organization: "Organisation", city: "City", country: "Country", society: "Society", earth: "Earth",
  participants: "Participants", physical: "Physical surroundings", relationships: "Relationships", economy: "Economy", world: "World",
};

export type Tone = "pos" | "neg" | "risk" | "neutral";

export interface Hit {
  id: string;
  world: WorldId;
  ring: number; // index into the rings axis
  ringKey: string;
  about: string;
  text: string;
  basis?: string;
  source?: string;
  reason?: string;
  tone: Tone;
  status?: string; // goal status for other actors
  /** Physical scale, when the row is about one (e.g. legacy "atomic" rows). */
  scale?: Scale;
  /** The original world id when it was an older one (e.g. "atomic"), kept for display. */
  legacy?: string;
}

export interface Routed {
  world: WorldId;
  why: string;
  scale?: Scale;
  route?: RouteResult;
}

export interface ButterflyView {
  rings: { key: string; title: string; extent: string | null }[];
  hits: Hit[];
  origin: Routed;
  ripple: Record<WorldId, number>;
  empties: string[]; // ring titles with no rule matched
}

const has = (s: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(s));

/** The action's world, from its WHERE and concept (display mapping of README step 2). */
/** The action's world: ACMP's router (router.ts) over the sentence and the parsed verb/object. */
export function routeAction(r: Pick<PhraseResult, "text" | "summary"> & { acm_json?: PhraseResult["acm_json"] }): Routed {
  const frame = ((r.acm_json?.trace ?? {}) as { frame?: Record<string, unknown> }).frame ?? {};
  const objs = Array.isArray(frame.objects) ? (frame.objects as { text: string }[]).map((x) => x.text).join(" ") : null;
  const rr = route({ text: r.text, verb: r.summary.predicate, objects: objs, concept: r.summary.concept, place: r.summary.places?.[0] ?? null });
  return { world: rr.world, scale: rr.scale, why: `${rr.why} → ${rr.world}`, route: rr };
}

function rowWorld(ringKey: string, row: RingRow, origin: WorldId): { world: WorldId; scale?: Scale; legacy?: string } {
  if (row.world) {
    // authored rows say their world; older ids (e.g. "atomic") map to Physical › scale, original kept
    const n = normalizeWorld(row.world);
    return n.world ? { world: n.world, scale: n.scale, legacy: n.legacy } : { world: origin, legacy: row.world };
  }
  const t = `${row.about} ${row.text}`;
  if (ringKey === "other_actors" || /own goal/.test(row.text)) return { world: "behaviour" };
  if (has(t, ["hear", "see", "notic", "witness", "noise", "sound"])) return { world: "perception" };
  if (has(t, ["registry", "record", "data", "database", "account", "log"])) return { world: "digital" };
  if (has(t, ["break", "fractur", "shatter", "burn"])) return { world: "physical", scale: "human" };
  return { world: ringWorld(ringKey, t, origin) };
}

function ringWorld(ringKey: string, t: string, origin: WorldId): WorldId {
  switch (ringKey) {
    case "actor":
    case "impacted":
      return has(t, ["money", "debt", "pay", "price", "cost"]) ? "society" : origin === "earth" || origin === "digital" ? origin : origin === "society" && has(t, ["gains", "loses"]) ? "society" : origin;
    case "environment":
    case "neighbour":
    case "physical":
      return origin === "earth" ? "earth" : "physical";
    case "organization":
      return "business";
    case "city":
    case "country":
    case "society":
    case "economy":
      return has(t, ["emission", "carbon", "forest", "pollut", "climate"]) ? "earth" : "society";
    case "earth":
    case "world":
      return "earth";
    case "participants":
    case "relationships":
      return "behaviour";
    default:
      return origin;
  }
}

function toneOf(row: RingRow): { tone: Tone; status?: string } {
  const m = row.text.match(/:\s*(advanced|enabled|blocked|at risk|hindered|unaffected)\s*$/);
  if (m) {
    const s = m[1].replace(" ", "_");
    return { tone: s === "advanced" || s === "enabled" ? "pos" : s === "blocked" ? "neg" : s === "unaffected" ? "neutral" : "risk", status: s };
  }
  if (row.direction === "+" || /\bgains?\b|benefit|reused/.test(row.text)) return { tone: "pos" };
  if (row.direction === "-" || /\bloses?\b|harm|damage|destroy|stolen|no longer/.test(row.text)) return { tone: "neg" };
  return { tone: "neutral" };
}

export function rippleFrom(origin: WorldId): Record<WorldId, number> {
  const i = STACK.indexOf(origin);
  return Object.fromEntries(STACK.map((w, k) => [w, Math.abs(k - i)])) as Record<WorldId, number>;
}

export function viewOfRings(rings: Ring[], origin: Routed): ButterflyView {
  const ordered = [...rings].sort((a, b) => idx(a.key) - idx(b.key));
  const hits: Hit[] = [];
  ordered.forEach((ring, ri) =>
    ring.rows.forEach((row, k) => {
      const t = toneOf(row);
      const w = rowWorld(ring.key, row, origin.world);
      hits.push({
        id: `${ring.key}-${k}`, world: w.world, scale: w.scale, legacy: w.legacy, ring: ri, ringKey: ring.key,
        about: row.about, text: row.text, basis: row.basis, source: row.source, reason: row.reason, tone: t.tone, status: t.status,
      });
    }),
  );
  return {
    rings: ordered.map((r) => ({ key: r.key, title: RING_LABEL[r.key] ?? r.title, extent: r.extent })),
    hits,
    origin,
    ripple: rippleFrom(origin.world),
    empties: ordered.filter((r) => !r.rows.length).map((r) => RING_LABEL[r.key] ?? r.title),
  };
}

const idx = (k: string) => {
  const i = (RING_ORDER as readonly string[]).indexOf(k);
  return i < 0 ? 99 : i;
};

export function viewOf(r: PhraseResult): ButterflyView {
  return viewOfRings(r.rings, routeAction(r));
}

/** Per world, bottom-up, the consequences found there and the ripple distance from the action's world. */
export function cascadeOf(v: ButterflyView) {
  return STACK.map((id) => ({
    world: WORLDS.find((w) => w.id === id)!,
    ripple: v.ripple[id],
    hits: v.hits.filter((h) => h.world === id),
  }));
}

export interface DnaSlot { k: string; v: string | null }

/** Phrase DNA from a result's trace (parsed frame), with the summary as fallback. */
export function phraseDna(r: PhraseResult): DnaSlot[] {
  const trace = (r.acm_json?.trace ?? {}) as { frame?: Record<string, unknown> };
  const f = (trace.frame ?? {}) as Record<string, { text: string }[] | undefined> & { predicate?: { lemma: string } };
  const j = (k: string) => (Array.isArray(f[k]) && f[k]!.length ? f[k]!.map((x) => x.text).join(", ") : null);
  return [
    { k: "WHO", v: j("subject") ?? r.summary.actor },
    { k: "DOES", v: (f.predicate as { lemma: string } | undefined)?.lemma ?? r.summary.predicate },
    { k: "WHAT", v: j("objects") },
    { k: "TO WHOM", v: j("destination") ?? j("recipients") },
    { k: "WHERE", v: j("location") ?? (r.summary.places?.join(", ") || null) },
    { k: "WHEN", v: j("time") ?? r.summary.tense },
    { k: "WHY", v: j("goal") ?? j("cause") },
    { k: "HOW", v: j("manner") ?? j("instrument") },
  ];
}
