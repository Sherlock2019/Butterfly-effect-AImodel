/**
 * Prediction routing for the ten worlds: which world does an action DIRECTLY impact first?
 *
 * ACMP's own router: a small ordered list of explicit rules; each result names the rule that fired
 * and the words that matched, so it can be checked.
 *
 * Context, not keywords alone:
 *  - MEDIA needs a content act (publish, broadcast, report, post, share, stream…) AND content
 *    (a story, report, video, post…) or a publishing channel. "posted the letter" is not media.
 *  - A platform name alone (Facebook, YouTube, X) with infrastructure words (server, outage, hack,
 *    database) is DIGITAL: the platform's systems, not its content.
 *  - Words are matched on the whole sentence plus a parsed verb and object when available (NPLM, optional).
 * Limitation: this is lexical. It does not resolve who is the agent or negation, and an
 * unrecognised verb falls back to Physical (said so in `why`).
 */

import type { Scale, TopWorldId } from "./worlds";

export interface RouteInput {
  text: string;
  /** Predicate lemma, when parsed. */
  verb?: string | null;
  /** Object slot(s), when parsed. */
  objects?: string | null;
  /** Concept (SALE, THEFT, …), when known from recorded data. */
  concept?: string | null;
  place?: string | null;
}

export interface RouteResult {
  world: TopWorldId;
  scale?: Scale;
  rule: string;
  why: string;
  matched: string[];
  /** Other worlds the same words also point to (an event can matter in several worlds). */
  also: { world: TopWorldId; rule: string; matched: string[] }[];
  /** State tags handed to the cascade engine as the seed's starting state. */
  tags: string[];
  fallback: boolean;
}

const rx = (words: string[]) => new RegExp(`\\b(${words.join("|")})`, "gi");
const hits = (s: string, words: string[]) => [...new Set((s.match(rx(words)) ?? []).map((w) => w.toLowerCase()))];

const CONTENT_VERBS = ["publish", "broadcast", "reported", "reports on", "post\\b", "posted", "posts\\b", "share\\b", "shared", "shares\\b", "stream", "tweet", "retweet", "upload", "aired", "covers\\b", "covered", "goes viral", "went viral", "spreads\\b", "spread\\b", "repost", "distribut"];
const CONTENT = ["story", "stories", "article", "report", "news", "headline", "video", "post", "tweet", "photo", "clip", "podcast", "rumou?r", "misinformation", "coverage", "footage", "interview", "review"];
const CHANNELS = ["facebook", "youtube", "twitter", "x\\.com", "tiktok", "instagram", "social media", "tv\\b", "television", "radio", "newspaper", "news outlet", "journalist", "reporter", "broadcaster", "blog", "channel", "on x\\b"];
const NOT_MEDIA = ["letter", "parcel", "mail", "package", "guard", "sentry"];
const INFRA = ["server", "database", "outage", "hack", "hacked", "breach", "down\\b", "hosting", "login", "api", "unauthori[sz]ed access", "malware", "ransomware", "data cent(er|re)", "crash", "deploy"];
const NETWORK = ["cable", "submarine", "fib(er|re)", "router", "wan\\b", "wi-?fi", "satellite", "bandwidth", "connectivity", "telecom", "mobile network", "4g", "5g", "internet route", "network route", "latency", "isp\\b", "network outage", "network link"];
const GOVERNMENT = ["government", "parliament", "minister", "ministry", "regulator", "legislat", "new law", "the law\\b", "bill\\b", "policy", "curfew", "decree", "election", "vote", "military", "army", "defen[cs]e", "sanction", "senate", "congress", "president", "mayor", "city council"];
const DIGITAL = ["database", "server", "software", "\\bapp\\b", "application", "api", "ai agent", "payment system", "cloud", "hack", "breach", "malware", "ransomware", "unauthori[sz]ed access", "password", "permission", "website", "account", "login", "deleted? the data", "code\\b", "deploy", "chatbot", "algorithm"];
const EARTH = ["forest", "river", "ocean", "\\bsea\\b", "climate", "emission", "pollut", "species", "wildlife", "ecosystem", "drought", "demand for electricity", "electricity demand", "energy demand", "power demand", "deforest", "carbon"];
const BUSINESS = ["factory", "supplier", "company", "firm\\b", "production", "supply chain", "contract", "shipment", "warehouse", "invoice", "revenue", "retailer", "manufactur", "operator"];
const SOCIETY = ["price", "inflation", "household", "jobs?\\b", "unemploy", "economy", "market", "stock", "share price", "bond", "interest rate", "wage", "rent\\b", "public service", "community", "tax\\b", "taxes"];
const BEHAVIOUR = ["decides?", "decided", "chooses?", "chose", "ignores?", "ignored", "refuses?", "wants?", "intends?", "panics?", "hesitates?", "tells?", "told", "argues?", "apologi[sz]es?"];
const PERCEPTION = ["hears?", "heard", "sees?", "saw", "seen", "notices?", "noticed", "smells?", "smelled", "detects?", "detected", "spots?", "spotted", "watches", "observes?", "senses?"];
const PHYSICAL = ["kick", "push", "drop", "strike", "struck", "hits?\\b", "break", "broke", "falls?\\b", "fell", "throw", "threw", "lightning", "collide", "crash", "switch(es)? off", "pump", "spill", "burn", "fire\\b", "flood"];
const SCALE: { scale: Scale; words: string[] }[] = [
  { scale: "quantum", words: ["quantum", "photon", "wave function", "superposition", "entangle"] },
  { scale: "atomic", words: ["atom", "electron", "nucleus", "isotope", "radioactiv"] },
  { scale: "molecular", words: ["molecul", "chemical reaction", "polymer", "oxidi[sz]", "dissolv"] },
];

const EXCHANGE = ["SALE", "PURCHASE", "PAYMENT", "LOAN", "GIFT", "HIRE", "RENT", "THEFT"];

interface Candidate { world: TopWorldId; rule: string; matched: string[]; why: string; tags: string[]; scale?: Scale }

export function route(input: RouteInput): RouteResult {
  const s = [input.text, input.verb ?? "", input.objects ?? ""].join(" ");
  const c = input.concept ?? "";
  const at = input.place ? ` in ${input.place}` : "";
  const found: Candidate[] = [];
  const add = (x: Candidate | null) => x && found.push(x);

  // 1 perception: someone or something senses a signal
  const per = hits(s, PERCEPTION);
  if (per.length) add({ world: "perception", rule: "perception.sense", matched: per, why: `a sensing verb (${per.join(", ")}): someone or something perceives a signal`, tags: ["detected"] });

  // 2 media: a content act on content or through a channel (context, not the platform name)
  const cv = hits(s, CONTENT_VERBS);
  const cn = hits(s, CONTENT);
  const ch = hits(s, CHANNELS);
  const nm = hits(s, NOT_MEDIA);
  if (cv.length && (cn.length || ch.length) && !nm.length) {
    add({ world: "media", rule: "media.content_act", matched: [...cv, ...cn, ...ch], why: `a content act (${cv.join(", ")}) on content or through a channel (${[...cn, ...ch].join(", ")}): publication and spread`, tags: ["public_coverage", ...(/incorrect|false|wrong|misinform|rumou?r/i.test(s) ? ["incorrect_report"] : [])] });
  }

  // 3 network: links, cables, connectivity
  const nw = hits(s, NETWORK);
  if (nw.length) add({ world: "network", rule: "network.link", matched: nw, why: `communication infrastructure (${nw.join(", ")}): connectivity and routes`, tags: [/outage|cut|damag|interrupt|down|fail/i.test(s) ? "route_down" : "network_change"] });

  // 4 government: public authority, law, policy
  const gv = hits(s, GOVERNMENT);
  if (gv.length) add({ world: "government", rule: "government.authority", matched: gv, why: `a public authority, law or policy (${gv.join(", ")})`, tags: ["policy_proposed"] });

  // 5 digital: systems, data, permissions. A platform name + infrastructure is digital, not media.
  const dg = hits(s, DIGITAL);
  const inf = hits(s, INFRA);
  if (dg.length || (ch.length && inf.length)) {
    const platform = ch.length && inf.length && !cv.length;
    add({
      world: "digital", rule: platform ? "digital.platform_infrastructure" : "digital.system",
      matched: [...dg, ...(platform ? [...ch, ...inf] : [])],
      why: platform ? `a platform's infrastructure (${[...ch, ...inf].join(", ")}), not its content: digital` : `a digital system${at} (${dg.join(", ")})`,
      tags: [/hack|breach|unauthori[sz]ed|malware|ransomware/i.test(s) ? "system_compromised" : "service_disrupted", ...(/bank|payment|customer|public|users/i.test(s) ? ["public_facing"] : [])],
    });
  }

  // 6 earth: nature, resources, emissions
  const ea = hits(s, EARTH);
  if (ea.length) add({ world: "earth", rule: "earth.resource", matched: ea, why: `nature, resources or emissions (${ea.join(", ")})`, tags: [/electricity|energy|power/i.test(s) ? "electricity_demand_up" : "environmental_change"] });

  // 7 business: organisations and their operations
  const bu = hits(s, BUSINESS);
  if (bu.length || ["FIRE", "LAYOFF", "CONTRACT", "SIGN"].includes(c)) add({ world: "business", rule: "business.operations", matched: bu.length ? bu : [c], why: `an organisation's operations (${(bu.length ? bu : [c]).join(", ")})`, tags: [/stop|halt|fail|shut/i.test(s) ? "production_stopped" : "operations_change"] });

  // 8 society & economy: prices, households, exchanges
  const so = hits(s, SOCIETY);
  if (so.length) add({ world: "society", rule: "society.economy", matched: so, why: `prices, households or markets (${so.join(", ")})`, tags: [/rise|increase|higher|surge/i.test(s) ? "price_rise" : "economic_change"] });
  else if (EXCHANGE.includes(c)) add({ world: "society", rule: "society.exchange", matched: [c], why: `${c.toLowerCase()} is an exchange${at}: society & economy`, tags: ["ownership_change"] });

  // 9 behaviour: decisions, intentions, communication
  const be = hits(s, BEHAVIOUR);
  if (be.length || ["TELL", "INFORM", "ANNOUNCE", "MEET", "MARRY"].includes(c)) add({ world: "behaviour", rule: "behaviour.decision", matched: be.length ? be : [c], why: `a decision or intention (${(be.length ? be : [c]).join(", ")})`, tags: ["decision_to_act"] });

  // 10 physical: forces, objects, motion (+ scale)
  const ph = hits(s, PHYSICAL);
  const sc = SCALE.find((x) => hits(s, x.words).length);
  if (sc) add({ world: "physical", scale: sc.scale, rule: `physical.${sc.scale}`, matched: hits(s, sc.words), why: `${sc.scale}-scale words (${hits(s, sc.words).join(", ")}): Physical › ${sc.scale}`, tags: ["impact"] });
  if (ph.length) add({ world: "physical", scale: "human", rule: "physical.force", matched: ph, why: `force, motion or objects (${ph.join(", ")})`, tags: [...(/lightning|strike|struck|damag/i.test(s) ? ["equipment_damage"] : []), ...(/window|glass/i.test(s) ? ["glass_breaks"] : []), "impact"] });

  if (!found.length) {
    const why = c ? `${c.toLowerCase()} moves or changes things${at}: physical (no specific routing rule)` : "unknown verb: no routing rule matched, shown in Physical by default";
    return { world: "physical", scale: "human", rule: "fallback", why, matched: [], also: [], tags: ["impact"], fallback: true };
  }
  const [first, ...rest] = found;
  return { world: first.world, scale: first.scale, rule: first.rule, why: first.why, matched: first.matched, tags: first.tags, fallback: false, also: rest.filter((r) => r.world !== first.world).map((r) => ({ world: r.world, rule: r.rule, matched: r.matched })) };
}
