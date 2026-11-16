# ACMP · Butterfly Eye View

**1 actor · 1 action = consequences in cascade.** Pick a scenario or write an action: ACMP shows the
world it directly impacts (a red action pulse in that world's own view), then the possible
consequences in any of **ten worlds**, each with its rule, assumptions and source.

ACMP is a **standalone** project: everything runs from this repository. No external engine, API
or proxy is used. The interface style is adapted from
[God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) (MIT, © 2026 Bilawal Sidhu).

```bash
./start.sh                 # → http://127.0.0.1:3020/   (stop | status | restart | build | test)
npm test                   # 44 focused tests (worlds, router, cascade, catalog, boards, trigger, NPLM, 3D scenes): tsc → node --test
npm run typecheck          # tsc --noEmit
npm run build              # next build
```

Deep links: `/?scenario=lightning_datacenter` (ids in `src/lib/catalog.ts`) ·
`/?scenario=ai_datacenter_energy&pathway=low_carbon` · `/?scenario=ball_through_window&scale=quantum` ·
`/?q=<an action>` · `&world=<id>` · `&tab=console` (narrow screens).

## Trigger → routing → worlds

- **Action = the trigger of change**: a human, an AI, an animal, a natural phenomenon or an organisation,
  arriving as typed text, an email, a news article or broadcast, or a captured image, video or sound
  (`src/lib/trigger.ts`). Emails and articles are reduced to one action sentence. ACMP has no image,
  video or sound recognition: files are previewed locally and the user describes what they show.
- **Prediction routing** (above Action): NPLM translates the action into a phrase (Phrase DNA) through
  ACMP's own route `/api/nplm` → NPLM's `POST /api/analyze` at `NPLM_URL` (default `http://127.0.0.1:8001`).
  NPLM is optional and the only outside component; without it the router uses the words alone and says so.
  ACMP's rules then pick the directly affected world.
- **Worlds**: the navigator always shows the full stack. Worlds the action impacts (direct + first-step
  consequences) are lit; ENABLE any other world to let the cascade extend into it: a consequence appears
  only if a rule supports one ("No consequence found" otherwise). Each scenario words its consequences for
  its own situation (tests forbid two scenarios sharing a consequence).
- **Physical World · 3D**: **Havok** rigid-body physics (MIT, WebAssembly served from `public/havok`,
  copied on `npm install`) rendered with **Babylon.js** (Apache-2.0): ball through a window, cat and cup,
  car and road closure, lightning strike, cooling pump, earthquake, hurricane wind. Realistic look with
  nothing downloaded: a sky shader lights the scene (image-based lighting), soft contact-hardening
  shadows, ambient occlusion, ACES tone mapping, bloom and a light depth of field; brick, wood, asphalt,
  grass and concrete are drawn on canvases in code. Impacts, falls and breaks are computed by Havok;
  masses, speeds and break thresholds are assumed (`src/lib/physics-scenes.ts`) and shown on screen:
  illustrative, not a prediction. Drag to orbit; **High / Light** quality switch; toggle to the 2D
  schematic; reduced motion = no autoplay; no WebGL or Havok → the schematic.
- **Action · 3D panel** (always on): a band at the top of the centre column plays the action in that
  engine whichever world is selected (sizes S / M / L, Hide; remembered per browser). **Every scenario
  has its own scene**, labelled by kind: *simulation* (7: Havok computes the impact, break or fall) or
  *staging* (15: the action is not itself a physical event, so the people, places and objects are shown
  and Havok moves only incidental things: papers, scrap, a gift lid, a cut cable; nothing is predicted).
  The data-center scene follows the energy-pathway buttons. A typed action gets the nearest authored
  scene by explicit words ("matched …"), or a note when none fits. While the panel runs, the Physical
  view shows the schematic (one 3D engine at a time).
- **Quantum · double slit**: Physical World › Quantum shows the double-slit experiment in 3D. Single
  electrons; each hit is sampled from the far-field formula (cos² · sinc²) so fringes build up dot by dot;
  "+ which-path detector" removes the interference term and leaves one broad band. Wave rings are
  illustrative. "Concept" keeps the earlier drawing.
- **Consequences per world** (`src/lib/enabled.ts`): besides the generic prototype rules, each scenario
  has hand-written consequences for the worlds where one is believable, shown whenever that world is in
  the run (lit, or switched on with ENABLE) and linked to the step they follow, e.g. Lina resigns →
  Media: her LinkedIn may switch to "open to work"; Society & Economy: her salary may stop after her last
  day; Behaviour: she and her husband may cancel their holiday (follows the salary). Labelled authored;
  worlds with nothing believable still say "No consequence found".
- **Business** and **Society & Economy**: an S&P 500 panel and indicators with **fictional values** (no
  market data is connected), the S&P sectors a scenario's business consequences touch (exposure only),
  and Polymarket-style event questions per scenario with **no odds**.

## The ten worlds

Top-down: 🌍 Earth & Ecosystems · 🏛️ Government, Politics & Military · 📈 Society & Economy ·
🏢 Business & Institutions · 📺 Social Media & News · 🌐 Network & Communications · 💻 Digital & IT Systems ·
🧠 Human & Animal Behaviour · 👁️ Perception · ⚙️ Physical World (scales: human, molecular, atomic, quantum).
**Action** (red) and **Prediction routing** are not worlds. The order is for reading: a consequence can
connect any two worlds directly. Every world is "partly modelled": ACMP's prototype rules reach it, no
world has a validated model; molecular, atomic and quantum are conceptual views only.

## Console (`/`)

- **Left**: world navigator (direct / possible / unknown / no effect / not modeled per world; Physical
  expands to its scales).
- **Centre**: the selected world's own view (globe for Earth; event boards for Government and Economy;
  feed for Media; maps for Network, Digital and Business; actor and choices for Behaviour; signals for
  Perception; four scales for Physical), above the cascade graph (list view, detail panel, evaluated
  connections, guided overview for the bottom-up demos).
- **Right**: 22 scenarios sorted top-down by world (Earth events first, Physical last: human → molecular →
  atomic → quantum), each with its trigger (actor, channel, raw input); then the conversation and the input
  channels (chat, email, article, image, video, sound) with "Analyze consequences". Narrow screens get
  tabs. Reduced motion stops every pulse.

## What computes what

| Part | What | Label |
|---|---|---|
| `src/lib/router.ts` | which world an action directly impacts: ordered explicit rules over the words (and a parsed verb/object when available) | rule id + matched words |
| `src/lib/cascade.ts` + `rules.ts` | prototype propagation: every effect is evaluated against configurable world connections → EFFECT / NO EFFECT / UNKNOWN (missing fact) / NOT MODELED (no rule); parents, rule and assumptions kept; duplicates converge, so loops stop; depth/effect/evaluation limits mark a run truncated; never a probability | ILLUSTRATIVE · prototype rule |
| `src/lib/catalog.ts` | 12 scenarios: hand-written starting states and context facts | ILLUSTRATIVE · authored |
| `src/lib/boards.ts` | Polymarket-inspired event cards (no odds, no trading) and fictional indicator series | fictional / no probability estimated |
| `public/data/*.json` | recorded example results (Run demo, examples, missions, `/chat` design, E1, E2, lab feeds), stored in ACMP and read locally | RECORDED |

**Media routing** needs a content act (publish, broadcast, post, share, stream…) on content or through a
channel; a platform name with infrastructure words (servers, outage, database, hack) routes to Digital;
"posted the letter" stays Physical. The rules are word-based: no negation or agent resolution.

**Energy pathways** (data-center scenario): A · fossil and B · low-carbon are a context fact read by two
rules; "not specified" makes both UNKNOWN. A toggle changes an assumption fed to prototype rules; it is
not a simulation.

**Older world ids** in recorded data: `normalizeWorld()` maps `atomic` / `molecular` / `quantum` →
Physical › scale and older layer ids (`human_social`, `planetary`) → their worlds, keeping the original id
(shown as "stored as atomic"); unknown ids never crash.

**Not available in ACMP** (standalone, said on screen, nothing simulated): live Phrase DNA parsing,
follow-up questions, `/chat` sending, generated next scenes in E1.

## Pages

| Page | What it does |
|---|---|
| `/` | the console above |
| `/briefing` | background on the model, with the ten-world stack (`#worlds`) |
| `/scenarios` · `/inference` · `/lab` | E1 recorded scripts · E2 recorded "what happens next?" answers · E3 2D physics lab (matter.js) |
| `/chat` | the chat design, recorded only (sending is not available) |
| `/classic` | the earlier globe-only console |

## How it was built

Next.js 16 + React 19 + Tailwind 4; CesiumJS 1.138 (Apache-2.0, copied to `public/cesium` on install)
with keyless Esri World Imagery, no Cesium ion or Google key; Babylon.js 9.33.1 + Havok 1.3.14 for the
3D physics (loaded only when the Physical view opens); matter.js for the 2D lab. World colours are
validated with a palette script (lightness, chroma, contrast, normal-vision ΔE; government↔society needs
the icon and name under deutan CVD, which are always shown).

```
src/app/            page.tsx (console), classic, briefing, scenarios, inference, lab, chat
src/components/     Globe (Cesium), ButterflyRadar, WorldStack, bev/* (WorldNav, WorldViews, Boards,
                    EarthPanel, CascadeGraph, ConsoleChat, Physics3D), bev/physics/* (kit: engine,
                    sky, lighting, textures, bodies · scenes: the seven 3D scenes), console/* (classic)
src/lib/            worlds, router, cascade, rules, catalog, graph, boards, physics-scenes, trigger,
                    nplm, butterfly, geo, scenarios, data
tests/              node --test suites (compiled with tsconfig.test.json)
scripts/            copy-cesium.mjs, copy-havok.mjs, shot.mjs (headless screenshots; STORE=, SELECTOR=)
```

© 2026 Dzoan Nguyen Tran · MIT
