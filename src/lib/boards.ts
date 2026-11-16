/**
 * Event-board data for the Government and Society & Economy views (a Polymarket-INSPIRED layout:
 * question cards, category filters, possible-outcome rows). This is an exploration interface:
 * no trading, wallet, deposits or accounts, and NO probabilities: no outcome has odds, because
 * nothing in this repository estimates them. Market widgets use FICTIONAL demo series; no market
 * data integration exists in this repository.
 */

export interface EventCard {
  id: string;
  world: "government" | "society" | "business";
  category: string;
  question: string;
  outcomes: string[];
  assumptions: string[];
  /** Scenario ids the card is most relevant to (highlighted, listed first). */
  scenarios: string[];
}

export const NO_PROBABILITY = "Illustrative scenario · no probability estimated";

export const GOV_FILTERS = ["All", "Government", "Policy", "Law", "Politics", "Defence"];
export const ECON_FILTERS = ["All", "Prices", "Households", "Markets", "Jobs", "Trust", "Public services"];
export const BIZ_FILTERS = ["All", "Operations", "Finance", "Supply chain", "People", "Sales"];

/** The 11 S&P 500 (GICS) sectors, and the words that tie a business consequence to each. */
export const SECTORS: { id: string; label: string; keys: RegExp }[] = [
  { id: "it", label: "Information Technology", keys: /data.?cent|\bai\b|cloud|server|software|chip|iphone|phone/i },
  { id: "comm", label: "Communication Services", keys: /cable|network|telecom|media|news|social/i },
  { id: "fin", label: "Financials", keys: /bank|payment|insur|financ/i },
  { id: "util", label: "Utilities", keys: /energy provider|utility|electric|power plant|grid/i },
  { id: "energy", label: "Energy", keys: /fossil|gas|coal|oil|fuel/i },
  { id: "ind", label: "Industrials", keys: /factory|supplier|production|glazier|contractor|repair|logistic/i },
  { id: "disc", label: "Consumer Discretionary", keys: /shop|retail|store|customer/i },
  { id: "staples", label: "Consumer Staples", keys: /grocer|food|bakery|household goods/i },
  { id: "health", label: "Health Care", keys: /hospital|health|medical|pharma/i },
  { id: "materials", label: "Materials", keys: /steel|copper|material|chemical|glass/i },
  { id: "realestate", label: "Real Estate", keys: /building|property|office tower|real estate/i },
];

export const CARDS: EventCard[] = [
  { id: "g-grid", world: "government", category: "Policy", question: "Will policymakers approve additional grid investment?",
    outcomes: ["Approved, if demand forecasts justify it", "Delayed pending review", "Unknown without regional planning data"],
    assumptions: ["demand growth is significant relative to grid capacity"], scenarios: ["ai_datacenter_energy", "electricity_price_rise"] },
  { id: "g-dcpolicy", world: "government", category: "Policy", question: "Could a new AI data-center energy policy be proposed?",
    outcomes: ["A proposal is tabled", "Existing rules are judged sufficient", "Unknown: depends on political priorities"],
    assumptions: ["AI energy demand is on the public agenda"], scenarios: ["ai_datacenter_energy", "datacenter_disclosure_policy"] },
  { id: "g-law", world: "government", category: "Law", question: "Will the disclosure proposal become law?",
    outcomes: ["Adopted as proposed", "Adopted with changes", "Not adopted"],
    assumptions: ["the proposal enters the legislative process"], scenarios: ["datacenter_disclosure_policy"] },
  { id: "g-reg", world: "government", category: "Government", question: "Could regulators open a review of the bank incident?",
    outcomes: ["A review is opened", "The bank's own report is accepted", "Unknown: depends on jurisdiction and severity"],
    assumptions: ["the bank is regulated in the jurisdiction concerned"], scenarios: ["ai_agent_bank_breach", "incorrect_bank_report"] },
  { id: "g-infra", world: "government", category: "Defence", question: "Could authorities review critical-infrastructure resilience after the outage?",
    outcomes: ["A resilience review is requested", "Handled by the operator alone", "Unknown: depends on whether essential services were affected"],
    assumptions: ["the affected services are classed as critical"], scenarios: ["lightning_datacenter", "cooling_pump_off", "submarine_cable_outage"] },
  { id: "g-debate", world: "government", category: "Politics", question: "Will rising electricity prices feature in political debate?",
    outcomes: ["Debated in parliament or council", "Mainly a media topic", "Unknown"],
    assumptions: ["the rise is sustained and widely felt"], scenarios: ["electricity_price_rise"] },

  /* ---- business: one or more questions per scenario that reaches Business ---- */
  { id: "b-dc-ppa", world: "business", category: "Finance", question: "Will the data-center operator sign a long-term power contract?",
    outcomes: ["A long-term contract with a utility", "Buys power on the spot market", "Unknown until the site is chosen"], assumptions: ["the operator needs stable prices"], scenarios: ["ai_datacenter_energy"] },
  { id: "b-dc-gen", world: "business", category: "Operations", question: "Will energy providers add generation for the new demand?",
    outcomes: ["Run existing plants harder (pathway A)", "Invest in new low-carbon capacity (pathway B)", "Unknown: depends on grid capacity"], assumptions: ["demand is large for the region"], scenarios: ["ai_datacenter_energy"] },
  { id: "b-disclose", world: "business", category: "Operations", question: "Will data-center operators support the disclosure rule?",
    outcomes: ["Industry supports it", "Industry lobbies for changes", "Unknown"], assumptions: ["the proposal goes to consultation"], scenarios: ["datacenter_disclosure_policy"] },
  { id: "b-prices", world: "business", category: "Sales", question: "Will local businesses raise their own prices?",
    outcomes: ["Prices rise to cover energy costs", "Margins absorb the rise", "Unknown: depends on competition"], assumptions: ["energy is a large share of costs"], scenarios: ["electricity_price_rise"] },
  { id: "b-restart", world: "business", category: "Supply chain", question: "Will the factory restart production within a week?",
    outcomes: ["Yes, with a second supplier", "Yes, when the part arrives", "No: weeks of delay"], assumptions: ["the part is single-source"], scenarios: ["factory_supplier_failure"] },
  { id: "b-correction", world: "business", category: "Finance", question: "Will the bank's correction stop customers withdrawing money?",
    outcomes: ["Yes, within a day", "Some withdrawals continue", "Unknown: depends on how far the story spread"], assumptions: ["the bank responds quickly"], scenarios: ["incorrect_bank_report"] },
  { id: "b-cable", world: "business", category: "Operations", question: "Will companies' cloud services stay up while traffic is rerouted?",
    outcomes: ["Yes, with slower responses", "Some outages for hours", "Unknown: depends on spare capacity"], assumptions: ["services depend on the cut route"], scenarios: ["submarine_cable_outage"] },
  { id: "b-payments", world: "business", category: "Operations", question: "Will the bank's payments resume within 24 hours?",
    outcomes: ["Yes, after containment", "Partly, some services stay down", "No: a longer outage"], assumptions: ["the breach is contained"], scenarios: ["ai_agent_bank_breach"] },
  { id: "b-ai-outage", world: "business", category: "Operations", question: "Will the AI services be back within hours?",
    outcomes: ["Yes, via failover to another site", "Partly, during repair", "No: until the equipment is fixed"], assumptions: ["failover capacity exists"], scenarios: ["lightning_datacenter", "cooling_pump_off"] },
  { id: "b-glazier", world: "business", category: "Operations", question: "Will the window be replaced this week?",
    outcomes: ["Yes, a glazier is free", "Next week", "Unknown"], assumptions: ["a standard pane size"], scenarios: ["ball_through_window"] },
  { id: "b-iphone", world: "business", category: "Sales", question: "Does one gift purchase change the phone shop's month?",
    outcomes: ["Adds one sale to the month", "No visible change", "Unknown"], assumptions: ["a typical shop volume"], scenarios: ["mark_iphone_gift"] },
  { id: "b-replace", world: "business", category: "People", question: "Will Lina's team find a replacement before her last day?",
    outcomes: ["Yes, an internal move", "Only after she leaves", "Unknown: depends on the job market"], assumptions: ["a one-month notice period"], scenarios: ["lina_resigns"] },

  { id: "e-prices", world: "society", category: "Prices", question: "Could a new AI data center affect regional electricity prices?",
    outcomes: ["Prices may rise if supply is constrained", "Prices may remain stable if sufficient capacity exists", "The effect is unknown without location and grid data"],
    assumptions: ["the data center draws from the regional grid"], scenarios: ["ai_datacenter_energy"] },
  { id: "e-house", world: "society", category: "Households", question: "How might an increase in energy prices affect households?",
    outcomes: ["Higher bills; some households cut use", "Support schemes offset part of the rise", "Unknown: depends on contracts and support"],
    assumptions: ["retail tariffs follow wholesale prices"], scenarios: ["electricity_price_rise", "ai_datacenter_energy"] },
  { id: "e-shares", world: "society", category: "Markets", question: "Could energy-related shares react to the announcement?",
    outcomes: ["Shares may move if investors expect a change in demand", "No measurable reaction", "Unknown: one event does not automatically move a market"],
    assumptions: ["the companies involved are listed"], scenarios: ["ai_datacenter_energy", "ai_agent_bank_breach"] },
  { id: "e-trust", world: "society", category: "Trust", question: "Could customers' trust in the bank change?",
    outcomes: ["Trust falls among some customers", "Trust recovers after a correction", "Unknown: depends on reach and response"],
    assumptions: ["customers see the story or the incident"], scenarios: ["incorrect_bank_report", "ai_agent_bank_breach"] },
  { id: "e-jobs", world: "society", category: "Jobs", question: "Could the factory stoppage affect local jobs and schedules?",
    outcomes: ["Shifts are paused or moved", "Staff are redeployed", "Unknown: depends on how long the stoppage lasts"],
    assumptions: ["no alternative supplier at once"], scenarios: ["factory_supplier_failure"] },
  { id: "e-disaster", world: "society", category: "Public services", question: "How long could residents lose power, water or transport after the disaster?",
    outcomes: ["Hours, if networks are restored quickly", "Days to weeks where damage is heavy", "Unknown: depends on damage and repair crews"],
    assumptions: ["infrastructure in the area is damaged"], scenarios: ["hurricane_landfall", "earthquake_city"] },
  { id: "e-access", world: "society", category: "Public services", question: "Could the outage interrupt online services people rely on?",
    outcomes: ["Some services are slow or unavailable", "Failover keeps services running", "Unknown: depends on redundancy"],
    assumptions: ["the affected services lack full redundancy"], scenarios: ["submarine_cable_outage", "lightning_datacenter", "cooling_pump_off"] },
];

export interface Series { id: string; label: string; unit: string; points: number[]; decimals: number }

/** Deterministic FICTIONAL series (seeded random walk). Not market data; no source; no timestamp. */
export function fictionalSeries(): Series[] {
  const make = (id: string, label: string, unit: string, start: number, vol: number, decimals: number): Series => {
    let h = 2166136261;
    for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 10000) / 10000;
    const points: number[] = [];
    let v = start;
    for (let i = 0; i < 24; i++) { v = Math.max(0, v + (rnd() - 0.48) * vol); points.push(v); }
    return { id, label, unit, points, decimals };
  };
  return [
    make("equity", "S&P 500 (fictional values)", "pts", 5000, 60, 0),
    make("bond", "10-year bond yield", "%", 3.8, 0.08, 2),
    make("debt", "Public debt", "% of GDP", 98, 0.6, 1),
    make("rate", "Policy interest rate", "%", 3.5, 0.05, 2),
    make("cpi", "Inflation, year on year", "%", 2.6, 0.12, 1),
    make("power", "Electricity price index", "index", 100, 3, 0),
    make("bill", "Household energy bill", "€/month", 120, 3, 0),
  ];
}

export const FICTIONAL = "Fictional demo data · not market data · no source";
