# World-Wide-Effect-Prediction Model  WEP Model  · Butterfly  Effect Model 

**1 actor · 1 action = consequences in cascade.**

> ### 👋 To Y Combinator and investors
>
> **1 · The problem.** AI agents are starting to act in the world, but language models predict the next
> word, not the consequences of an action. They stop at the first effect, give a different answer each
> time, and rarely say "I don't know". An agent that cannot foresee what its action changes cannot be
> trusted to act.
>
> **2 · Our solution and where it stands.** Two working proofs of concept:
> - **[ACM](https://github.com/Sherlock2019/ACM)** (our previous model) predicts the consequences of an AI
>   agent's action inside its digital world. It checks them against the goal and 32 permanent rules, and
>   asks a human to approve one exact plan before acting once and verifying the result.
> - **ACMP** (this repository) extends it to a ten-layer world view, from Earth & Ecosystems down to the
>   Physical World. One action produces a cascade of consequences across every affected layer, and each
>   step is explained.
>
> Today, prototype rules and authored consequences stand in for trained models. ACMP has 22 scenarios, a 3D
> scene for each and 49 tests, and it never invents a probability.
>
> **3 · What next.** We need resources and engineers to build a full, new **Action Prediction Model**:
> train it, test it, evaluate it, then improve and retrain it in a loop. We also want to collaborate with
> AI frontier labs and sell the model to them. See [My ask for investors](#my-ask-for-investors) and
> [Build it with us](#build-it-with-us).
>
> *Draft: frontier labs as partners and customers is a hypothesis to validate. Amounts are placeholders.*
> 
> DzoanNguyentran@gmail.com  Founder / S4BWB Solution for a Better World Builder
> https://dzoannguyentran.jobsmatchnow.com/#home
> 

**📖 [Full README](#why)** &nbsp;·&nbsp; **⏱️ [30-second version](README-30s.md)**

---

## WHY

### The problem: language models predict the next word, not the consequences of an action

A single event rarely stays in one domain. For example, a company builds an AI data center. That raises
electricity demand. Depending on the energy pathway, it may also raise gas burning and emissions, or bring
investment in solar and wind. It may change local prices and jobs, prompt a policy debate, and make the news.

More and more, people ask an AI "what happens if…?", and AI agents are starting to act on the answer. But a
language model only predicts the **next word**: it is trained to continue text plausibly, not to follow what
an action **changes**, world by world. So it:

- stops at the obvious first effect and rarely follows the chain from one domain into the next;
- gives a different answer each time, with no stated rule, assumption or source;
- sometimes invents likelihoods, and almost never says "I don't know".

> *Mark wants John's car. John sold it to Sarah.* **What happens to Mark?**
> A language model: "Mark buys a car." Plausible words, the wrong consequence, and it can't tell.

What is needed is a prediction of the **next consequences**: after this action, what changes, in which
world, for whom, and what does that change trigger next?

### LLM prediction vs ACMP prediction: same action, different output

*The LLM answers are typical, illustrative examples. The ACMP outputs are what the console shows for these
scenarios; all of its consequences are illustrative prototype rules or authored notes.*

| Action | LLM prediction: the next words | ACMP prediction: the consequences in cascade |
|---|---|---|
| **Lightning strikes an AI data center** | “The data center may lose power, and backup generators should take over.” | **Physical:** the transformer is damaged; the hall may lose grid power and cooling; diesel generators may start; some servers may shut down. **Digital:** AI traffic may be redirected to a second data center, increasing its load. **Business:** customers may lose access; a regulator may review the outage. **Media:** users and tech news may report the services down. **Earth:** diesel exhaust adds CO₂. Unknowns listed: how long the outage lasts, which services fail over. |
| **A company deploys a large AI data center** | One answer, a different mix each time, sometimes with an invented percentage. | Two energy pathways side by side. **A · Fossil:** more gas or coal burned, CO₂ up, worse air near the plants. **B · Low-carbon:** investment in solar, wind, nuclear and the grid, changing land and water use over years. If the pathway is not specified, both are **UNKNOWN**. |
| **Lina tells her manager she is resigning** | “Her company will need to find a replacement.” | **Behaviour:** her manager may ask what would make her stay; the team shares out her projects. With **ENABLE**: **Media**, her LinkedIn may switch to “open to work”; **Society & Economy**, her salary may stop after her last day; **Behaviour**, she and her husband may cancel their holiday (following the salary). |
| **A world with nothing believable to add** | Fills it with something plausible. | Says **“No consequence found”**, or **NOT MODELED** when no rule exists yet. |
| **The same action asked twice** | Different wording, sometimes different consequences. | The same cascade, so it can be reviewed, tested and versioned. |
| **How likely is it?** | Sometimes an invented percentage. | Never a probability: each link is EFFECT, NO EFFECT, UNKNOWN or NOT MODELED. |

### Why today's tools are not enough

- **Experts** see their own domain (grid, finance, policy, communications) but rarely the chain across all of them.
- **Chatbots** give fluent answers, but different ones each time, with no stated rule, assumption or
  source, and sometimes invented likelihoods.
- **Risk tools** model one domain in depth but do not connect to the others.

Decision-makers need a transparent way to ask "if this happens, what else might change, and why?",
where every step can be inspected, challenged and improved. ACMP is built to answer that question.

## WHAT

### An extension of ACM: from the AI's digital world to the whole world

ACMP extends our previous model, **[ACM · Action–Consequence Foresight Model](https://github.com/Sherlock2019/ACM)**
(`git@github.com:Sherlock2019/ACM.git`). ACM predicts the consequences of an AI agent's action **inside its
own digital world**: it simulates each plan on a copy of the environment, checks it against the goal and
permanent rules, asks a human to approve one exact plan, and then compares the prediction with what happens.

But an action rarely stays in one world. ACMP widens the view: it is a **global prediction model** that
predicts the effect of one action on **every affected layer** of a world-view model. The model has ten
layers (called *worlds* in the console), from the top down:

1. 🌍 Earth & Ecosystems
2. 🏛️ Government, Politics & Military
3. 📈 Society & Economy
4. 🏢 Business & Institutions
5. 📺 Social Media & News
6. 🌐 Network & Communications
7. 💻 Digital & IT Systems
8. 🧠 Human & Animal Behaviour
9. 👁️ Perception
10. ⚙️ Physical World (scales: human, molecular, atomic, quantum)

| | ACM (previous model) | ACMP (this project) |
|---|---|---|
| **Scope** | the AI agent's digital world, one environment at a time | all ten layers of the world view |
| **Actor** | an AI agent | a person, an AI, an animal, a natural phenomenon or an organisation |
| **Question** | is this plan safe to execute here? | what does this action change, in which layer, and what does that trigger next? |
| **Output** | one approved plan, executed once, then verified | a cascade of consequences across layers, each step explained |

ACM's digital world corresponds to ACMP's 💻 Digital & IT Systems layer: ACMP keeps it and adds the nine
others around it.

### What ACMP does

ACMP (the app is called **Butterfly Effect Prediction**) is a consequence explorer. You describe one action, or pick one of 22 ready-made
scenarios. The actor can be a person, an AI, an animal, a natural phenomenon or an organisation. ACMP then shows:

- **where the action lands first**: the layer it directly impacts, marked with a red action pulse;
- **how it may ripple on** across the ten layers, from Earth & Ecosystems down to the Physical World
  (including its molecular, atomic and quantum scales);
- **why each consequence appears**: the rule or note behind it, its assumptions, and where it comes from;
- **the action itself in 3D**: a real-time Babylon.js + Havok scene for every scenario, plus a double-slit
  experiment in the Quantum view.

It is a working proof of concept. It runs entirely from this repository on one laptop, with no cloud
service, API key or external AI.

**What it is not (yet):** a calibrated forecaster (it never gives a probability), a source of live data
(market and indicator values are fictional), or an executor (it explains consequences; it does not act,
which is ACM's role).

## SO WHAT: benefits and business value

**Benefits**

- **Second-order effects in seconds.** One action fans out across ten worlds, laid out as a graph and a list.
- **Every step explains itself.** Each consequence carries its world, its parent step, the rule or
  hand-written note behind it, its assumptions and its source label.
- **Honest about what it does not know.** Each connection is marked EFFECT, NO EFFECT, UNKNOWN (missing
  fact) or NOT MODELED (no rule yet). No probability is ever invented, and fictional data is labelled.
- **Repeatable.** The same input gives the same cascade, so it can be reviewed, tested and versioned.
- **Explore beyond the obvious.** Any world can be switched on to see whether a believable consequence
  exists there.
- **Easy to grasp.** A 3D scene of the action, world-specific views (globe, event boards, feeds, maps) and
  plain-language wording.
- **Private by design.** Runs offline. Nothing is sent to an outside service.

**Business value (target users, to be validated with design partners)**

| Who | Use | Value |
|---|---|---|
| Infrastructure and data-center operators | lightning, cooling-pump, grid and outage scenarios | spot cross-domain exposure before an incident, and train teams |
| Risk, resilience and insurance teams | trace claims and losses from a physical event | fewer blind spots; an auditable reasoning trail |
| Policy and public-affairs teams | follow a proposal through business, society and media | prepare for reactions before announcing |
| Communications and PR | follow an incorrect report as it spreads | faster, better-targeted response plans |
| Strategy and ESG | compare energy pathways (fossil vs low-carbon) side by side | structured scenario workshops |
| Education and training | physics in 3D, double slit, cause-and-effect reasoning | engaging, explainable teaching material |

---

## HOW

### Technical details

ACMP is a **standalone** project: everything runs from this repository, with no external engine, API or
proxy. The interface style is a global view of all world layers like an 7 ISO layers model

```bash
./start.sh                 # → http://127.0.0.1:3020/   (stop | status | restart | build | test)
npm test                   # 49 focused tests (worlds, router, cascade, catalog, boards, trigger, NPLM, 3D scenes): tsc → node --test
npm run typecheck          # tsc --noEmit
npm run build              # next build
```

**Deep links:**
- `/?scenario=lightning_datacenter` (scenario ids are in `src/lib/catalog.ts`)
- `/?scenario=ai_datacenter_energy&pathway=low_carbon`
- `/?scenario=lina_resigns&enable=media&enable=society`
- `/?q=<an action>`
- Add `&world=<id>`, `&scale=quantum`, or `&tab=console` (narrow screens).

#### Trigger → routing → worlds

- **Action = the trigger of change.** The actor is a human, an AI, an animal, a natural phenomenon or an
  organisation. The action arrives as typed text, an email, a news article or broadcast, or a captured image,
  video or sound (`src/lib/trigger.ts`).
  - Emails and articles are reduced to one action sentence.
  - ACMP has no image, video or sound recognition: files are previewed locally and the user describes
    what they show.
- **Prediction routing** sits above Action.
  - NPLM translates the action into a phrase (Phrase DNA), through ACMP's own route `/api/nplm` →
    NPLM's `POST /api/analyze` at `NPLM_URL` (default `http://127.0.0.1:8001`).
  - NPLM is optional and the only outside component. Without it, the router uses the words alone and
    says so.
  - ACMP's rules then pick the directly affected world.
- **Worlds.** The navigator always shows the full stack.
  - Worlds the action impacts (direct plus first-step consequences) are lit.
  - ENABLE any other world to let the cascade extend into it. A consequence appears only if a rule or an
    authored note supports one; otherwise the world says "No consequence found".
  - Each scenario words its consequences for its own situation. Tests forbid two scenarios from sharing
    a consequence.
- **Consequences per world** (`src/lib/enabled.ts`). Besides the generic prototype rules, each scenario has
  hand-written consequences for the worlds where one is believable.
  - They appear whenever that world is in the run (lit, or switched on with ENABLE), each linked to the
    step it follows.
  - Example, Lina resigns:
    - Media: her LinkedIn may switch to "open to work".
    - Society & Economy: her salary may stop after her last day.
    - Behaviour: she and her husband may cancel their holiday (this follows the salary).
  - They are labelled authored. Worlds with nothing believable still say "No consequence found".
- **Action · 3D panel** (always on). A band at the top of the centre column plays the action in 3D,
  whichever world is selected.
  - Sizes S / M / L, or Hide; the choice is remembered per browser.
  - **Every scenario has its own scene**, labelled by kind:
    - **Simulation** (7 scenes): Havok computes the impact, break or fall.
    - **Staging** (15 scenes): the action is not itself a physical event, so the people, places and
      objects are shown. Havok moves only incidental things (papers, scrap, a gift lid, a cut cable).
      Nothing is predicted.
  - The data-center scene follows the energy-pathway buttons.
  - A typed action gets the nearest authored scene by explicit words (shown as "matched …"), or a note
    when none fits.
  - While the panel runs, the Physical view shows the 2D schematic (one 3D engine at a time).
- **Physical World · 3D engine.** Havok rigid-body physics (MIT; WebAssembly served from `public/havok`,
  copied on `npm install`), rendered with Babylon.js (Apache-2.0).
  - **Realistic look, nothing downloaded:** a sky shader lights the scene (image-based lighting), with
    soft contact-hardening shadows, ambient occlusion, ACES tone mapping, bloom and a light depth of field.
  - **Textures** (brick, wood, asphalt, grass, concrete and others) are drawn on canvases in code.
  - **What is assumed:** masses, speeds and break thresholds (`src/lib/physics-scenes.ts`), always shown
    on screen. Illustrative, not a prediction.
  - **Controls:** drag to orbit; High / Light quality switch.
  - **Accessibility and fallback:** reduced motion means no autoplay; without WebGL or Havok, the 2D
    schematic is shown.
- **Quantum · double slit.** Physical World › Quantum shows the double-slit experiment in 3D.
  - Electrons are sent one at a time. Each hit is sampled from the far-field formula (cos² · sinc²),
    so fringes build up dot by dot.
  - "+ which-path detector" removes the interference term and leaves one broad band.
  - The wave rings are illustrative. "Concept" keeps the earlier drawing.
- **Business and Society & Economy:**
  - an S&P 500 panel and indicators with **fictional values** (no market data is connected);
  - the S&P sectors a scenario's business consequences touch (exposure only);
  - Polymarket-style event questions per scenario, with **no odds**.

#### The ten worlds

The ten layers are listed in [WHAT](#what) (ids in `src/lib/worlds.ts`).

**Action** (red) and **Prediction routing** are not worlds. The order is for reading: a consequence can
connect any two worlds directly.

Every world is "partly modelled": ACMP's prototype rules reach it, but no world has a validated model.
Molecular, atomic and quantum are conceptual views; the double slit's hit pattern comes from its textbook
formula.

#### Console (`/`)

- **Left: world navigator.** Each world is marked direct / possible / unknown / no effect / not modeled,
  with ENABLE / ON switches. Physical expands to its scales.
- **Centre: the Action · 3D panel, then the selected world's own view, then the cascade graph.**
  - World views: a globe for Earth; event boards for Government and Economy; the S&P 500 panel and
    business events for Business; a feed for Media; maps for Network and Digital; actor and choices for
    Behaviour; signals for Perception; four scales for Physical.
  - Cascade graph: list view, detail panel, evaluated connections, and a guided overview for the
    bottom-up demos.
- **Right: scenarios and conversation.**
  - 22 scenarios sorted top-down by world: Earth events first, Physical last (human → molecular → atomic
    → quantum). Each shows its trigger (actor, channel, raw input).
  - Then the conversation and the input channels (chat, email, article, image, video, sound), with
    "Analyze consequences".
- **Narrow screens** get tabs. Reduced motion stops every pulse.

#### What computes what

| Part | What | Label |
|---|---|---|
| `src/lib/router.ts` | which world an action directly impacts: ordered explicit rules over the words (and a parsed verb/object when available) | rule id + matched words |
| `src/lib/cascade.ts` + `rules.ts` | prototype propagation: every effect is evaluated against configurable world connections → EFFECT / NO EFFECT / UNKNOWN (missing fact) / NOT MODELED (no rule); parents, rule and assumptions are kept; duplicates converge, so loops stop; depth, effect and evaluation limits mark a run as truncated; never a probability | ILLUSTRATIVE · prototype rule |
| `src/lib/enabled.ts` | per-scenario, per-world consequences written by hand, added when that world is in the run | ILLUSTRATIVE · authored |
| `src/lib/catalog.ts` | 22 scenarios: hand-written starting states, context facts, wording and 3D scene | ILLUSTRATIVE · authored |
| `src/lib/physics-scenes.ts` + `components/bev/physics/*` | 3D scenes: kind (simulation / staging / experiment), assumed values, double-slit formula; Babylon.js + Havok kit and scenes | illustrative · properties assumed |
| `src/lib/boards.ts` | Polymarket-inspired event cards (no odds, no trading) and fictional indicator series | fictional / no probability estimated |
| `public/data/*.json` | recorded example results (Run demo, examples, missions, `/chat` design, E1, E2, lab feeds), stored in ACMP and read locally | RECORDED |

**Further details:**
- **Media routing** needs a content act (publish, broadcast, post, share, stream…) on content or through a
  channel. A platform name with infrastructure words (servers, outage, database, hack) routes to Digital;
  "posted the letter" stays Physical. The rules are word-based, with no negation or agent resolution.
- **Energy pathways** (data-center scenario): A · fossil and B · low-carbon are a context fact read by two
  rules; "not specified" makes both UNKNOWN. A toggle changes an assumption fed to the prototype rules; it is
  not a simulation.
- **Older world ids** in recorded data: `normalizeWorld()` maps `atomic` / `molecular` / `quantum` to
  Physical › scale, and older layer ids (`human_social`, `planetary`) to their worlds. The original id is
  kept (shown as "stored as atomic"); unknown ids never crash.
- **Not available in ACMP** (standalone; said on screen; nothing is simulated in their place): live Phrase
  DNA parsing without NPLM, follow-up questions, `/chat` sending, and generated next scenes in E1.

#### Pages

Every page shares one header with five numbered sections (`src/components/Nav.tsx`):

| Section | Page | What it shows |
|---|---|---|
| **1 · What problem does this solve?** | `/briefing` | what LLMs get wrong, and why it matters |
| **2 · What is it?** | `/what` | the solution in detail: what it shows, the ten worlds (`#worlds`), the extension of ACM, honest labels, what it is not, key terms |
| **3 · How it solves it** | `/how` | the five steps, one cascade, links to each engine, and the formulas (folded) |
| | `/scenarios` · `/inference` · `/lab` | sub-tabs: Scenario engine (recorded scripts) · What happens next? (recorded answers) · Physics lab (2D, matter.js) |
| **4 · Test it** | `/` | the console above |
| **5 · What next** | `/next` | the roadmap, the path to the Global World View model, ACM as the decision gate, contact |

Archived, linked from the footer only: `/chat` (the chat design, recorded only) and `/classic` (the earlier
globe-only console).

#### How it was built

- **Stack:** Next.js 16, React 19 and Tailwind 4.
- **Globe:** CesiumJS 1.138 (Apache-2.0, copied to `public/cesium` on install) with keyless Esri World
  Imagery. No Cesium ion or Google key.
- **3D and physics:** Babylon.js 9.33.1 + Havok 1.3.14, loaded only when a 3D view opens.
- **2D lab:** matter.js.
- **Colours:** world colours are validated with a palette script (lightness, chroma, contrast,
  normal-vision ΔE). Government and Society need the icon and name to tell apart under deutan colour
  blindness, so both are always shown.

```
src/app/            page.tsx (console), classic, briefing, scenarios, inference, lab, chat, api/nplm
src/components/     Globe (Cesium), ButterflyRadar, WorldStack, bev/* (WorldNav, WorldViews, Boards,
                    EarthPanel, CascadeGraph, ConsoleChat, ActionStage3D, Physics3D),
                    bev/physics/* (kit: engine, sky, lighting, textures, bodies · scenes: 7 simulations ·
                    staged: 15 staged scenes + double slit · registry), console/* (classic)
src/lib/            worlds, router, cascade, rules, enabled, catalog, scope, graph, boards,
                    physics-scenes, trigger, nplm, butterfly, geo, scenarios, data
tests/              node --test suites (compiled with tsconfig.test.json)
scripts/            copy-cesium.mjs, copy-havok.mjs, shot.mjs (headless screenshots; STORE=, SELECTOR=)
```

### Business scale-up plan

> Draft: the stages and models below are hypotheses to test with design partners, not commitments or results.

1. **Pilot (now → first design partners).** Run scenario workshops with 2–3 organisations in target
   sectors (data centers and infrastructure, insurance, public affairs). Measure whether teams find
   consequences they had missed, and how long a workshop takes with and without ACMP.
2. **Domain packs.** Turn workshop knowledge into reviewed rule libraries per sector, written with domain
   experts and versioned with their sources. Add opt-in live data (grid, markets, news) that is always
   labelled with its provenance.
3. **Product.** Shared workspaces, saved and compared scenarios, report export, an API, and on-premises
   deployment for regulated clients. Security and access control at that stage.
4. **Scale.** Partner channels (consultancies, insurers, training providers) and a marketplace for domain
   packs. Revenue models to test: per-seat SaaS, enterprise licence, paid domain packs, education licences.

---

## WHAT NOW

### Quickstart

**Requirements:** Node.js ≥ 20.9 and npm, on Linux, macOS or WSL. A GPU helps the 3D view; without one, use
the **Light** quality setting.

```bash
git clone git@github.com:Sherlock2019/Butterfly-effect-AImodel.git
cd Butterfly-effect-AImodel
npm install          # also copies the Cesium and Havok engine files into public/
./start.sh           # → http://127.0.0.1:3020/
```

Try these three:
1. Click **"Lightning strikes an AI data center"** on the right. Watch the strike in the 3D panel, then
   follow the cascade through all ten worlds.
2. Click **"Lina tells her manager she is resigning"**, then press **ENABLE** on Social Media, Society &
   Economy and Government in the left navigator.
3. Open **Physical World › Quantum** to watch the double-slit fringes build up. Then switch on the
   which-path detector.

**On a server (e.g. AWS EC2):** `./start.sh` listens on all interfaces and prints **Public links**
(`http://<public-ip>:3020/`). It finds the public IP from the EC2 instance metadata, or from a public
lookup. Open inbound TCP 3020 in the security group. For an Elastic IP or a domain, set it yourself:
`ACMP_PUBLIC_HOST=<ip-or-dns> ./start.sh`. There is no login: anyone who reaches the address can use it.

**More commands:**
- `./start.sh status` · `./start.sh stop` · `./start.sh test`
- Optional: start NPLM at `NPLM_URL` (default `http://127.0.0.1:8001`) for live phrase translation.

### My ask for investors

> To fill in: the amounts and terms below are placeholders, not figures.

- **Raising:** `[amount]` for `[period]` to take ACMP from proof of concept to paid pilots.
- **Use of funds** (draft split, to confirm):
  - validated domain models with experts, and evaluation;
  - opt-in data connectors with provenance labels;
  - a small engineering and design team;
  - design-partner pilots;
  - security and compliance for enterprise use.
- **Beyond capital:**
  - introductions to design partners in infrastructure, insurance and the public sector;
  - domain experts to review rule packs;
  - advisors on go-to-market for decision-support software.

---

## WHAT NEXT: evolution of the product

1. **Now → next release**
   - Live phrase translation with NPLM.
   - Expert-reviewed rules for the first sector.
   - More 3D scenes matched to typed actions.
   - Image, video and sound understanding for the trigger.
2. **Next**
   - Opt-in real data (markets, grid, news), always labelled.
   - Saved, compared and shared scenarios.
   - Exportable reports.
   - Learned models per world, with calibrated uncertainty shown only where data and evaluation support it.
3. **Later**
   - A consequence engine API embedded in planning, risk and communication tools.
   - "Check the consequences before acting" for people and AI agents. For example, an AI agent that wants
     a new permission first sees what that could break (see the *AI agent gains unauthorized access*
     scenario).

### From a consequence explorer to the Global World View prediction model

ACMP today is a **consequence explorer**. One action fans out across the ten worlds through prototype rules
and authored notes, so people can see and challenge the chain. It is the first step towards a **Global
World View prediction model**: one model that predicts what an action changes, in every world, for every
actor, and how each world's effects trigger the next.

How ACMP evolves into it:

| ACMP today | Global World View model |
|---|---|
| Prototype rules and authored consequences for 22 scenarios | The best specialist model per world (physics engine, vision, behaviour, economic, climate), with rules standing in until a model exists |
| Prediction routing over the words of the action (NPLM optional) | Shared meaning of the action from any input (text, image, video, audio), routed to the worlds it touches |
| Consequences labelled ILLUSTRATIVE, never a probability | Calibrated predictions per world, shown only where data and evaluation support them |
| Explore and explain: nothing is executed | Predict, then decide: an action is checked and approved before it is taken |

**ACM is the decision gate.** The sister project **[ACM · Action–Consequence Foresight
Model](https://github.com/Sherlock2019/ACM)** already does "think before acting" inside one environment at a
time. It simulates each plan on a copy, checks the goal and 32 permanent rules, asks a human to approve one
exact plan, executes it once, and compares the prediction with what is observed. Put together, ACMP gives the
**world view** (what an action can change, everywhere) and ACM gives the **decision gate** (check, ask,
act once, verify). The goal is an AI agent, or a person, who sees the consequences of an action across
every world before taking it.

*Status:* both are proofs of concept. Connecting real specialist models per world, and joining ACMP's world
view to ACM's decision gate, are next steps.

### Build it with us

Built today: the ten-world stack, prediction routing, the prototype cascade with authored consequences for
22 scenarios, a 3D scene for every scenario, and the double slit. Rules stand in for most worlds' models,
and everything not built yet is labelled.

To finish it, we need **top AI talent**: physics simulation, computer vision, world models, behaviour
modelling, AI agents, and economic and earth modelling. Each world needs a real model behind it.

**Let's work together:**
- Profile and projects: **[dzoannguyentran.jobsmatchnow.com](https://dzoannguyentran.jobsmatchnow.com/#projects)**
- WhatsApp: **[+84 908 618 075](https://wa.me/84908618075)**

---

© 2026 Dzoan Nguyen Tran · MIT
