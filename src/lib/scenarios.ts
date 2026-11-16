/**
 * Missions: five predefined scenarios, AUTHORED as a mockup to show how the Butterfly Model will
 * feel: dive from orbit to the place where the action happens, look inside, watch the action,
 * then see its consequences cascade through the worlds and out across the map.
 *
 * Every consequence below is hand-written (basis "authored_demo"), not computed by the engine.
 * Locations are illustrative public areas, never a real person's home. Each mission's sentence
 * can also be sent to the live model for comparison.
 */

import type { Place } from "./geo";
import type { PhraseResult, Ring } from "./types";
import type { WorldId } from "./worlds";

export type RingKey = "actor" | "impacted" | "other_actors" | "environment" | "neighbour" | "organization" | "city" | "country" | "society" | "earth";

export interface MissionActor { name: string; kind: "human" | "animal" | "object" | "system"; role: string; conf: number }
/** `world` may be a pre-v0.3 id ("atomic"): it is kept as written and shown as Physical › Atomic (normalizeWorld). */
export interface MissionConsequence { world: WorldId | "atomic"; ring: RingKey; about: string; text: string; tone?: "pos" | "neg" | "risk" | "neutral"; status?: "advanced" | "blocked" | "at_risk" | "enabled" | "hindered"; reason?: string }

export interface Mission {
  id: string;
  icon: string;
  title: string;
  setting: "living_room" | "garden" | "street" | "office" | "forest";
  inside: string; // what the CAM shows
  place: Place & { label: string };
  city: string;
  country: string;
  neighbours: string[]; // names in geo.POINTS
  sentence: string;
  context: string[];
  dna: { WHO: string; DOES: string; WHAT: string; "TO WHOM"?: string; WHERE: string; WHEN: string; WHY?: string; HOW?: string };
  concept: string;
  origin: WorldId;
  why: string;
  actors: MissionActor[];
  consequences: MissionConsequence[];
}

export const MISSIONS: Mission[] = [
  {
    id: "cat_cup", icon: "🐈", title: "A cat pushes a tea cup off the table", setting: "living_room",
    inside: "Living room · 4th floor apartment · 07:42",
    place: { name: "Montmartre", label: "An apartment in Montmartre, Paris (illustrative)", kind: "city", lat: 48.8862, lon: 2.3392 },
    city: "Paris", country: "France", neighbours: ["Saint-Denis", "Montreuil", "Boulogne-Billancourt"],
    sentence: "The cat pushed the tea cup off the table in the living room.", context: ["Léa wants a quiet breakfast."],
    dna: { WHO: "the cat (animal)", DOES: "push", WHAT: "the tea cup (porcelain, full)", WHERE: "living room table", WHEN: "07:42, morning", WHY: "curiosity (assumed: animals state no goal)", HOW: "with its paw, toward the edge" },
    concept: "PUSH", origin: "physical", why: "a push on a table: the physical world (force, gravity, friction)",
    actors: [
      { name: "CAT", kind: "animal", role: "origin actor", conf: 0.97 },
      { name: "TEA CUP", kind: "object", role: "porcelain · 0.3 kg · full", conf: 0.93 },
      { name: "LÉA", kind: "human", role: "owner · in the kitchen", conf: 0.91 },
    ],
    consequences: [
      { world: "physical", ring: "actor", about: "the cat", text: "jumps back as the cup tips over the edge" },
      { world: "physical", ring: "impacted", about: "the tea cup", text: "loses the table's support and falls 0.75 m", tone: "neg" },
      { world: "atomic", ring: "impacted", about: "the tea cup", text: "porcelain hits tile above its break speed: it shatters", tone: "neg" },
      { world: "physical", ring: "environment", about: "the floor", text: "hot tea spills across the tiles and the rug", tone: "neg" },
      { world: "perception", ring: "environment", about: "Léa", text: "hears the crash from the kitchen" },
      { world: "behaviour", ring: "other_actors", about: "Léa", text: "a quiet breakfast", tone: "neg", status: "blocked", reason: "the crash and the spilled tea" },
      { world: "behaviour", ring: "actor", about: "the cat", text: "is startled; may hide under the sofa (possible)", tone: "risk" },
      { world: "digital", ring: "neighbour", about: "Léa's phone", text: "orders a replacement cup online", tone: "neutral" },
      { world: "business", ring: "organization", about: "a homeware shop", text: "sells one more cup", tone: "pos" },
      { world: "earth", ring: "earth", about: "resources", text: "a new cup is fired in a kiln: clay, energy, CO₂", tone: "neg" },
    ],
  },
  {
    id: "ball_window", icon: "⚽", title: "A child kicks a ball through the neighbour's window", setting: "garden",
    inside: "Back garden · semi-detached houses · 16:15",
    place: { name: "Villeurbanne", label: "A house with a garden, Villeurbanne, Lyon (illustrative)", kind: "city", lat: 45.7705, lon: 4.8795 },
    city: "Lyon", country: "France", neighbours: ["Villeurbanne", "Vénissieux"],
    sentence: "Leo kicked the ball through the neighbour's window.", context: ["Mrs Martin wants to rest.", "Leo wants to keep playing."],
    dna: { WHO: "Leo (child, 9)", DOES: "kick", WHAT: "the ball", "TO WHOM": "Mrs Martin's window", WHERE: "back garden", WHEN: "16:15, after school", WHY: "to score (playing)", HOW: "hard, toward the fence" },
    concept: "KICK", origin: "physical", why: "a kick in a garden: the physical world",
    actors: [
      { name: "LEO", kind: "human", role: "origin actor · child", conf: 0.96 },
      { name: "BALL", kind: "object", role: "leather · 0.43 kg", conf: 0.94 },
      { name: "WINDOW", kind: "object", role: "single glazing · fragile", conf: 0.88 },
      { name: "MRS MARTIN", kind: "human", role: "neighbour · indoors", conf: 0.84 },
    ],
    consequences: [
      { world: "physical", ring: "impacted", about: "the ball", text: "flies over the fence at about 15 m/s" },
      { world: "atomic", ring: "impacted", about: "the window", text: "single glazing fractures on impact", tone: "neg" },
      { world: "perception", ring: "environment", about: "Mrs Martin", text: "hears glass breaking; sees the ball land inside" },
      { world: "behaviour", ring: "other_actors", about: "Mrs Martin", text: "to rest", tone: "neg", status: "blocked", reason: "glass breaks in her living room" },
      { world: "behaviour", ring: "other_actors", about: "Leo", text: "to keep playing", tone: "risk", status: "at_risk", reason: "the ball is next door" },
      { world: "behaviour", ring: "actor", about: "Leo's parents", text: "apologise; relations with the neighbour may cool (possible)", tone: "risk" },
      { world: "digital", ring: "organization", about: "home insurer", text: "a claim is filed in the insurer's app", tone: "neutral" },
      { world: "business", ring: "organization", about: "a glazier", text: "is hired to replace the pane", tone: "pos" },
      { world: "society", ring: "neighbour", about: "the street", text: "neighbours talk about ball games in gardens (possible)", tone: "neutral" },
      { world: "earth", ring: "earth", about: "resources", text: "new glass is made: sand, soda ash, furnace energy", tone: "neg" },
    ],
  },
  {
    id: "car_sale", icon: "🚗", title: "I will sell my car to Sarah in Paris to pay my debt", setting: "street",
    inside: "Street parking · Rue de Rivoli · tomorrow 10:00",
    place: { name: "Paris", label: "A street in central Paris (illustrative)", kind: "city", lat: 48.8572, lon: 2.3544 },
    city: "Paris", country: "France", neighbours: ["Boulogne-Billancourt", "Saint-Denis", "Montreuil"],
    sentence: "I will sell my car to Sarah in Paris tomorrow to pay my debt.", context: ["Mark wants to buy my car.", "Sarah needs a car."],
    dna: { WHO: "I (the speaker, self-view)", DOES: "sell", WHAT: "my car", "TO WHOM": "Sarah", WHERE: "Paris", WHEN: "tomorrow", WHY: "pay my debt" },
    concept: "SALE", origin: "society", why: "a sale is an exchange: society & economy",
    actors: [
      { name: "ME", kind: "human", role: "origin actor · seller", conf: 0.95 },
      { name: "SARAH", kind: "human", role: "buyer", conf: 0.93 },
      { name: "MARK", kind: "human", role: "wants the car", conf: 0.9 },
      { name: "CAR", kind: "object", role: "used hatchback", conf: 0.97 },
    ],
    consequences: [
      { world: "society", ring: "actor", about: "me", text: "loses my car, gains money", tone: "neutral" },
      { world: "behaviour", ring: "actor", about: "me", text: "own goal 'pay my debt'", tone: "pos", status: "enabled", reason: "the sale gives me money" },
      { world: "society", ring: "impacted", about: "Sarah", text: "gains my car, loses money", tone: "neutral" },
      { world: "behaviour", ring: "other_actors", about: "Mark", text: "buy my car", tone: "neg", status: "blocked", reason: "Sarah has my car; ownership is exclusive" },
      { world: "behaviour", ring: "other_actors", about: "Sarah", text: "have a car", tone: "pos", status: "advanced", reason: "makes 'Sarah has car' true" },
      { world: "physical", ring: "environment", about: "the car", text: "changes hands and parking place" },
      { world: "digital", ring: "organization", about: "vehicle registry", text: "records the new owner", tone: "neutral" },
      { world: "business", ring: "organization", about: "insurers", text: "close one policy, open another", tone: "neutral" },
      { world: "society", ring: "country", about: "national economy", text: "a taxable transaction counts in national activity", tone: "neutral" },
      { world: "earth", ring: "earth", about: "resources", text: "an existing car is reused instead of a new one being made", tone: "pos" },
    ],
  },
  {
    id: "db_delete", icon: "💻", title: "An engineer deletes the production database", setting: "office",
    inside: "Platform team floor · Canary Wharf · 18:03 Friday",
    place: { name: "London", label: "An office tower, Canary Wharf, London (illustrative)", kind: "city", lat: 51.5049, lon: -0.0195 },
    city: "London", country: "United Kingdom", neighbours: ["Croydon", "Watford", "Slough"],
    sentence: "The engineer deleted the database in production.", context: ["Customers want to pay their bills.", "The CTO wants zero downtime."],
    dna: { WHO: "Sam (on-call engineer)", DOES: "delete", WHAT: "the customer database", WHERE: "production", WHEN: "Friday 18:03", WHY: "to clean up a test table (mistake)", HOW: "a DROP command on the wrong host" },
    concept: "DESTROY", origin: "digital", why: "the action happens on a system: digital",
    actors: [
      { name: "SAM", kind: "human", role: "origin actor · engineer", conf: 0.95 },
      { name: "PROD DB", kind: "system", role: "customers · payments", conf: 0.99 },
      { name: "PRIYA", kind: "human", role: "team lead", conf: 0.88 },
    ],
    consequences: [
      { world: "digital", ring: "impacted", about: "the database", text: "customer records are gone until restored from backup", tone: "neg" },
      { world: "digital", ring: "environment", about: "the payment app", text: "fails every request: error rate 100%", tone: "neg" },
      { world: "perception", ring: "environment", about: "dashboards", text: "turn red; on-call alerts fire", tone: "neg" },
      { world: "behaviour", ring: "actor", about: "Sam", text: "panics, then starts the restore (possible)", tone: "risk" },
      { world: "behaviour", ring: "other_actors", about: "customers", text: "pay their bills", tone: "neg", status: "blocked", reason: "the payment app fails" },
      { world: "behaviour", ring: "other_actors", about: "the CTO", text: "zero downtime", tone: "neg", status: "blocked", reason: "the service is down" },
      { world: "business", ring: "organization", about: "the company", text: "loses revenue for the outage; support queue explodes", tone: "neg" },
      { world: "society", ring: "country", about: "data protection", text: "a personal-data breach may have to be reported to the regulator (ICO) within 72 h", tone: "risk" },
      { world: "society", ring: "society", about: "trust", text: "customers' trust in the service drops (possible)", tone: "neg" },
      { world: "physical", ring: "neighbour", about: "the data centre", text: "no physical change: servers keep running", tone: "neutral" },
    ],
  },
  {
    id: "forest_fire", icon: "🔥", title: "A hiker drops a lit cigarette in a dry forest", setting: "forest",
    inside: "Trailhead · dry chaparral · 14:20 · wind 35 km/h",
    place: { name: "Angeles National Forest", label: "A trail, Angeles National Forest, California (illustrative)", kind: "city", lat: 34.2961, lon: -118.0412 },
    city: "Los Angeles", country: "United States", neighbours: [],
    sentence: "A hiker dropped a lit cigarette in the dry forest.", context: ["Residents want to stay safe.", "Firefighters want to contain fires early."],
    dna: { WHO: "a hiker", DOES: "drop", WHAT: "a lit cigarette", WHERE: "dry forest trail", WHEN: "14:20, heatwave", WHY: "none stated (careless)", HOW: "flicked into the brush" },
    concept: "DROP", origin: "earth", why: "the action happens in nature: earth",
    actors: [
      { name: "HIKER", kind: "human", role: "origin actor", conf: 0.92 },
      { name: "CIGARETTE", kind: "object", role: "lit · ~700 °C", conf: 0.71 },
      { name: "DRY BRUSH", kind: "object", role: "fuel · 6% moisture", conf: 0.86 },
    ],
    consequences: [
      { world: "atomic", ring: "impacted", about: "dry brush", text: "ignites: combustion at ~700 °C", tone: "neg" },
      { world: "physical", ring: "environment", about: "the fire", text: "spreads uphill with a 35 km/h wind", tone: "neg" },
      { world: "perception", ring: "neighbour", about: "satellites", text: "a thermal hotspot appears in the next satellite pass", tone: "neutral" },
      { world: "behaviour", ring: "other_actors", about: "residents", text: "stay safe", tone: "risk", status: "at_risk", reason: "the fire moves toward homes" },
      { world: "behaviour", ring: "other_actors", about: "firefighters", text: "contain it early", tone: "risk", status: "hindered", reason: "a 35 km/h wind" },
      { world: "digital", ring: "city", about: "emergency alerts", text: "evacuation warnings reach phones in the county", tone: "neutral" },
      { world: "business", ring: "organization", about: "insurers and tourism", text: "claims rise; trails and businesses close", tone: "neg" },
      { world: "society", ring: "country", about: "the state", text: "may declare an emergency and fund the response (possible)", tone: "risk" },
      { world: "earth", ring: "earth", about: "the atmosphere", text: "smoke and CO₂ are released; habitat is lost", tone: "neg" },
      { world: "behaviour", ring: "actor", about: "the hiker", text: "may face charges if identified (possible)", tone: "risk" },
    ],
  },
];

const RING_TITLES: Record<RingKey, string> = {
  actor: "Actor", impacted: "Impacted", other_actors: "Other actors", environment: "Local environment", neighbour: "Neighbours",
  organization: "Organization", city: "City", country: "Country", society: "Society", earth: "Earth",
};
const ORDER: RingKey[] = ["actor", "impacted", "other_actors", "environment", "neighbour", "organization", "city", "country", "society", "earth"];

/** The mission as the same JSON shape the engine returns, so every panel renders it unchanged. */
export function missionResult(m: Mission): PhraseResult {
  const rings: Ring[] = ORDER.map((key) => {
    const rows = m.consequences.filter((c) => c.ring === key).map((c) => ({
      about: c.about, text: c.status ? `${c.text}: ${c.status.replace("_", " ")}` : c.text, reason: c.reason,
      basis: "authored_demo", source: "mission:authored", direction: c.tone === "pos" ? "+" : c.tone === "neg" ? "-" : null, world: c.world,
    }));
    const extent = key === "environment" ? m.place.name : key === "neighbour" ? m.neighbours.join(", ") || null : key === "city" ? m.city : key === "country" ? m.country : null;
    return { key, title: RING_TITLES[key], question: "", extent, rows, empty: rows.length ? null : "No supporting evidence" };
  });
  const s = (v?: string) => (v ? [{ text: v }] : []);
  return {
    id: `mission-${m.id}`, text: m.sentence, context: m.context, shows: m.title,
    summary: { action: m.sentence, predicate: m.dna.DOES, concept: m.concept, actor: m.dna.WHO, self_view: m.id === "car_sale", tense: "past", certainty: 1, realized: true, condition: null, places: [m.place.name], notes: [] },
    rings,
    acm_json: { trace: { frame: { subject: s(m.dna.WHO), predicate: { lemma: m.dna.DOES }, objects: s(m.dna.WHAT), destination: s(m.dna["TO WHOM"]), location: s(m.dna.WHERE), time: s(m.dna.WHEN), goal: s(m.dna.WHY), manner: s(m.dna.HOW) } } },
    suggestions: [],
  };
}
