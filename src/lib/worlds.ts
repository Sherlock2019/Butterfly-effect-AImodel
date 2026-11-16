/**
 * The ten worlds of the Butterfly Model, TOP-DOWN (earth first, physical last), plus the action
 * and prediction routing, which are NOT worlds. Physical holds four scales (human, molecular,
 * atomic, quantum). ACMP is standalone: `status` and `today` say honestly what ACMP itself models
 * (its router and prototype cascade rules, all illustrative), with evidence from this repository.
 *
 * The order is an organisation for the eye, not a causal rule: a consequence may connect any two
 * worlds directly (see cascade.ts).
 *
 * v0.3 (2026-11-14): 8 → 10 worlds. Added government, media, network; atomic & molecular moved
 * from a top-level world into Physical as scales. Old ids still load: see normalizeWorld().
 */

export type TopWorldId =
  | "earth" | "government" | "society" | "business" | "media" | "network" | "digital" | "behaviour" | "perception" | "physical";
export type WorldId = TopWorldId | "action" | "routing";
export type Scale = "human" | "molecular" | "atomic" | "quantum";

export type Status = "working" | "partly" | "planned";

export interface World {
  id: WorldId;
  icon: string;
  name: string;
  short: string;
  /** What the world covers (product definition, not a claim of implementation). */
  laws: string;
  /** Short topic chips for the world stack. */
  chips: string[];
  /** Concepts the world is about (left column of the world stack). Not "laws" unless modelled. */
  principles: string[];
  today: string;
  status: Status;
  next: string;
  help?: string;
  example: string;
}

export const WORLDS: World[] = [
  {
    id: "earth", icon: "🌍", name: "Earth & Ecosystems", short: "Earth",
    laws: "climate, ecosystems, pollution, water, land, resources, biodiversity",
    chips: ["Climate", "Ecology", "Water & land", "Biodiversity"],
    principles: ["Climate & environment", "Ecosystem interactions", "Natural resources", "Biodiversity"],
    today: "prototype cascade rules (emissions, water, land, resources); no ecosystem model", status: "partly",
    next: "resource and emission models", help: "Climate, resource and emission modelling",
    example: "increased electricity production may increase emissions",
  },
  {
    id: "government", icon: "🏛️", name: "Government, Politics & Military", short: "Government",
    laws: "government decisions, laws, regulation, public policy, political processes, defence",
    chips: ["Government", "Policy", "Laws", "Defence"],
    principles: ["Governance & authority", "Political decisions", "Laws & regulation", "Defence & security"],
    today: "prototype cascade rules (reviews, policy responses, planning); router rules for authority, law and policy; no political model", status: "partly",
    next: "policy and regulation rule packs per jurisdiction, labelled with their uncertainty", help: "Political and legal modelling",
    example: "a government may review energy policy after demand rises",
  },
  {
    id: "society", icon: "📈", name: "Society & Economy", short: "Society",
    laws: "communities, jobs, public services, trust, markets, inflation, debt, the wider economy",
    chips: ["Markets", "Jobs", "Public services", "Trust"],
    principles: ["Markets & exchange", "Labour & employment", "Public services", "Livelihood & trust"],
    today: "prototype cascade rules (prices, access to services, trust, market reaction only if stated); no economic model", status: "partly",
    next: "economic models, labelled with their uncertainty", help: "Economic modelling",
    example: "higher electricity prices may affect households and businesses",
  },
  {
    id: "business", icon: "🏢", name: "Business & Institutions", short: "Business",
    laws: "organisations, operations, finance, supply chains, investments, contracts",
    chips: ["Companies", "Operations", "Finance", "Supply chain"],
    principles: ["Organisations & companies", "Institutions & governance", "Finance & capital", "Operations & management"],
    today: "prototype cascade rules (operations, costs, repairs, investment, compliance); no business model", status: "partly",
    next: "process, contract and jurisdiction rule packs", help: "Digital twins of real systems: registries, ledgers, permissions",
    example: "a data-centre operator faces higher electricity costs",
  },
  {
    id: "media", icon: "📺", name: "Social Media & News", short: "Media",
    laws: "TV, news organisations, YouTube, Facebook, X/Twitter, publication, sharing, public discussion",
    chips: ["TV news", "YouTube", "Facebook", "X/Twitter"],
    principles: ["Information & content", "Platforms & distribution", "News & public discussion", "Sources & credibility"],
    today: "router rules for publish / broadcast / share (router.ts) and prototype cascade rules (coverage, concern, trust, corrections); no spread model", status: "partly",
    next: "publication and spread models; source credibility", help: "Information-spread modelling",
    example: "news outlets and users discuss the impact of AI energy demand",
  },
  {
    id: "network", icon: "🌐", name: "Network & Communications", short: "Network",
    laws: "internet connectivity, WAN, Wi-Fi, satellite, submarine cables, telecoms, routing",
    chips: ["Internet", "WAN", "Wi-Fi", "Satellite", "Cable"],
    principles: ["Connectivity & access", "Network infrastructure", "Data transmission", "Coverage & reliability"],
    today: "router rules for cable / link / connectivity and prototype cascade rules (outages, rerouting); no topology model", status: "partly",
    next: "topology models of real networks", help: "Network simulation",
    example: "a cable outage disrupts network traffic",
  },
  {
    id: "digital", icon: "💻", name: "Digital & IT Systems", short: "Digital",
    laws: "applications, servers, cloud, databases, AI agents, records, permissions, workflows",
    chips: ["Applications", "Servers", "Data", "Permissions"],
    principles: ["Software & applications", "Computing & data", "IT infrastructure", "Identity & permissions"],
    today: "prototype cascade rules (service disruption, compromise, records); no external system is connected", status: "partly",
    next: "sandboxed models of real systems (registries, ledgers, permissions)", help: "Digital twins of real systems",
    example: "an AI agent gains unauthorised access to a payment system",
  },
  {
    id: "behaviour", icon: "🧠", name: "Human & Animal Behaviour", short: "Behaviour",
    laws: "goals, decisions, intentions, emotions, habits, choices, reactions",
    chips: ["Goals", "Feelings", "Decisions", "Groups"],
    principles: ["Goals & motivations", "Emotions & feelings", "Actions & decisions", "Groups & social behaviour"],
    today: "prototype cascade rules (decisions after a signal, concern, switching provider); never certain about thoughts", status: "partly",
    next: "a behaviour model trained on scripts and psychology knowledge", help: "Behaviour prediction",
    example: "a driver chooses to ignore a road-closure sign",
  },
  {
    id: "perception", icon: "👁️", name: "Perception", short: "Perception",
    laws: "seeing, hearing, sensory signals, observation, sensor detection",
    chips: ["Sensing", "Interpreting", "Attention", "Awareness"],
    principles: ["Sensing & input", "Interpreting & meaning", "Attention & focus", "Awareness & bias"],
    today: "prototype cascade rules (who may detect a physical change); recorded image/video detections are replayed", status: "partly",
    next: "a vision-language model (Qwen3-VL) and a detector/tracker (YOLO)", help: "Computer vision",
    example: "a pedestrian hears an alarm and sees smoke",
  },
  {
    id: "physical", icon: "⚙️", name: "Physical World", short: "Physical",
    laws: "human-scale objects and motion, molecules, atoms, quantum phenomena",
    chips: ["Objects", "Forces", "Motion", "Materials"],
    principles: ["Physical laws & forces", "Matter, energy & motion", "Material properties", "Scale from human to quantum"],
    today: "prototype cascade rules (damage, power loss, overheating); a 2D physics lab (matter.js)", status: "partly",
    next: "Unreal Engine 5 in the loop; world models (V-JEPA 2-AC) behind the same interface", help: "Physics simulation",
    example: "a ball strikes a window and breaks the glass",
  },
];

export interface ScaleInfo { id: Scale; icon: string; name: string; status: Status; today: string; example: string }

/** Physical World's four scales. Only the human scale has any implementation. */
export const SCALES: ScaleInfo[] = [
  { id: "human", icon: "🚶", name: "Human scale", status: "partly", today: "prototype cascade rules; the 2D physics lab", example: "a ball strikes a window" },
  { id: "molecular", icon: "💧", name: "Molecular", status: "planned", today: "not modelled: conceptual view only", example: "water molecules (H₂O)" },
  { id: "atomic", icon: "⚛️", name: "Atomic", status: "planned", today: "not modelled: the lab's fracture rule is a material threshold, not an atomic model", example: "atoms arranged in a material" },
  { id: "quantum", icon: "〰️", name: "Quantum", status: "planned", today: "not modelled: conceptual view only", example: "a probability distribution" },
];

export const ROUTING: World = {
  id: "routing", icon: "🧭", name: "Prediction routing", short: "Routing",
  laws: "not a world: translates the trigger into a phrase, then picks the directly affected world and the worlds to evaluate",
  chips: ["NPLM translation", "Phrase DNA", "Explicit rules", "Across worlds"], principles: [],
  today: "NPLM translates the trigger into a phrase (Phrase DNA, optional); ACMP's rules (router.ts) pick the directly affected world; the cascade evaluates each connected world", status: "partly",
  next: "a routing benchmark on annotated examples", help: "Agents and LLM evaluation",
  example: "a cup on a table → physical",
};

export const ACTION: World = {
  id: "action", icon: "⚡", name: "Action", short: "Action",
  laws: "not a world: the trigger of change, by a human, an AI, an animal, a natural phenomenon or an organisation",
  chips: ["Text", "Email", "Article", "Image", "Video", "Sound"], principles: [],
  today: "typed, pasted (email, article) or captured (image, video, sound: described in text, no recognition model)", status: "partly",
  next: "text, image, video and audio reach the same meaning",
  example: "a waiter knocks a cup off the table",
};

export const TOP_IDS: TopWorldId[] = WORLDS.map((w) => w.id as TopWorldId);
export const ALL: World[] = [...WORLDS, ROUTING, ACTION];

/* ---------- compatibility: older world ids --------------------------------------------------- */

export interface Normalized { world: WorldId | null; scale?: Scale; legacy?: string }

/** Old or foreign world/layer ids → the ten worlds. Never throws; unknown ids give world: null. */
const LEGACY: Record<string, { world: WorldId; scale?: Scale }> = {
  atomic: { world: "physical", scale: "atomic" },
  molecular: { world: "physical", scale: "molecular" },
  quantum: { world: "physical", scale: "quantum" },
  human_scale: { world: "physical", scale: "human" },
  human_social: { world: "behaviour" }, // older layer id in recorded data
  planetary: { world: "earth" }, // older layer id in recorded data
  economy: { world: "society" },
  politics: { world: "government" },
  military: { world: "government" },
  social_media: { world: "media" },
  news: { world: "media" },
  communications: { world: "network" },
};

export function normalizeWorld(raw: string | null | undefined): Normalized {
  if (!raw) return { world: null };
  const k = raw.trim().toLowerCase();
  if (ALL.some((w) => w.id === k)) return { world: k as WorldId };
  const m = LEGACY[k];
  return m ? { ...m, legacy: k } : { world: null, legacy: k };
}

/** A world by id; legacy ids resolve to their new world, unknown ids to Physical (never crashes). */
export const worldById = (id: WorldId | string): World =>
  ALL.find((w) => w.id === id) ?? ALL.find((w) => w.id === normalizeWorld(id).world) ?? WORLDS[WORLDS.length - 1];
export const scaleById = (id: Scale) => SCALES.find((s) => s.id === id)!;
export const color = (id: WorldId | string) => `var(--w-${normalizeWorld(id).world ?? "routing"})`;

/** Validated with the dataviz palette script (dark surface #07080d): lightness, chroma, contrast and
 *  normal-vision ΔE pass; government↔society fails deutan CVD, so every world is always drawn with its
 *  icon and name (never colour alone). Red is reserved for the action. */
export const HEX: Record<WorldId, string> = {
  earth: "#3987e5", government: "#8f9a22", society: "#d95926", business: "#199e70", media: "#b86ee0",
  network: "#2d9fc7", digital: "#c98500", behaviour: "#d55181", perception: "#0ca30c", physical: "#9085e9",
  routing: "#b6bad3", action: "#ff3b3b",
};
export const hexOf = (id: WorldId | string) => HEX[(normalizeWorld(id).world ?? "routing") as WorldId];

/** Layer ids found in recorded scene data → the worlds. */
export const SCENE_LAYER: Record<string, WorldId> = {
  action: "action", physical: "physical", perception: "perception", routing: "routing",
  human_social: "behaviour", digital: "digital", business: "business", society: "society", planetary: "earth",
};

/** The rule engine's rings → the world the picture puts them in (a mapping for display only). */
export const RING_WORLD: Record<string, WorldId> = {
  actor: "behaviour", impacted: "behaviour", other_actors: "behaviour",
  environment: "physical", neighbour: "physical",
  organization: "business", city: "society", country: "society", society: "society", earth: "earth",
};

/** The README's flagship chain: one action, effects in several worlds. */
export const CUP_CHAIN: { world: WorldId; text: string }[] = [
  { world: "action", text: "a waiter knocks a cup off the table" },
  { world: "physical", text: "the cup falls" },
  { world: "physical", text: "the glaze fractures (material scale)" },
  { world: "perception", text: "the crash is heard" },
  { world: "behaviour", text: "the owner is upset" },
  { world: "digital", text: "a claim is filed" },
  { world: "business", text: "the café pays for it" },
  { world: "earth", text: "new glass is made" },
];

export const CONTACT = {
  profile: "https://dzoannguyentran.jobsmatchnow.com/#projects",
  profileLabel: "dzoannguyentran.jobsmatchnow.com",
  whatsapp: "https://wa.me/84908618075",
  whatsappLabel: "+84 908 618 075",
  mlm: "https://github.com/Sherlock2019/NPLM-Next-Phrase-language-model-",
};
