/**
 * The prototype cascade's world connections and rules (see cascade.ts).
 *
 * CONNECTIONS are candidate relationships, configurable, not the visual stack's adjacency: any
 * world can reach any other. RULES say when a connection actually produces a possible effect.
 * They are authored for this demo, unvalidated, and never produce a probability. Wording is "may":
 * every produced effect is a possibility under the rule's conditions, not a prediction that it
 * will happen. Context keys (ctx.*) are facts a scenario or user states; a rule whose fact is
 * missing returns UNKNOWN rather than guessing.
 */

import type { Connection, Ctx, Rule } from "./cascade";
import type { TopWorldId } from "./worlds";

const pairs: [TopWorldId, TopWorldId[]][] = [
  ["physical", ["physical", "perception", "digital", "business", "society", "earth"]],
  ["perception", ["behaviour"]],
  ["behaviour", ["behaviour", "physical", "business", "society", "digital", "earth"]],
  ["digital", ["business", "network", "media", "government"]],
  ["network", ["digital", "business", "media", "society"]],
  ["media", ["behaviour", "society", "business", "government"]],
  ["business", ["business", "society", "government", "media", "earth", "digital"]],
  ["society", ["behaviour", "business", "government", "media"]],
  ["government", ["business", "society", "media", "earth"]],
  ["earth", ["earth", "physical", "perception", "network", "business", "society", "government", "media"]],
];
export const CONNECTIONS: Connection[] = pairs.flatMap(([from, tos]) => tos.map((to) => ({ from, to })));

const s = (ctx: Ctx, k: string, fallback: string) => (typeof ctx[k] === "string" && ctx[k] ? (ctx[k] as string) : fallback);

export const RULES: Rule[] = [
  /* ---- physical ---- */
  {
    id: "phys.supply_loss", from: "physical", to: "physical", whenAny: ["equipment_damage"], needs: ["powers"],
    mechanism: "damaged electrical equipment can no longer supply what depends on it",
    make: (_e, c) => ({ entity: s(c, "powers", ""), change: "may lose power or cooling", tags: ["power_loss"] }),
  },
  {
    id: "phys.backup_start", from: "physical", to: "physical", whenAny: ["power_loss"], only: { backup_generators: true },
    mechanism: "a site with backup generators starts them when grid power is lost",
    make: () => ({ entity: "backup generators", change: "may start and burn fuel", tags: ["backup_generation"], assumptions: ["the site has working backup generators"] }),
  },
  {
    id: "phys.overheat", from: "physical", to: "physical", whenAny: ["temperature_rise"], only: { overheat_risk: true },
    mechanism: "hardware above its rated temperature can be damaged if not shut down in time",
    make: () => ({ entity: "server hardware", change: "may overheat and be damaged if not shut down in time", tags: ["equipment_damage"] }),
  },
  {
    id: "phys.freeze_burst", from: "physical", to: "physical", whenAny: ["freezing_expansion"],
    mechanism: "water expands by about 9% as its molecules lock into an ice lattice; a closed pipe cannot stretch that much",
    make: () => ({ entity: "the pipe", change: "may crack and leak when it thaws", tags: ["pipe_burst"], scale: "human" }),
  },
  {
    id: "phys.bit_flip", from: "physical", to: "digital", whenAny: ["bit_flip"], only: { ecc_memory: false },
    mechanism: "a flipped bit that no error-correcting code repairs changes a stored value",
    make: () => ({ entity: "a running program", change: "may crash or compute a wrong result", tags: ["service_disrupted"], unknowns: ["which value the bit belonged to"] }),
  },
  {
    id: "phys.detectable", from: "physical", to: "perception", whenAny: ["impact", "equipment_damage", "temperature_rise", "glass_breaks", "vehicle_on_closed_road", "visible_hazard", "pipe_burst", "radiation", "structural_damage"], needs: ["observers"],
    mechanism: "a physical change produces light, sound or sensor signals that observers present can detect",
    make: (_e, c) => ({ entity: s(c, "observers", ""), change: s(c, "detection", "may see, hear or detect it"), tags: ["detected"] }),
  },
  {
    id: "phys.servers_down", from: "physical", to: "digital", whenAny: ["power_loss", "equipment_shutdown"], needs: ["servers"],
    mechanism: "servers without power or cooling stop, or are stopped to protect them",
    make: (_e, c) => ({ entity: s(c, "servers", ""), change: "may shut down or become unavailable", tags: c.public_facing ? ["service_disrupted", "public_facing"] : ["service_disrupted"], assumptions: c.failover_capacity ? [] : ["no automatic failover keeps every service up"] }),
  },
  {
    id: "phys.repair", from: "physical", to: "business", whenAny: ["glass_breaks", "equipment_damage", "pipe_burst", "structural_damage"], needs: ["repairer"],
    mechanism: "damaged property is usually repaired or replaced by a supplier",
    make: (_e, c) => ({ entity: s(c, "repairer", ""), change: "may be contacted for a repair or replacement", tags: ["repair_job"] }),
  },
  {
    id: "phys.liability", from: "physical", to: "society", whenAny: ["glass_breaks"], needs: ["owner"],
    mechanism: "damage to someone else's property raises the question of responsibility",
    make: (_e, c) => ({ entity: s(c, "owner", ""), change: "responsibility for the damage may be discussed (who pays)", tags: ["liability_question"] }),
  },
  {
    id: "phys.incident_response", from: "physical", to: "society", whenAny: ["vehicle_on_closed_road"], needs: ["incident"],
    mechanism: "emergency services are called when an incident occurs",
    make: () => ({ entity: "emergency services", change: "may be called if an incident occurs", tags: ["emergency_call"] }),
  },
  {
    id: "phys.backup_emissions", from: "physical", to: "earth", whenAny: ["backup_generation"],
    mechanism: "burning diesel or gas in generators emits CO₂ and air pollutants",
    make: () => ({ entity: "local air & climate", change: "generator fuel burn may add emissions", tags: ["emissions_up"] }),
  },
  {
    id: "phys.replacement_resources", from: "physical", to: "earth", whenAny: ["equipment_damage"],
    mechanism: "replacing equipment uses materials and manufacturing energy; damaged parts become waste",
    make: () => ({ entity: "materials & waste", change: "replacement equipment may require new materials; damaged parts become waste", tags: ["resource_use"] }),
  },

  /* ---- perception ---- */
  {
    id: "perc.response", from: "perception", to: "behaviour", whenAny: ["detected"], needs: ["responder", "response"],
    mechanism: "a detected signal can lead someone to decide to act",
    make: (_e, c) => ({ entity: s(c, "responder", ""), change: `may decide to ${s(c, "response", "")}`, tags: ["decision_to_act"], unknowns: ["what the person actually thinks or decides"] }),
  },

  /* ---- behaviour ---- */
  {
    id: "beh.act", from: "behaviour", to: "physical", whenAny: ["decision_to_act"], needs: ["physical_action"],
    mechanism: "a decision is carried out as a physical action",
    make: (_e, c) => ({ entity: s(c, "actor_entity", s(c, "responder", "the actor")), change: s(c, "physical_action", ""), tags: [s(c, "physical_tag", "movement")], scale: "human" }),
  },
  {
    id: "beh.alert_others", from: "behaviour", to: "society", whenAny: ["decision_to_act"], needs: ["others_present"],
    mechanism: "one person's response can alert others and emergency services",
    make: (_e, c) => ({ entity: s(c, "others_present", ""), change: "may respond too, or alert emergency services", tags: ["emergency_alert"] }),
  },
  {
    id: "beh.reaction", from: "behaviour", to: "behaviour", whenAny: ["gift_given", "resignation_announced", "apology_made"], needs: ["recipient"],
    mechanism: "an act aimed at a person usually draws a reaction from that person",
    make: (_e, c) => ({ entity: s(c, "recipient", ""), change: "may react to it", tags: ["reaction"], unknowns: ["what the person actually feels"] }),
  },
  {
    id: "beh.sale", from: "behaviour", to: "business", whenAny: ["purchase"], needs: ["seller"],
    mechanism: "a purchase is a sale for the seller",
    make: (_e, c) => ({ entity: s(c, "seller", ""), change: "makes a sale", tags: ["sale_made"] }),
  },
  {
    id: "beh.budget", from: "behaviour", to: "society", whenAny: ["purchase", "travel_change"], needs: ["payer"],
    mechanism: "spending choices change a household's budget",
    make: (_e, c) => ({ entity: s(c, "payer", ""), change: "spending changes", tags: ["budget_change"] }),
  },
  {
    id: "beh.device", from: "behaviour", to: "digital", whenAny: ["purchase"], only: { device: true },
    mechanism: "a new connected device is registered and set up on an account",
    make: (_e, c) => ({ entity: s(c, "device_account", "an account"), change: "a new device is set up on it", tags: ["device_setup"] }),
  },
  {
    id: "beh.staffing", from: "behaviour", to: "business", whenAny: ["resignation_announced"], needs: ["employer"],
    mechanism: "a resignation leaves a role to fill and work to hand over",
    make: (_e, c) => ({ entity: s(c, "employer", ""), change: "may need to hire a replacement and hand over the work", tags: ["staffing_gap"] }),
  },
  {
    id: "beh.commute_emissions", from: "behaviour", to: "earth", whenAny: ["travel_change"], only: { replaces_car: true },
    mechanism: "replacing car trips with cycling removes the car's fuel burn for those trips",
    make: () => ({ entity: "commute emissions", change: "may fall", tags: ["emissions_down"] }),
  },
  {
    id: "beh.switch_provider", from: "behaviour", to: "business", whenAny: ["customer_concern"], needs: ["alternatives"],
    mechanism: "concerned customers with alternatives may move to another provider",
    make: (_e, c) => ({ entity: s(c, "provider", "the provider"), change: "some customers may decide to leave", tags: ["customers_leave"] }),
  },

  /* ---- digital ---- */
  {
    id: "dig.operations", from: "digital", to: "business", whenAny: ["service_disrupted", "system_compromised"], needs: ["dependents"],
    mechanism: "organisations that depend on a system are affected when it is disrupted",
    make: (_e, c) => ({ entity: s(c, "dependents", ""), change: s(c, "operations_effect", "may face delays, lost sales or additional costs"), tags: ["operations_disrupted"] }),
  },
  {
    id: "dig.reroute", from: "digital", to: "network", whenAny: ["service_disrupted"], needs: ["failover"],
    mechanism: "traffic for an unavailable site is redirected to another site or link",
    make: (_e, c) => ({ entity: s(c, "failover", ""), change: "traffic may be redirected here, increasing network load", tags: ["traffic_rerouted"] }),
  },
  {
    id: "dig.public_reports", from: "digital", to: "media", whenAny: ["public_facing"],
    mechanism: "a disruption users can see tends to be reported by users and, if large, by news outlets",
    make: () => ({ entity: "users & news outlets", change: "may report and discuss the incident", tags: ["public_coverage"], unknowns: ["how widely it is covered"] }),
  },
  {
    id: "dig.regulator", from: "digital", to: "government", whenAny: ["system_compromised"], needs: ["regulator"],
    mechanism: "a security incident in a regulated sector can trigger a regulatory review",
    make: (_e, c) => ({ entity: s(c, "regulator", ""), change: "may investigate, depending on the incident and jurisdiction", tags: ["regulatory_review"] }),
  },

  /* ---- network ---- */
  {
    id: "net.services", from: "network", to: "digital", whenAny: ["route_down"], needs: ["services"],
    mechanism: "services that use a broken route slow down or fail until traffic is rerouted",
    make: (_e, c) => ({ entity: s(c, "services", ""), change: "may slow down or become unavailable", tags: ["service_disrupted", "public_facing"] }),
  },
  {
    id: "net.operations", from: "network", to: "business", whenAny: ["route_down"], needs: ["dependents"],
    mechanism: "companies relying on the connection lose or degrade it",
    make: (_e, c) => ({ entity: s(c, "dependents", ""), change: s(c, "operations_effect", "may face interruptions"), tags: ["operations_disrupted"] }),
  },
  {
    id: "net.public", from: "network", to: "media", whenAny: ["route_down"],
    mechanism: "an outage users notice is discussed online and may be covered",
    make: () => ({ entity: "users & news outlets", change: "may report and discuss the incident", tags: ["public_coverage"] }),
  },
  {
    id: "net.access", from: "network", to: "society", whenAny: ["route_down"], needs: ["communities"],
    mechanism: "people who reach services through the route may lose access",
    make: (_e, c) => ({ entity: s(c, "communities", ""), change: "access to online services may be affected", tags: ["service_access_lost"] }),
  },

  /* ---- media ---- */
  {
    id: "med.concern", from: "media", to: "behaviour", whenAny: ["public_coverage"], needs: ["audience"],
    mechanism: "coverage reaches an audience, some of whom may react",
    make: (_e, c) => ({ entity: s(c, "audience", ""), change: "some may become concerned", tags: ["customer_concern"], unknowns: ["how many people see it and how they react"] }),
  },
  {
    id: "med.trust", from: "media", to: "society", whenAny: ["trust_topic"], needs: ["trust_subject"],
    mechanism: "coverage about an institution's reliability can affect public trust in it",
    make: (_e, c) => ({ entity: s(c, "trust_subject", ""), change: "public trust may be affected", tags: ["trust_affected"] }),
  },
  {
    id: "med.correction", from: "media", to: "business", whenAny: ["incorrect_report"], needs: ["subject"],
    mechanism: "an organisation named in an incorrect report usually responds publicly",
    make: (_e, c) => ({ entity: s(c, "subject", ""), change: "may issue a correction or statement", tags: ["correction_issued"] }),
  },
  {
    id: "med.regulator", from: "media", to: "government", whenAny: ["regulated_subject"], needs: ["regulator"],
    mechanism: "public reports about a regulated entity can prompt a regulator to look at it",
    make: (_e, c) => ({ entity: s(c, "regulator", ""), change: "may review the situation if warranted", tags: ["regulatory_review"] }),
  },

  /* ---- business ---- */
  {
    id: "bus.delays", from: "business", to: "business", whenAny: ["production_stopped"],
    mechanism: "stopped production delays orders and adds costs",
    make: (_e, c) => ({ entity: s(c, "operator", "the company"), change: "orders may be delayed and costs rise", tags: ["delays_costs"] }),
  },
  {
    id: "bus.customers", from: "business", to: "society", whenAny: ["operations_disrupted", "production_stopped"], needs: ["customers"],
    mechanism: "people served by a disrupted organisation are affected",
    make: (_e, c) => ({ entity: s(c, "customers", ""), change: s(c, "customer_effect", "may temporarily lose access to services"), tags: ["service_access_lost"] }),
  },
  {
    id: "bus.market", from: "business", to: "society", whenAny: ["operations_disrupted"], only: { listed_company: true },
    mechanism: "investors may reprice a listed company after a disruption (not guaranteed)",
    make: (_e, c) => ({ entity: `${s(c, "provider", "the company")}'s shares`, change: "the share price may move; a market reaction is possible, not guaranteed", tags: ["market_reaction"] }),
  },
  {
    id: "bus.regulator", from: "business", to: "government", whenAny: ["operations_disrupted"], needs: ["regulator"],
    mechanism: "a disruption at a regulated or critical service can be reviewed by authorities",
    make: (_e, c) => ({ entity: s(c, "regulator", ""), change: "may investigate, depending on the incident and jurisdiction", tags: ["regulatory_review"] }),
  },
  {
    id: "bus.coverage", from: "business", to: "media", whenAny: ["production_stopped", "operations_disrupted"], only: { major: true },
    mechanism: "a major disruption can receive news coverage",
    make: () => ({ entity: "news outlets", change: "may cover the disruption", tags: ["public_coverage"] }),
  },
  {
    id: "bus.shortage_record", from: "business", to: "digital", whenAny: ["production_stopped"], needs: ["order_system"],
    mechanism: "inventory and order systems record missing parts and delayed orders",
    make: (_e, c) => ({ entity: s(c, "order_system", ""), change: "may record the shortage and delayed orders", tags: ["shortage_recorded"] }),
  },
  {
    id: "bus.jobs_prices", from: "business", to: "society", whenAny: ["datacenter_investment"],
    mechanism: "a large facility creates construction and operating jobs and adds load to the local grid",
    make: () => ({ entity: "the region", change: "jobs may be created; household electricity prices may change depending on grid capacity", tags: ["jobs_prices"], unknowns: ["the size and direction of any price change"] }),
  },
  {
    id: "bus.fossil_emissions", from: "business", to: "earth", whenAny: ["fossil_generation_up"],
    mechanism: "more fossil-fuel generation burns more fuel",
    make: () => ({ entity: "the atmosphere", change: "greenhouse-gas emissions may increase", tags: ["emissions_up"] }),
  },
  {
    id: "bus.lowcarbon_land", from: "business", to: "earth", whenAny: ["low_carbon_investment"],
    mechanism: "new generation and grid infrastructure use land and water and change the emissions mix",
    make: () => ({ entity: "land, water & emissions", change: "long-term effects on land use, water use and emissions, depending on the projects", tags: ["land_water_change"], unknowns: ["which projects, where, and when they are built"] }),
  },

  /* ---- society ---- */
  {
    id: "soc.households", from: "society", to: "behaviour", whenAny: ["price_rise"], needs: ["households"],
    mechanism: "higher prices lead some households to cut use",
    make: (_e, c) => ({ entity: s(c, "households", ""), change: "may reduce electricity use", tags: ["usage_reduced"] }),
  },
  {
    id: "soc.costs", from: "society", to: "business", whenAny: ["price_rise"], needs: ["businesses"],
    mechanism: "input prices feed into operating costs",
    make: (_e, c) => ({ entity: s(c, "businesses", ""), change: "operating costs may increase", tags: ["costs_up"] }),
  },
  {
    id: "soc.policy", from: "society", to: "government", whenAny: ["price_rise", "community_impacts"], needs: ["policymakers"],
    mechanism: "a visible public problem can lead policymakers to consider a response",
    make: (_e, c) => ({ entity: s(c, "policymakers", ""), change: "may consider a response (no decision implied)", tags: ["policy_response"] }),
  },
  {
    id: "soc.coverage", from: "society", to: "media", whenAny: ["price_rise"], only: { public_debate: true },
    mechanism: "a widely felt issue receives news coverage",
    make: () => ({ entity: "news outlets", change: "may cover the issue", tags: ["public_coverage"] }),
  },
  {
    id: "soc.trust_concern", from: "society", to: "behaviour", whenAny: ["trust_affected"], needs: ["audience"],
    mechanism: "lower trust can make people worried about their own exposure",
    make: (_e, c) => ({ entity: s(c, "audience", ""), change: "some may become concerned", tags: ["customer_concern"] }),
  },

  /* ---- government ---- */
  {
    id: "gov.compliance", from: "government", to: "business", whenAny: ["policy_proposed"], needs: ["regulated_parties"],
    mechanism: "a proposed rule, if adopted, creates obligations for the organisations it covers",
    make: (_e, c) => ({ entity: s(c, "regulated_parties", ""), change: "may face reporting requirements and compliance costs if the policy is adopted", tags: ["compliance_costs"] }),
  },
  {
    id: "gov.debate", from: "government", to: "society", whenAny: ["policy_proposed"], needs: ["public_topic"],
    mechanism: "a policy proposal opens public discussion of its subject",
    make: (_e, c) => ({ entity: "the public", change: `may discuss ${s(c, "public_topic", "")}`, tags: ["public_discussion"] }),
  },
  {
    id: "gov.coverage", from: "government", to: "media", whenAny: ["policy_proposed"], only: { public_debate: true },
    mechanism: "policy proposals are covered and debated",
    make: () => ({ entity: "news outlets & social media", change: "may cover and debate the proposal", tags: ["public_coverage"] }),
  },
  {
    id: "gov.resources", from: "government", to: "earth", whenAny: ["policy_proposed"], needs: ["policy_final"],
    mechanism: "an adopted policy can change how resources are managed",
    make: () => ({ entity: "electricity & water resources", change: "resource management may change, depending on the final policy", tags: ["resource_management"] }),
  },

  /* ---- earth ---- */
  {
    id: "earth.quake_damage", from: "earth", to: "physical", whenAny: ["ground_shaking"], needs: ["exposed"],
    mechanism: "strong ground shaking loads structures beyond what weaker ones can carry",
    make: (_e, c) => ({ entity: s(c, "exposed", ""), change: "may be damaged by the shaking", tags: ["structural_damage"], scale: "human", unknowns: ["which structures fail"] }),
  },
  {
    id: "earth.storm_damage", from: "earth", to: "physical", whenAny: ["storm_landfall"], needs: ["exposed"],
    mechanism: "hurricane winds, storm surge and rain damage what they reach",
    make: (_e, c) => ({ entity: s(c, "exposed", ""), change: "may be damaged by wind and flooding", tags: ["structural_damage"], scale: "human" }),
  },
  {
    id: "earth.grid_stress", from: "earth", to: "physical", whenAny: ["geomagnetic_storm"], needs: ["grid"],
    mechanism: "a disturbed magnetic field induces currents in long conductors such as power lines",
    make: (_e, c) => ({ entity: s(c, "grid", ""), change: "induced currents may stress or trip them", tags: ["grid_stress"], scale: "human", unknowns: ["whether any transformer is actually damaged"] }),
  },
  {
    id: "earth.space_weather_links", from: "earth", to: "network", whenAny: ["geomagnetic_storm"],
    mechanism: "a geomagnetic storm disturbs the upper atmosphere that satellite, GPS and HF radio signals cross",
    make: () => ({ entity: "satellite links, GPS and HF radio", change: "may be degraded or interrupted", tags: ["route_down"] }),
  },
  {
    id: "earth.monitored", from: "earth", to: "perception", whenAny: ["ground_shaking", "storm_landfall", "geomagnetic_storm"], needs: ["observers"],
    mechanism: "monitoring networks and people present register the event",
    make: (_e, c) => ({ entity: s(c, "observers", ""), change: s(c, "detection", "detect it"), tags: ["detected"] }),
  },
  {
    id: "earth.evacuation", from: "earth", to: "society", whenAny: ["ground_shaking", "storm_landfall"], needs: ["communities"],
    mechanism: "people in the affected area may evacuate or lose access to services",
    make: (_e, c) => ({ entity: s(c, "communities", ""), change: "may evacuate or lose access to services", tags: ["service_access_lost"] }),
  },
  {
    id: "earth.water", from: "earth", to: "earth", whenAny: ["electricity_demand_up"], only: { water_cooling: true },
    mechanism: "water-cooled facilities draw on local water",
    make: () => ({ entity: "local water", change: "water use for cooling may increase", tags: ["water_use"] }),
  },
  {
    id: "earth.fossil", from: "earth", to: "business", whenAny: ["electricity_demand_up"], only: { energy_pathway: "fossil" },
    mechanism: "PATHWAY A (conditional): extra demand is met by running more fossil-fuel plants",
    make: () => ({ entity: "energy providers", change: "fossil-fuel generation may increase", tags: ["fossil_generation_up"], assumptions: ["spare fossil capacity exists and is dispatched first"] }),
  },
  {
    id: "earth.lowcarbon", from: "earth", to: "business", whenAny: ["electricity_demand_up"], only: { energy_pathway: "low_carbon" },
    mechanism: "PATHWAY B (conditional): providers or governments invest in nuclear and/or renewable generation and grid",
    make: () => ({ entity: "energy providers & governments", change: "may invest in nuclear and/or renewable generation and grid infrastructure (multi-year timelines)", tags: ["low_carbon_investment"], assumptions: ["investment is decided; projects take years; not immediate capacity"] }),
  },
  {
    id: "earth.community", from: "earth", to: "society", whenAny: ["emissions_up"], needs: ["communities"],
    mechanism: "emissions affect air quality and the climate people live in",
    make: (_e, c) => ({ entity: s(c, "communities", ""), change: "possible air-quality and climate impacts", tags: ["community_impacts"] }),
  },
  {
    id: "earth.planning", from: "earth", to: "government", whenAny: ["electricity_demand_up"], needs: ["planning_authority"],
    mechanism: "large new demand goes through grid planning and permitting",
    make: (_e, c) => ({ entity: s(c, "planning_authority", ""), change: "energy policy, permitting or grid planning may be reviewed", tags: ["policy_review"] }),
  },
  {
    id: "earth.debate", from: "earth", to: "media", whenAny: ["electricity_demand_up"], only: { public_debate: true },
    mechanism: "the energy use of AI is a public topic",
    make: () => ({ entity: "news outlets & social media", change: "may discuss AI and energy demand", tags: ["public_coverage"] }),
  },
];
