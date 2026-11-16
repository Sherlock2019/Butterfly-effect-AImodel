/**
 * Authored consequences per scenario and per world: what this specific action may lead to in a world,
 * shown when that world is part of the run (lit by default, or switched on with ENABLE).
 *
 * ILLUSTRATIVE · authored: written by hand for each scenario, unvalidated, worded with "may", never
 * a probability. They fill in what the generic prototype rules (rules.ts) cannot say about one
 * situation (e.g. Lina's salary stopping, or Lina and her husband cancelling a holiday). Each one names
 * the step it follows (`after`: a world whose consequence it builds on; otherwise the action itself).
 * Worlds with no believable consequence are left out on purpose: they keep saying "No consequence found".
 * Not authored for lightning and the cooling pump: their rule cascades already reach every world they affect.
 */

import type { Cascade, CEffect, Evaluation } from "./cascade";
import type { Scenario } from "./catalog";
import type { TopWorldId } from "./worlds";

export interface Authored { world: TopWorldId; entity: string; change: string; why: string; after?: TopWorldId }
const A = (world: TopWorldId, entity: string, change: string, why: string, after?: TopWorldId): Authored => ({ world, entity, change, why, after });

export const IF_ENABLED: Record<string, Authored[]> = {
  ai_datacenter_energy: [
    A("network", "the region's fibre backbone", "may need new high-capacity links to the campus", "a large data center connects to long-distance fibre"),
    A("digital", "AI services hosted in the region", "may gain capacity and lower latency for nearby users", "new compute capacity comes online"),
    A("perception", "residents near the site", "may notice construction traffic, new power lines and the hum of cooling fans", "a large build is visible and audible"),
    A("physical", "the campus cooling plant", "may draw water and release heat into the air around the site", "data-center cooling moves heat outside"),
  ],
  hurricane_landfall: [
    A("government", "emergency services and the regional government", "may open shelters and order evacuations of low-lying areas", "authorities act before and during landfall"),
    A("business", "ports, shops and hotels on the coast", "may close for days; deliveries may be delayed", "wind, surge and closures stop trade", "physical"),
    A("media", "weather channels and news sites", "may run live coverage of the landfall", "major storms draw continuous coverage"),
    A("network", "mobile masts and telecom sites", "may go offline where power is cut or masts are damaged", "telecom sites need power and intact masts", "physical"),
    A("digital", "online services hosted near the coast", "may switch to backup data centers if local power is lost", "operators fail over when a site loses power", "network"),
    A("behaviour", "coastal residents", "may board up windows, stock water and leave if told to", "people prepare when a hurricane is forecast", "government"),
  ],
  earthquake_city: [
    A("government", "civil protection and rescue teams", "may search damaged buildings and set up emergency shelters", "rescue follows building damage", "physical"),
    A("business", "shops and factories in the city", "may close for inspections; some may not reopen for weeks", "damaged premises must be checked before reopening", "physical"),
    A("media", "news channels and social media", "may share footage of damaged buildings and rescue work", "a strong quake is major news"),
    A("network", "the city's mobile networks", "may be overloaded as everyone calls family at once", "call volume spikes after a disaster"),
    A("digital", "early-warning and emergency apps", "may push alerts and aftershock warnings", "alert systems react to detected shaking", "perception"),
    A("behaviour", "people in the city", "may sleep outside or with relatives for fear of aftershocks", "fear of aftershocks changes where people sleep"),
  ],
  solar_storm: [
    A("government", "grid operators and civil-protection agencies", "may issue warnings and switch to storm procedures", "space-weather alerts trigger procedures", "perception"),
    A("society", "airlines and shipping that rely on HF radio and GPS", "may reroute polar flights or navigate more cautiously", "degraded radio and GPS affect long routes", "network"),
    A("business", "satellite operators", "may put some satellites into safe mode until the storm passes", "operators protect spacecraft during strong storms"),
    A("digital", "GPS-timed systems such as payments and mobile networks", "may fall back to backup clocks", "many systems take their time signal from GPS", "network"),
    A("behaviour", "skywatchers", "may travel to dark places to see the aurora", "strong storms push auroras toward lower latitudes"),
  ],
  datacenter_disclosure_policy: [
    A("earth", "regional water and power planners", "could use the published figures to plan supply, if adopted", "published data informs resource planning"),
    A("digital", "operators' metering and reporting software", "may need upgrades to measure and publish use, if adopted", "disclosure needs measured, reportable data", "business"),
    A("perception", "the public", "would see each large data center's power and water use, if adopted", "disclosure makes resource use visible"),
    A("physical", "data-center meters and flow sensors", "may be installed or upgraded to measure electricity and water", "you cannot disclose what you do not meter", "business"),
  ],
  electricity_price_rise: [
    A("earth", "regional power demand", "may dip slightly as households and firms cut use", "higher prices reduce consumption", "behaviour"),
    A("digital", "energy-tracking apps and smart thermostats", "may see more people checking and scheduling their use", "people look for ways to cut the bill", "behaviour"),
    A("perception", "households opening their bills", "see a noticeably higher amount than last month", "the price rise shows up on the next bill"),
    A("physical", "homes in the region", "may be kept a degree or two cooler in winter", "less heating means lower indoor temperatures", "behaviour"),
    A("behaviour", "families on tight budgets", "may postpone other spending, such as eating out, to cover the bills", "a bigger bill leaves less for other spending", "society"),
  ],
  factory_supplier_failure: [
    A("earth", "the plant's energy use and emissions", "fall while the line is idle", "a stopped line uses less power"),
    A("government", "the regional labour office", "may be asked about short-time work support if the stop lasts", "long stoppages trigger support schemes", "society"),
    A("media", "local news and trade press", "may report the stoppage if it lasts more than a few days", "long stoppages at a large plant become news"),
    A("behaviour", "the plant's workers", "may lose shift pay and look for extra work", "paused shifts mean lost pay", "society"),
    A("perception", "people living near the plant", "may notice the car park half empty and the machines quiet", "a stopped plant is visibly quieter"),
    A("physical", "the production line", "stands still; half-finished goods wait on the conveyor", "no component, nothing to assemble"),
  ],
  incorrect_bank_report: [
    A("network", "the bank's website and app traffic", "may spike as worried customers log in to check balances", "worry sends people to check their accounts", "behaviour"),
    A("digital", "the bank's online-banking servers", "may slow under the surge of log-ins", "a traffic spike loads the servers", "network"),
    A("perception", "customers scrolling their feeds", "see the headline and the worried posts several times in an hour", "shares repeat the same story in many feeds"),
    A("physical", "bank branches and cash machines", "may see longer queues (possible, not predicted)", "some worried customers may withdraw cash", "behaviour"),
  ],
  submarine_cable_outage: [
    A("earth", "the seabed around the break", "is disturbed briefly when the repair ship lifts the cable", "repairs bring the cable to the surface", "physical"),
    A("government", "telecom regulators and security agencies", "may ask operators about the cause and their backup routes", "cuts raise resilience and security questions"),
    A("perception", "users on the cut route", "notice pages loading slowly and calls freezing", "rerouted traffic adds delay"),
    A("physical", "a cable-repair ship", "may be sent to lift and splice the cable at sea (days to weeks)", "submarine faults are repaired at sea"),
    A("behaviour", "remote workers in the affected region", "may move calls to mobile data or reschedule them", "people work around a slow connection", "society"),
  ],
  ai_agent_bank_breach: [
    A("network", "the bank's network links", "may be isolated by the security team to contain the agent", "containment cuts the compromised paths"),
    A("perception", "customers at the checkout", "see their card declined without explanation", "paused payments fail at the till", "business"),
    A("physical", "the bank's payment servers", "may be unplugged from the network while the breach is contained", "physical isolation is a containment step"),
    A("behaviour", "the bank's security team", "works to revoke the agent's tokens and close the gap", "incident response after unauthorized access"),
  ],
  driver_ignores_closure: [
    A("government", "the police or road authority", "may fine the driver for entering a closed road", "entering a closed road is an offence in many places"),
    A("society", "the driver's insurer", "may refuse to cover damage that happens on a closed road", "policies often exclude ignoring closures", "physical"),
    A("business", "the road-works crew", "may have to pause work while the car is on the site", "workers stop when a vehicle enters the site", "physical"),
    A("media", "local social media", "might share a dashcam clip of the car passing the sign", "such clips are often shared"),
    A("digital", "navigation apps", "may receive user reports that the closure is being ignored", "drivers report incidents in apps"),
  ],
  mark_iphone_gift: [
    A("earth", "the materials in the new phone", "came from mining and manufacturing; Cathy's old phone may be recycled or kept in a drawer", "every new device has a material footprint"),
    A("government", "the tax authority", "collects about €150 of VAT on the purchase (assumed 20% rate)", "VAT is part of the shop price", "business"),
    A("media", "Cathy's social media", "may show a photo of the new phone or her birthday", "gifts are often shared online", "behaviour"),
    A("network", "Cathy's mobile carrier", "may move her number to the new phone's eSIM", "a new phone needs the line moved", "digital"),
    A("perception", "Cathy", "sees the wrapped box, then the new screen light up", "she opens the gift"),
    A("physical", "the gift box and the old phone", "are unwrapped and put away; the old one may be wiped", "the new phone replaces the old one"),
    A("behaviour", "Mark and Cathy", "may skip a restaurant dinner this month to balance the budget", "a €900 purchase leaves less for other spending", "society"),
  ],
  lina_resigns: [
    A("media", "Lina's LinkedIn profile", "may switch to “open to work” and post that she is looking for a new role", "people who resign often signal they are available"),
    A("society", "Lina's bank account", "salary payments may stop after her last day, unless a new job starts first", "pay ends when employment ends"),
    A("behaviour", "Lina and her husband", "may cancel their holiday trip to save money until she has a new job", "less income, so households cut discretionary spending", "society"),
    A("government", "the public employment service", "may register her as a jobseeker if she has no job when her notice ends", "unemployment support needs registration", "society"),
    A("digital", "the company's HR and payroll system", "schedules her final pay slip and switches off her accounts on her last day", "leaving is processed in HR systems", "business"),
    A("business", "recruitment agencies", "may be asked to find her replacement", "a vacancy needs filling", "business"),
    A("perception", "her colleagues", "may notice her desk being cleared during her last week", "a departure becomes visible at work"),
    A("physical", "her work laptop and badge", "are handed back on her last day", "company equipment is returned"),
  ],
  julie_cycles: [
    A("government", "the city's cycling office", "may count one more bike commuter on its counters", "cities count cyclists on main routes", "physical"),
    A("business", "the local bike shop", "may sell her a lock, lights and a service plan", "a new daily cyclist needs equipment"),
    A("media", "Julie's friends on social media", "might see her post about her first ride to work", "people share new habits"),
    A("digital", "her fitness app", "may log about 12 km of cycling a day (there and back)", "rides are tracked on phones and watches", "physical"),
    A("perception", "drivers on her route", "see one more cyclist in the bike lane each morning", "a new commuter is visible on the road", "physical"),
    A("behaviour", "Julie's colleagues", "some may try cycling too after hearing about it (possible)", "habits can spread at work"),
  ],
  alarm_and_smoke: [
    A("earth", "the air downwind of the building", "may carry smoke particles for a few streets", "smoke drifts with the wind"),
    A("government", "the fire service", "may be called and send a crew to check the building", "alarms and smoke prompt emergency calls", "society"),
    A("business", "shops in the building", "may close until the alarm is cleared", "premises are evacuated during an alarm"),
    A("media", "local social media", "may share photos of the smoke above the building", "visible smoke gets photographed"),
    A("network", "the emergency call centre", "may receive several calls about the same smoke", "many people report the same event", "society"),
    A("digital", "the building's fire-alarm panel", "logs which detector triggered and when", "alarm systems keep an event log"),
  ],
  ball_through_window: [
    A("media", "the neighbour's doorbell-camera clip", "might be shared in the local neighbourhood group", "doorbell clips are often shared"),
    A("digital", "the insurer's claims app", "may receive a photo claim for the broken pane", "glass claims are made online", "society"),
    A("behaviour", "Leo's parents", "may apologise and offer to pay for the glass", "parents usually answer for their child", "society"),
  ],
  cat_teacup: [
    A("behaviour", "the cat's owner", "may come in, sweep up the pieces and move cups away from the table edge", "after a breakage people clean up and prevent a repeat", "perception"),
    A("business", "a homeware shop", "may sell a replacement cup (a small purchase)", "a broken cup may be replaced", "behaviour"),
    A("media", "the pet-camera clip", "might be posted online as a funny cat video", "pet clips are widely shared"),
    A("digital", "the pet-camera app", "saves the motion clip and sends a notification", "motion triggers a recording"),
  ],
  pipe_freeze: [
    A("perception", "the caretaker", "may notice frost on the pipe, or a damp patch after the thaw", "frost and leaks are visible"),
    A("behaviour", "the building's caretaker", "may turn off the water and call a plumber", "a split pipe is shut off before repair", "perception"),
    A("business", "a plumber", "may be called to replace the split section", "a burst pipe needs a repair", "behaviour"),
    A("society", "the building's insurer", "may receive a water-damage claim if it leaks", "leaks cause insured damage"),
    A("digital", "the building-management system", "may raise a low-temperature alarm for the basement", "sensors report the cold"),
  ],
  radioactive_scrap: [
    A("behaviour", "scrapyard staff", "may stop the truck, keep people away and call the radiation authority", "standard response to a portal alarm", "perception"),
    A("government", "the national radiation-protection authority", "may send specialists to locate and recover the source", "orphan sources are recovered by authorities", "behaviour"),
    A("society", "the truck driver and yard workers", "may be checked for exposure as a precaution", "people near a source are screened", "government"),
    A("business", "the scrapyard", "may stop accepting loads at that gate until the source is removed", "the area is closed during recovery", "behaviour"),
    A("media", "local news", "might report a radioactive source found in scrap (if made public)", "such finds are sometimes reported"),
    A("digital", "the portal's monitoring system", "logs the dose-rate spike and the truck's plate", "portals record alarms"),
    A("earth", "the yard's soil and scrap", "are checked for contamination if the capsule is damaged", "a damaged source can spread contamination", "government"),
  ],
  cosmic_bit_flip: [
    A("business", "the service running on that server", "may restart; a few user requests may fail", "a crashed process interrupts its service", "digital"),
    A("behaviour", "the on-call engineer", "may check the logs and replace the memory module", "repeated memory errors lead to a hardware swap", "perception"),
    A("perception", "the server's monitoring", "shows an uncorrected memory error alert", "the error is logged and alerted"),
  ],
};

/**
 * Adds the scenario's authored consequences for every world in `enabled`. Each links to the latest
 * consequence in its `after` world when present (else to the action), is labelled authored, and is
 * recorded as an evaluated connection. An authored consequence never replaces a rule's.
 */
export function withAuthored(c: Cascade, s: Scenario, enabled: Set<TopWorldId>): Cascade {
  const list = IF_ENABLED[s.id] ?? [];
  if (!list.length || !c.effects.length) return c;
  const effects = [...c.effects];
  const evaluations: Evaluation[] = [...c.evaluations];
  let n = effects.length;
  const seed = effects[0];
  list.forEach((a, i) => {
    if (!enabled.has(a.world)) return;
    if (effects.some((e) => e.world === a.world && e.entity.toLowerCase() === a.entity.toLowerCase() && e.change === a.change)) return;
    const inAfter = a.after ? effects.filter((e) => e.world === a.after) : [];
    const parent = inAfter.length ? inAfter[inAfter.length - 1] : seed;
    const e: CEffect = {
      id: `a${++n}`, world: a.world, entity: a.entity, change: a.change, tags: [`authored_${a.world}_${i}`], parents: [parent.id],
      ruleId: `authored.${s.id}.${i}`, mechanism: a.why, assumptions: [], unknowns: [],
      kind: "possible", provenance: "authored", depth: parent.depth + 1,
    };
    effects.push(e);
    evaluations.push({ from: parent.id, fromWorld: parent.world, to: a.world, ruleId: e.ruleId, outcome: "effect", note: `authored for this scenario: ${a.why}`, effect: e.id });
  });
  return { ...c, effects, evaluations };
}
