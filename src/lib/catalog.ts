/**
 * The scenario catalog: at least one scenario per top-level world, plus two bottom-up demos.
 *
 * ILLUSTRATIVE: every scenario's starting state (seeds) and context facts are written by hand;
 * its cascade is derived from them by the prototype rules (rules.ts), which are also authored and
 * unvalidated. Nothing here is engine output.
 *
 * Fictional: headlines, posts, organisations and places are examples, never real reports.
 */

import type { Ctx, Seed, Wording } from "./cascade";
import type { Place } from "./geo";
import type { Trigger } from "./trigger";
import type { Scene3D } from "./physics-scenes";
import { TOP_IDS, type Scale, type TopWorldId } from "./worlds";

export interface Pathway { id: string; label: string; short: string; ctx: Ctx; steps: string[] }
export interface GuidedStep { world: TopWorldId; text: string }

export interface Scenario {
  id: string;
  icon: string;
  title: string;
  /** What triggers the change: who acts and how the action arrives (raw input is fictional). */
  trigger: Trigger;
  actor: string;
  action: string;
  object?: string;
  context: string;
  /** The scenario as one sentence (e.g. for an optional NPLM parse). */
  sentence: string;
  liveContext?: string[];
  world: TopWorldId;
  scale?: Scale;
  seeds: Seed[];
  ctx: Ctx;
  /** Worlds the scenario reaches besides its start (checked against the limited cascade by tests). */
  downstream: TopWorldId[];
  /** "first_step" (default): only the direct world(s) and their first-step consequences. "all": every world. */
  scope?: "first_step" | "all";
  /** The scenario's own wording of each consequence, by rule id (rules still decide whether it happens). */
  say?: Wording;
  assumptions: string[];
  unknowns: string[];
  conditions?: string[];
  provenance: "illustrative";
  pathways?: Pathway[];
  guided?: GuidedStep[];
  place?: Place & { label: string };
  /** An earlier mission with an inside CAM view to reuse. */
  missionId?: string;
  /** Labels for the world visuals. */
  stage?: {
    hit?: string; // the node the action hits in the start world's visual
    scene?: Scene3D; // the scenario's own 3D scene (src/lib/physics-scenes.ts)
    behaviour?: { actor: string; goal: string; choices: string[]; chosen: number };
    perception?: { observer: string; signals: { kind: "light" | "sound" | "sensor"; label: string; status: "known" | "assumed" | "unavailable" }[] };
    headlines?: string[];
  };
}

const ILL = "illustrative" as const;

const RAW: Scenario[] = [
  {
    id: "ai_datacenter_energy",
    say: {
      "earth.fossil": { entity: "regional power plants", change: "may burn more gas or coal to meet the data center's extra load (pathway A)" },
      "earth.lowcarbon": { entity: "energy providers and the regional government", change: "may invest in solar, wind, nuclear and grid upgrades to serve the data center (pathway B, multi-year)" },
      "earth.planning": { change: "may review the data center's grid connection, permits and regional energy planning" },
      "earth.debate": { change: "may debate whether the AI data center's power use is worth it" },
      "bus.jobs_prices": { entity: "the region around the data center", change: "construction and operating jobs may be created; household power prices may change depending on grid capacity" },
      "bus.fossil_emissions": { entity: "the regional atmosphere", change: "CO₂ from the extra gas or coal generation may increase" },
      "bus.lowcarbon_land": { entity: "land, water and the energy mix", change: "new solar, wind or nuclear sites may change land use, cooling-water use and the region's emissions over years" },
      "earth.community": { entity: "communities near the power plants", change: "may face worse air quality and a larger climate footprint" },
      "soc.policy": { entity: "regional policymakers", change: "may consider rules on data-center energy use (no decision implied)" },
    },
    trigger: { actor: "organization", channel: "article", source: "TECH NEWS (fictional): A technology company is deploying a large AI data center in the region; it will increase demand for electricity." }, icon: "🌍", title: "A company deploys a large AI data center, increasing demand for electricity",
    actor: "a technology company", action: "deploys", object: "a large AI data center", context: "an illustrative grid region; location, timing and energy mix not specified",
    sentence: "A company deploys a large AI data center, increasing demand for electricity.", world: "earth",
    seeds: [
      { world: "earth", entity: "the regional grid", change: "electricity demand rises (stated by the scenario)", tags: ["electricity_demand_up"] },
      { world: "business", entity: "the data-center operator", change: "invests in the facility and pays for its electricity", tags: ["datacenter_investment"] },
    ],
    ctx: { energy_pathway: "fossil", planning_authority: "grid planners and permitting authorities", public_debate: true, communities: "nearby communities", policymakers: "policymakers", audience: "readers and viewers" },
    downstream: ["business", "society", "government", "media", "earth"],
    assumptions: ["the data center draws its power from the regional grid", "demand is large relative to local spare capacity"],
    unknowns: ["location", "timing", "existing grid capacity", "local energy mix", "cooling design and water use", "which projects (if any) are built"],
    conditions: ["Location", "Timing", "Electricity demand", "Existing grid capacity", "Local energy mix", "Available generation", "Water availability", "Regulation and energy policy", "Investment and construction timelines"],
    provenance: ILL,
    pathways: [
      { id: "fossil", label: "Pathway A · Fossil-fuel generation", short: "A · Fossil", ctx: { energy_pathway: "fossil" },
        steps: ["Data center increases electricity demand", "Fossil-fuel generation may increase", "Greenhouse-gas emissions may increase", "Possible environmental and societal impacts"] },
      { id: "low_carbon", label: "Pathway B · Low-carbon investment", short: "B · Low-carbon", ctx: { energy_pathway: "low_carbon" },
        steps: ["Data center increases electricity demand", "Energy providers or governments may invest in nuclear and/or renewable generation and grid infrastructure", "Possible long-term effects on energy supply, costs, land use, water use and emissions"] },
    ],
    place: { name: "Illustrative grid region", label: "An illustrative grid region, central Spain (not a real project)", kind: "city", lat: 40.42, lon: -3.7 },
    stage: { scene: "datacenter_grid" },
  },
  {
    id: "datacenter_disclosure_policy",
    say: {
      "gov.compliance": { change: "may have to measure and publish their electricity and water use, adding compliance costs, if adopted" },
      "gov.debate": { entity: "residents and consumer groups", change: "may debate how much power and water data centers use" },
      "gov.coverage": { change: "may report on the disclosure proposal and the industry's reaction" },
    },
    trigger: { actor: "organization", channel: "email", source: "From: press@ministry.example\nSubject: Press release: data-center disclosure proposal\n\nThe government proposes a new policy requiring large data centers to disclose their electricity and water use." }, icon: "🏛️", title: "A government proposes that large data centers disclose electricity and water use",
    actor: "a government", action: "proposes", object: "a disclosure policy for large data centers", context: "a proposal, not an adopted law",
    sentence: "The government proposes a new policy requiring large data centers to disclose their electricity and water use.", world: "government",
    seeds: [{ world: "government", entity: "the government", change: "proposes a disclosure requirement (not adopted)", tags: ["policy_proposed"] }],
    ctx: { regulated_parties: "large data-center operators", public_topic: "resource use and electricity prices", public_debate: true, audience: "readers and viewers" },
    downstream: ["business", "society", "media"],
    assumptions: ["the proposal is public"], unknowns: ["whether it is adopted", "its final content", "enforcement"],
    provenance: ILL, stage: { scene: "policy_desk" },
  },
  {
    id: "electricity_price_rise",
    say: {
      "soc.households": { entity: "households in the region", change: "may cut heating, cooling and appliance use to lower their bills" },
      "soc.costs": { entity: "local shops, bakeries and workshops", change: "higher power bills may raise their operating costs" },
      "soc.policy": { entity: "the regional government", change: "may consider energy-bill support or price measures (no decision implied)" },
      "soc.coverage": { entity: "regional news outlets", change: "may report the price rise and its effect on bills" },
      "med.concern": { entity: "households following the news", change: "some may worry about their next electricity bills" },
    },
    trigger: { actor: "organization", channel: "article", source: "Radio news transcript (fictional): Regional electricity prices rose sharply this morning, raising energy costs for households and businesses." }, icon: "📈", title: "A major increase in regional electricity prices raises household and business costs",
    actor: "the electricity market", action: "raises", object: "regional electricity prices", context: "fictional region; no real market data",
    sentence: "Regional electricity prices rise sharply and raise household and business energy costs.", world: "society",
    seeds: [{ world: "society", entity: "regional electricity prices", change: "rise sharply (stated by the scenario)", tags: ["price_rise"] }],
    ctx: { households: "households", businesses: "local businesses", policymakers: "policymakers", public_debate: true, audience: "readers and viewers" },
    downstream: ["behaviour", "business", "government", "media"],
    assumptions: ["the rise lasts long enough to be felt"], unknowns: ["size and duration of the rise", "any effect on stock indices or bond yields (not claimed)"],
    provenance: ILL, stage: { scene: "price_meter" },
  },
  {
    id: "factory_supplier_failure",
    say: {
      "bus.delays": { change: "customer orders may be delayed and idle-line costs may rise" },
      "bus.customers": { entity: "factory workers and local suppliers", change: "shifts may be paused and local suppliers' orders may drop" },
      "bus.shortage_record": { entity: "the factory's inventory and order system", change: "may flag the missing component and push back delivery dates" },
    },
    trigger: { actor: "organization", channel: "email", source: "From: logistics@supplier.example\nSubject: Delivery cancelled\n\nWe cannot deliver the critical component this week. Production at your plant will have to stop." }, icon: "🏭", title: "A factory stops production when a supplier fails to deliver a critical component",
    actor: "a supplier", action: "fails to deliver", object: "a critical component", context: "a single-source part",
    sentence: "A factory stops production because a supplier fails to deliver a critical component.", world: "business",
    seeds: [{ world: "business", entity: "the factory", change: "stops production: a critical component was not delivered", tags: ["production_stopped"] }],
    ctx: { operator: "the factory", customers: "employees and local suppliers", customer_effect: "schedules and local economic activity may be affected", order_system: "inventory and order systems" },
    downstream: ["business", "society", "digital"],
    assumptions: ["no alternative supplier is available at once"], unknowns: ["whether the disruption is major enough for news coverage", "how long it lasts"],
    provenance: ILL, stage: { hit: "supplier", scene: "factory_line" },
  },
  {
    id: "incorrect_bank_report",
    say: {
      "med.concern": { change: "some may worry that their savings are at risk" },
      "med.trust": { entity: "public trust in the bank", change: "may fall until the report is corrected" },
      "med.correction": { change: "may publish a correction and ask the outlet to retract the report" },
      "med.regulator": { change: "may check the bank's real position and the report's sources, if warranted" },
      "beh.switch_provider": { change: "some worried customers may move money to another bank" },
    },
    trigger: { actor: "organization", channel: "article", source: "EXAMPLE OUTLET (fictional, incorrect): “Bank faces cash shortfall.” Shared on social media within minutes." }, icon: "📺", title: "A news outlet publishes an incorrect report about a bank, and it spreads on social media",
    actor: "a news outlet (fictional)", action: "publishes", object: "an incorrect report about a bank", context: "fictional outlet, bank and posts",
    sentence: "A news outlet publishes an incorrect report about a bank, and the story spreads through social media.", world: "media",
    seeds: [{ world: "media", entity: "an incorrect report about a bank (fictional)", change: "is published and shared on social platforms", tags: ["public_coverage", "incorrect_report", "trust_topic", "regulated_subject"] }],
    ctx: { audience: "the bank's customers", trust_subject: "the bank", subject: "the bank", regulator: "the financial regulator", alternatives: true, provider: "the bank" },
    downstream: ["behaviour", "business", "society", "government"],
    assumptions: ["the report reaches the bank's customers"], unknowns: ["how far it spreads", "how people react"],
    provenance: ILL,
    stage: { scene: "bank_report", headlines: ["EXAMPLE OUTLET: “Bank faces cash shortfall” (incorrect, fictional)", "Fictional post: “Is my money safe?? 😟” · shared 2.4k times (fictional count)", "Fictional video: “What we know about the bank story”"] },
  },
  {
    id: "submarine_cable_outage",
    say: {
      "net.services": { change: "may slow down or time out for users on the cut route" },
      "net.operations": { change: "may see slower or interrupted cloud services until traffic is rerouted" },
      "net.public": { entity: "users online and tech news sites", change: "may report slow connections and discuss the cable cut" },
      "net.access": { change: "may find websites and video calls slow or unavailable" },
      "dig.reroute": { change: "traffic from the cut cable may be redirected here, increasing load and latency" },
    },
    trigger: { actor: "system", channel: "sensor", source: "NETWORK MONITOR (fictional): link INTL-7 down, submarine cable segment, 14:02 UTC; traffic loss on the route." }, icon: "🌐", title: "A submarine cable outage interrupts an international network route",
    actor: "a cable fault", action: "interrupts", object: "an international route", context: "illustrative route; real topology not modelled",
    sentence: "A submarine cable outage interrupts an international network route.", world: "network",
    seeds: [{ world: "network", entity: "an international cable route", change: "is interrupted by a submarine cable outage", tags: ["route_down"] }],
    ctx: { services: "cloud and online services using the route", dependents: "companies relying on those services", operations_effect: "may face interruptions", communities: "people in the affected regions", failover: "alternate cables and satellite links", audience: "users" },
    downstream: ["digital", "business", "media", "society"],
    assumptions: ["some traffic depends on the route"], unknowns: ["spare capacity on alternate routes", "repair time"],
    provenance: ILL, stage: { hit: "cable", scene: "seabed_cable" },
  },
  {
    id: "ai_agent_bank_breach",
    say: {
      "dig.operations": { change: "card payments and transfers may be paused while the breach is contained" },
      "dig.public_reports": { entity: "bank customers and financial news sites", change: "may report failed payments and discuss the AI-agent breach" },
      "dig.regulator": { change: "may investigate how an AI agent got access to payments, depending on jurisdiction" },
      // shown only if the user enables Behaviour / Society
      "med.concern": { change: "some may worry whether their card payments are safe" },
      "beh.switch_provider": { change: "some customers may move their accounts after the breach" },
      "bus.customers": { change: "may temporarily be unable to pay by card or transfer money" },
    },
    trigger: { actor: "ai", channel: "sensor", source: "SECURITY ALERT (fictional): AI agent 'ops-bot' obtained a payment-system admin token without authorization." }, icon: "💻", title: "An AI agent gains unauthorized access to a bank's payment system",
    actor: "an AI agent", action: "gains unauthorized access to", object: "a bank's payment system", context: "a fictional bank; jurisdiction not specified",
    sentence: "An AI agent gains unauthorized access to a bank's payment system in Paris.", world: "digital",
    seeds: [{ world: "digital", entity: "the bank's payment system", change: "is accessed without authorization by an AI agent", tags: ["system_compromised", "public_facing"] }],
    ctx: { dependents: "the bank's payment operations", operations_effect: "payment processing may be disrupted", customers: "some customers", customer_effect: "may temporarily lose access to payment services", regulator: "financial regulators", audience: "the bank's customers", alternatives: true, provider: "the bank" },
    downstream: ["business", "media", "government"],
    assumptions: ["the access affects payment operations"], unknowns: ["whether the bank is listed (market reaction not assumed)", "jurisdiction", "what the agent did with the access"],
    provenance: ILL, stage: { hit: "payments", scene: "agent_breach" },
  },
  {
    id: "driver_ignores_closure",
    say: { "beh.act": { entity: "the driver's car", change: "drives onto the closed road past the sign" } },
    trigger: { actor: "human", channel: "video", source: "Dashcam clip (fictional): a car drives past a ROAD CLOSED sign." }, icon: "🚗", title: "A driver decides to ignore a road-closure sign",
    actor: "a driver", action: "decides to ignore", object: "a road-closure sign", context: "no incident is assumed",
    sentence: "A driver decides to ignore a road-closure sign.", world: "behaviour",
    seeds: [{ world: "behaviour", entity: "the driver", change: "decides to ignore the road-closure sign", tags: ["decision_to_act"] }],
    ctx: { physical_action: "enters the closed road", physical_tag: "vehicle_on_closed_road", actor_entity: "the vehicle", observers: "the driver and others nearby", detection: "may see an obstruction or hazard on the closed road", responder: "the driver" },
    downstream: ["physical"],
    assumptions: ["the driver carries out the decision"], unknowns: ["whether an incident occurs (not assumed)", "why the road is closed"],
    provenance: ILL,
    stage: { scene: "driver", behaviour: { actor: "Driver", goal: "reach the destination quickly", choices: ["follow the detour", "wait", "ignore the sign"], chosen: 2 } },
  },
  {
    id: "alarm_and_smoke",
    say: { "perc.response": { change: "may decide to move away from the building and the smoke" } },
    trigger: { actor: "human", channel: "sound", source: "Audio (fictional): a fire alarm sounding; a phone photo shows smoke above the building." }, icon: "👁️", title: "A pedestrian hears a fire alarm and sees smoke",
    actor: "a pedestrian", action: "hears and sees", object: "a fire alarm and smoke", context: "a street next to a building",
    sentence: "A pedestrian hears a fire alarm and sees smoke.", world: "perception",
    seeds: [{ world: "perception", entity: "the pedestrian", change: "hears a fire alarm and sees smoke", tags: ["detected"] }],
    ctx: { responder: "the pedestrian", response: "leave the area", physical_action: "moves toward an exit", physical_tag: "movement", others_present: "other people nearby" },
    downstream: ["behaviour"],
    assumptions: ["the signals are real (not a drill)"], unknowns: ["the source of the smoke", "what the pedestrian actually decides"],
    provenance: ILL,
    stage: { scene: "alarm_smoke", perception: { observer: "Pedestrian", signals: [{ kind: "sound", label: "fire alarm (heard)", status: "known" }, { kind: "light", label: "smoke (seen)", status: "known" }, { kind: "sensor", label: "building smoke detector", status: "assumed" }] } },
  },
  {
    id: "ball_through_window",
    say: {
      "phys.detectable": { change: "may hear the glass break and see the ball land inside" },
      "phys.repair": { entity: "a local glazier", change: "may be called to replace the broken pane" },
      "phys.liability": { change: "may discuss who pays for the window (the child's parents or their insurer)" },
    },
    trigger: { actor: "human", channel: "video", source: "Doorbell camera clip (fictional): a ball flies over the fence and breaks the neighbour's window." }, icon: "⚽", title: "A child kicks a ball through a neighbour's window",
    actor: "a child", action: "kicks", object: "a ball", context: "back garden; the neighbour is home",
    sentence: "Leo kicked the ball through the neighbour's window.", liveContext: ["Mrs Martin wants to rest."], world: "physical", scale: "human",
    seeds: [{ world: "physical", scale: "human", entity: "the neighbour's window", change: "is struck by the ball; the glass breaks", tags: ["glass_breaks", "impact"] }],
    ctx: { observers: "the neighbour and the child", detection: "may hear the glass break and see the ball", responder: "the neighbour", response: "come and see what happened", repairer: "a glazier (repair company)", owner: "the neighbour and the child's family" },
    downstream: ["perception", "business", "society"],
    assumptions: ["single glazing breaks on impact"], unknowns: ["how the neighbour reacts", "who pays"],
    provenance: ILL, missionId: "ball_window",
    stage: { scene: "ball_window", hit: "window" },
  },
  {
    id: "lightning_datacenter",
    say: {
      "phys.supply_loss": { change: "may lose grid power and cooling after the transformer fault" },
      "phys.detectable": { change: "detect the transformer fault; a site alarm sounds" },
      "phys.repair": { change: "may be called to replace the lightning-damaged transformer" },
      "phys.replacement_resources": { entity: "copper, steel and transformer oil", change: "a new transformer must be manufactured; the damaged one becomes scrap" },
      "phys.backup_start": { entity: "the site's diesel generators", change: "may start to keep part of the server hall running" },
      "phys.servers_down": { change: "some may shut down where backup power does not cover the hall" },
      "perc.response": { change: "may decide to investigate and isolate the damaged transformer" },
      "phys.backup_emissions": { entity: "the air around the site", change: "diesel exhaust may add CO₂ and pollutants while the generators run" },
      "dig.operations": { change: "may lose the AI services they rely on, causing delays or lost sales" },
      "dig.reroute": { entity: "a second data center and its links", change: "may receive the redirected AI traffic, increasing load" },
      "dig.public_reports": { entity: "users and tech news outlets", change: "may report that AI services are down after the lightning strike" },
      "beh.act": { entity: "the damaged transformer", change: "is isolated by the technician" },
      "bus.customers": { change: "may lose access to AI-based services for the length of the outage" },
      "bus.regulator": { change: "may review the outage if essential services were affected" },
      "med.concern": { entity: "users of the AI services", change: "some may worry about reliability and look for alternatives" },
    },
    trigger: { actor: "nature", channel: "sensor", source: "SITE MONITOR (fictional): lightning strike detected 15:41; transformer T2 fault; server hall on battery." }, icon: "⚡", title: "Lightning strikes an AI data center",
    actor: "a lightning strike", action: "damages", object: "electrical equipment supplying a large AI data center", context: "storm; the site has backup generators",
    sentence: "A lightning strike damages the transformer supplying a large AI data center.", world: "physical", scale: "human",
    seeds: [{ world: "physical", scale: "human", entity: "the site transformer", change: "is damaged by a lightning strike", tags: ["equipment_damage", "impact"] }],
    ctx: {
      powers: "the server hall", backup_generators: true, observers: "monitoring sensors and on-site staff", detection: "sensors and staff detect the fault; an alarm sounds",
      responder: "a technician", response: "investigate and isolate the damaged equipment", physical_action: "isolates the damaged transformer", physical_tag: "equipment_isolated", actor_entity: "the damaged transformer",
      servers: "some servers and AI services", public_facing: true, dependents: "companies relying on the AI services", failover: "another data center", audience: "users",
      customers: "customers, workers and communities who rely on those services", regulator: "authorities (if essential services are affected)", repairer: "an electrical contractor",
    },
    downstream: ["perception", "behaviour", "digital", "network", "media", "business", "society", "government", "earth"],
    assumptions: ["the transformer feeds the server hall", "backup power does not cover every service"],
    unknowns: ["how long the outage lasts", "which services fail over", "whether essential services are affected"],
    provenance: ILL, scope: "all", stage: { scene: "lightning", hit: "transformer" },
    guided: [
      { world: "physical", text: "Electrical equipment is damaged." },
      { world: "perception", text: "Sensors and staff detect an alarm." },
      { world: "behaviour", text: "A technician responds." },
      { world: "digital", text: "Servers or AI services may be disrupted." },
      { world: "network", text: "Traffic may be rerouted or links may become congested." },
      { world: "media", text: "Users or news outlets may discuss the outage." },
      { world: "business", text: "Companies may experience operational delays." },
      { world: "society", text: "Customers, workers or communities may be affected." },
      { world: "government", text: "Authorities may review the incident if relevant." },
      { world: "earth", text: "Backup generation and equipment replacement may affect emissions and resources." },
    ],
  },
  {
    id: "cooling_pump_off",
    say: {
      "phys.detectable": { change: "detect the rising temperature; an alarm alerts the team" },
      "perc.response": { change: "may decide to investigate and shut servers down before they overheat" },
      "phys.servers_down": { change: "go offline while the server room cools down" },
      "dig.operations": { change: "may face delays or lost sales while the AI applications are offline" },
      "dig.reroute": { entity: "a backup data center", change: "may take over part of the traffic, increasing its network load" },
      "dig.public_reports": { entity: "users on social media and tech news", change: "may report that the AI applications are unavailable" },
      "bus.regulator": { change: "may review the outage if critical infrastructure was affected" },
      "med.concern": { entity: "people who rely on the AI applications", change: "some may become concerned about the service's reliability" },
    },
    trigger: { actor: "human", channel: "sensor", source: "BUILDING SYSTEM (fictional): cooling pump P3 switched off manually; server room 27 °C and rising." }, icon: "🌡️", title: "A technician switches off a cooling pump in an AI data center",
    actor: "a technician", action: "switches off", object: "a cooling pump", context: "server room of an AI data center",
    sentence: "The technician switches off a cooling pump in the server room.", world: "physical", scale: "human",
    seeds: [{ world: "physical", scale: "human", entity: "the server room", change: "temperature begins to rise after a cooling pump is switched off", tags: ["temperature_rise"] }],
    ctx: {
      // the technician shuts the servers down BEFORE they overheat: no hardware damage, repair or e-waste
      overheat_risk: false, observers: "temperature sensors and the operations team", detection: "temperature sensors detect the increase; an alarm alerts the team",
      responder: "a technician", response: "investigate and shut down equipment to prevent damage", physical_action: "are shut down by the technician to prevent damage", physical_tag: "equipment_shutdown", actor_entity: "the servers",
      servers: "some servers and AI applications", public_facing: true, dependents: "companies depending on the AI services", operations_effect: "may experience delays, lost sales or additional costs",
      failover: "another data center", audience: "users", customers: "customers and workers who use the services", customer_effect: "may experience disruption; wider economic effects are possible",
      regulator: "authorities (if essential services or critical infrastructure are affected)", repairer: "hardware suppliers",
    },
    downstream: ["perception", "behaviour", "digital", "network", "media", "business", "society", "government"],
    assumptions: ["no redundant cooling takes over", "the technician shuts the servers down before they overheat, so no hardware is damaged"], unknowns: ["how fast the temperature rises"],
    provenance: ILL, scope: "all", stage: { scene: "pump", hit: "pump" },
    guided: [
      { world: "physical", text: "The technician switches off a cooling pump. The temperature in the server room begins to rise." },
      { world: "perception", text: "Temperature sensors detect the increase, and an alarm alerts the operations team." },
      { world: "behaviour", text: "A technician decides to investigate and shut down equipment to prevent damage." },
      { world: "digital", text: "Some servers and AI applications shut down or become unavailable." },
      { world: "network", text: "Traffic is redirected to another data center, potentially increasing network load." },
      { world: "media", text: "Users report unavailable services, and news outlets may cover the outage." },
      { world: "business", text: "Companies depending on the AI services may experience delays, lost sales or additional costs." },
      { world: "society", text: "If widely used services are affected, customers and workers may experience disruption; wider economic effects are possible." },
      { world: "government", text: "Authorities may review the incident if essential public services or critical infrastructure are affected." },
    ],
  },

  /* ---- natural phenomena ---- */
  {
    id: "hurricane_landfall",
    say: {
      "earth.storm_damage": { change: "may be damaged by hurricane winds, storm surge and flooding" },
      "earth.evacuation": { change: "may evacuate inland or lose power, water and transport" },
    },
    trigger: { actor: "nature", channel: "article", source: "WEATHER SERVICE BULLETIN (fictional): a category 4 hurricane made landfall at 03:00 with storm surge and heavy rain." }, icon: "🌀",
    title: "A hurricane makes landfall on a coastal region",
    actor: "a hurricane", action: "makes landfall on", object: "a coastal region", context: "fictional region; strength stated by the bulletin",
    sentence: "A hurricane makes landfall on a coastal region with strong winds, storm surge and heavy rain.", world: "earth",
    seeds: [{ world: "earth", entity: "the coastal region", change: "hurricane landfall: strong winds, storm surge and heavy rain (stated)", tags: ["storm_landfall"] }],
    ctx: { exposed: "homes, power lines and roads", communities: "coastal residents", observers: "weather radar and residents", detection: "track the storm and its surge" },
    downstream: ["physical", "perception", "society"],
    assumptions: ["the region is populated"], unknowns: ["exact damage", "how many people evacuate"],
    provenance: ILL, stage: { scene: "storm" },
  },
  {
    id: "earthquake_city",
    say: {
      "earth.quake_damage": { change: "may crack or collapse under magnitude-6.8 shaking" },
      "earth.evacuation": { entity: "city residents", change: "may leave damaged buildings and lose access to services" },
    },
    trigger: { actor: "nature", channel: "sensor", source: "SEISMIC NETWORK ALERT (fictional): magnitude 6.8, depth 12 km, 30 km offshore, 04:17 local." }, icon: "🏚️",
    title: "An earthquake shakes a coastal city",
    actor: "an earthquake", action: "shakes", object: "a coastal city", context: "fictional city; magnitude stated by the alert",
    sentence: "An earthquake of magnitude 6.8 shakes a coastal city.", world: "earth",
    seeds: [{ world: "earth", entity: "the ground under the city", change: "shakes (magnitude 6.8, stated)", tags: ["ground_shaking"] }],
    ctx: { exposed: "older buildings and bridges", communities: "residents", observers: "the seismic network and residents", detection: "detect and locate the shaking" },
    downstream: ["physical", "perception", "society"],
    assumptions: ["the shaking is strong in the city"], unknowns: ["which structures fail", "aftershocks", "tsunami risk"],
    provenance: ILL, stage: { scene: "quake" },
  },
  {
    id: "solar_storm",
    trigger: { actor: "nature", channel: "sensor", source: "SPACE-WEATHER ALERT (fictional): coronal mass ejection arrived; strong (G4) geomagnetic storm in progress." }, icon: "☀️",
    title: "A strong solar storm hits Earth's magnetic field",
    actor: "the solar wind", action: "disturbs", object: "Earth's magnetic field", context: "a geomagnetic storm after a coronal mass ejection",
    sentence: "A strong solar storm disturbs Earth's magnetic field.", world: "earth",
    seeds: [{ world: "earth", entity: "Earth's magnetic field", change: "is disturbed by a burst of solar wind (geomagnetic storm)", tags: ["geomagnetic_storm"] }],
    ctx: { grid: "high-voltage grid transformers", observers: "space-weather monitors", detection: "measure the storm's strength" },
    downstream: ["network", "physical", "perception"],
    assumptions: ["the storm is strong enough to affect technology"], unknowns: ["which grids and satellites are exposed", "duration"],
    provenance: ILL, stage: { scene: "solar_storm" },
  },

  /* ---- physical scales: molecular, atomic, quantum (conceptual views; the effects are real physics) ---- */
  {
    id: "pipe_freeze", trigger: { actor: "nature", channel: "sensor", source: "BUILDING SENSOR (fictional): outdoor −12 °C overnight; pipe temperature 0 °C in the unheated basement." }, icon: "🧊",
    title: "Water freezes in a pipe during a cold snap",
    actor: "a cold snap", action: "freezes", object: "water in a pipe", context: "an unheated basement",
    sentence: "Water freezes in a pipe during a cold snap.", world: "physical", scale: "molecular",
    seeds: [{ world: "physical", scale: "molecular", entity: "water in the pipe", change: "freezes: its molecules lock into an ice lattice and expand about 9%", tags: ["freezing_expansion"] }],
    ctx: {},
    downstream: [],
    assumptions: ["the pipe is full and closed"], unknowns: ["when it thaws", "pipe material"],
    provenance: ILL, stage: { scene: "pipe_freeze" },
  },
  {
    id: "radioactive_scrap", trigger: { actor: "human", channel: "sensor", source: "RADIATION PORTAL (fictional): gamma dose rate 40× background on truck at the scrapyard gate." }, icon: "☢️",
    title: "A lost radioactive source is hidden in a truck of scrap metal",
    actor: "someone who discarded the source", action: "leaves", object: "a cesium-137 source in scrap metal", context: "a scrapyard with a radiation portal",
    sentence: "A lost radioactive source is hidden in a truck of scrap metal.", world: "physical", scale: "atomic",
    seeds: [{ world: "physical", scale: "atomic", entity: "a cesium-137 source", change: "its atoms decay and emit gamma radiation", tags: ["radiation"] }],
    ctx: { observers: "the scrapyard's radiation portal and staff", detection: "may detect elevated gamma radiation (portal alarm)" },
    downstream: ["perception"],
    assumptions: ["the portal works"], unknowns: ["the source's activity", "who discarded it"],
    provenance: ILL, stage: { scene: "scrap_portal" },
  },
  {
    id: "cosmic_bit_flip",
    say: { "phys.bit_flip": { entity: "the program using that memory", change: "may crash or compute a wrong result from the flipped bit" } },
    trigger: { actor: "nature", channel: "sensor", source: "SERVER LOG (fictional): uncorrected memory error at bank 2; process 4411 terminated." }, icon: "〰️",
    title: "A cosmic-ray particle flips a bit in a server's memory",
    actor: "a cosmic-ray particle", action: "flips", object: "one bit in server memory", context: "memory without error correction",
    sentence: "A cosmic-ray particle flips a bit in a server's memory.", world: "physical", scale: "quantum",
    seeds: [{ world: "physical", scale: "quantum", entity: "a memory cell", change: "a high-energy particle deposits charge and flips one bit (single-event upset)", tags: ["bit_flip"] }],
    ctx: { ecc_memory: false },
    downstream: ["digital"],
    assumptions: ["the memory has no error-correcting code"], unknowns: ["which value the bit belonged to"],
    provenance: ILL, stage: { scene: "bit_flip" },
  },

  /* ---- an animal actor ---- */
  {
    id: "cat_teacup", trigger: { actor: "animal", channel: "image", source: "Pet camera image (fictional): the cat pushes the tea cup off the table." }, icon: "🐈",
    title: "A cat pushes a tea cup off the table",
    actor: "a cat", action: "pushes", object: "a tea cup", context: "a living room; the owner is in the kitchen",
    sentence: "The cat pushed the tea cup off the table.", world: "physical", scale: "human",
    seeds: [{ world: "physical", scale: "human", entity: "the tea cup", change: "is pushed off the table by the cat, falls and shatters", tags: ["glass_breaks", "impact"] }],
    ctx: { observers: "the owner, in the kitchen", detection: "may hear the crash" },
    downstream: ["perception"],
    assumptions: ["porcelain breaks on a tiled floor"], unknowns: ["why the cat did it (animals state no goal)"],
    provenance: ILL, missionId: "cat_cup", stage: { scene: "cup" },
  },

  /* ---- people: human behaviour ---- */
  {
    id: "mark_iphone_gift",
    say: {
      "beh.reaction": { entity: "Cathy", change: "may be surprised and pleased by the gift" },
      "beh.sale": { entity: "the phone shop", change: "sells one more iPhone" },
      "beh.budget": { entity: "Mark and Cathy's household budget", change: "about €900 less this month (assumed price)" },
      "beh.device": { entity: "Cathy's phone account", change: "the new iPhone is registered and her data may be transferred to it" },
    },
    trigger: { actor: "human", channel: "chat", source: "Mark (typed): I bought an iPhone for my wife Cathy's birthday." }, icon: "🎁",
    title: "Mark buys an iPhone for his wife Cathy",
    actor: "Mark", action: "buys", object: "an iPhone as a gift for Cathy", context: "Cathy's birthday; price assumed",
    sentence: "Mark buys an iPhone for his wife Cathy.", world: "behaviour",
    seeds: [{ world: "behaviour", entity: "Mark", change: "buys an iPhone as a birthday gift for his wife Cathy", tags: ["purchase", "gift_given"] }],
    ctx: { recipient: "Cathy", seller: "the phone shop", payer: "Mark and Cathy's household budget", device: true, device_account: "Cathy's phone account" },
    downstream: ["business", "society", "digital"],
    assumptions: ["Cathy wanted a new phone", "price about €900"], unknowns: ["how Cathy actually feels about it"],
    provenance: ILL,
    stage: { scene: "gift", behaviour: { actor: "Mark", goal: "make Cathy happy on her birthday", choices: ["flowers and dinner", "buy an iPhone", "a trip together"], chosen: 1 } },
  },
  {
    id: "lina_resigns",
    say: {
      "beh.reaction": { entity: "Lina's manager", change: "may be surprised and ask what would make her stay" },
      "beh.staffing": { entity: "Lina's team at work", change: "may have to hire a replacement and share out her projects during her notice period" },
    },
    trigger: { actor: "human", channel: "email", source: "From: lina@company.example\nTo: her manager\nSubject: My resignation\n\nI am resigning from my position; my last day will be in one month." }, icon: "✉️",
    title: "Lina tells her manager she is resigning",
    actor: "Lina", action: "tells", object: "her manager she is resigning", context: "one month's notice",
    sentence: "Lina tells her manager she is resigning.", world: "behaviour",
    seeds: [{ world: "behaviour", entity: "Lina", change: "tells her manager she is resigning, with one month's notice", tags: ["resignation_announced"] }],
    ctx: { recipient: "Lina's manager", employer: "Lina's team at work" },
    downstream: ["business"],
    assumptions: ["she has decided"], unknowns: ["why she is leaving", "whether she can be persuaded to stay"],
    provenance: ILL,
    stage: { scene: "resignation", behaviour: { actor: "Lina", goal: "a better job elsewhere", choices: ["stay and ask for a raise", "resign", "ask for a transfer"], chosen: 1 } },
  },
  {
    id: "julie_cycles",
    say: {
      "beh.act": { entity: "Julie's commute", change: "is now 6 km by bike instead of by car" },
      "beh.budget": { entity: "Julie's monthly budget", change: "fuel and parking costs may fall" },
      "beh.commute_emissions": { entity: "Julie's commute emissions", change: "may fall to almost nothing for those trips" },
    },
    trigger: { actor: "human", channel: "chat", source: "Julie (typed): From Monday I'll cycle to work instead of driving." }, icon: "🚲",
    title: "Julie decides to cycle to work instead of driving",
    actor: "Julie", action: "decides to cycle", object: "to work instead of driving", context: "a 6 km commute (assumed)",
    sentence: "Julie decides to cycle to work instead of driving.", world: "behaviour",
    seeds: [{ world: "behaviour", entity: "Julie", change: "decides to cycle to work instead of driving", tags: ["decision_to_act", "travel_change"] }],
    ctx: { physical_action: "cycles to work", physical_tag: "movement", actor_entity: "Julie", payer: "Julie's monthly budget", replaces_car: true },
    downstream: ["physical", "society", "earth"],
    assumptions: ["she keeps it up", "the bike replaces car trips"], unknowns: ["weather", "whether she still drives some days"],
    provenance: ILL,
    stage: { scene: "cycling", behaviour: { actor: "Julie", goal: "a cheaper, healthier commute", choices: ["keep driving", "cycle to work", "take the bus"], chosen: 1 } },
  },
];

/** All scenarios sorted top-down: Earth-level events first, physical events last (human → molecular → atomic → quantum). */
const SCALE_ORDER: Scale[] = ["human", "molecular", "atomic", "quantum"];
export const CATALOG: Scenario[] = RAW.map((s, i) => ({ s, i }))
  .sort((a, b) => TOP_IDS.indexOf(a.s.world) - TOP_IDS.indexOf(b.s.world)
    || SCALE_ORDER.indexOf(a.s.scale ?? "human") - SCALE_ORDER.indexOf(b.s.scale ?? "human")
    || a.i - b.i)
  .map((x) => x.s);

export const scenarioById = (id: string) => CATALOG.find((s) => s.id === id) ?? null;

/** Context for a run: the scenario's facts with the chosen pathway's on top. */
export function scenarioCtx(s: Scenario, pathway?: string | null): Ctx {
  if (pathway === "none") {
    // "not specified": every pathway fact is removed, so pathway rules return UNKNOWN
    const cleared: Ctx = { ...s.ctx };
    s.pathways?.forEach((p) => Object.keys(p.ctx).forEach((k) => (cleared[k] = undefined)));
    return cleared;
  }
  const p = s.pathways?.find((x) => x.id === pathway);
  return { ...s.ctx, ...(p?.ctx ?? {}) };
}

/** Physical subworld examples: conceptual, never engine results. */
export const SCALE_EXAMPLES: Record<Scale, { title: string; text: string }> = {
  human: { title: "A ball strikes a window", text: "People, objects, materials, locations, motion and forces. The 2D physics lab (E3) simulates pushes, flicks and drops with matter.js." },
  molecular: { title: "Water molecules (H₂O)", text: "Conceptual: each water molecule is one oxygen and two hydrogen atoms, held to neighbours by hydrogen bonds. Not simulated." },
  atomic: { title: "Atoms arranged in a material", text: "Educational: atoms in a regular lattice, each a nucleus with electrons around it. Sizes and spacing are not to scale. Not simulated." },
  quantum: { title: "A probability distribution", text: "Conceptual: quantum mechanics gives probabilities of finding a particle, here a 1D wave-function density |ψ(x)|². It is not an orbit and not a picture of a particle. Not simulated." },
};
