"use client";

import Link from "next/link";
import { ButterflyRadar } from "@/components/ButterflyRadar";
import { PageShell } from "@/components/Nav";
import { WorldStack } from "@/components/WorldStack";
import { Eq, Plain, Stat, StatusPill, WorldTag } from "@/components/ui";
import { viewOf } from "@/lib/butterfly";
import { useJson } from "@/lib/data";
import type { DemoResults, InferenceSuite, LlmVsAcm } from "@/lib/types";
import { CONTACT, CUP_CHAIN, ROUTING, WORLDS, color, worldById } from "@/lib/worlds";

const TOC = [
  ["what", "What"], ["why", "Why"], ["how", "How"], ["sowhat", "So what"], ["next", "What next"], ["build", "Build with us"],
] as const;

function Sec({ id, n, title, kicker, children }: { id: string; n: string; title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t hairline py-14">
      <p className="classif">§{n} // {title}</p>
      <h2 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{kicker}</h2>
      <div className="brief mt-6">{children}</div>
    </section>
  );
}

const NPLM = "https://github.com/Sherlock2019/NPLM-Next-Phrase-language-model-";

type Rung = {
  n: string; model: string; link?: string; predicts: string; eqs: React.ReactNode[];
  symbols: [React.ReactNode, string][]; means: React.ReactNode; example: React.ReactNode; status: string;
};

const RUNGS: Rung[] = [
  {
    n: "1", model: "LLM · large language model", predicts: "the next word",
    eqs: [<>P( w<sub>t+1</sub> | w<sub>1</sub> … w<sub>t</sub> )</>],
    symbols: [
      [<>w<sub>t</sub></>, "the word (token) at position t; a token is often only part of a word"],
      [<>P( · | · )</>, "a probability over the whole vocabulary, given the words so far"],
    ],
    means: <>How GPT, Claude or Llama are trained: from the words so far, give every possible next token a probability, then pick one. It is pure statistics over text. Nothing in the formula says <i>who</i> is involved, <i>where</i> it happens or what the words <i>change</i>.</>,
    example: <>&ldquo;The cup fell off the …&rdquo; → <b>table</b> (likely), <b>shelf</b>, <b>edge</b>.</>,
    status: "The basis of every chatbot. Fluent, but it never states the world it describes, so the same question can get different stories.",
  },
  {
    n: "2", model: "NPLM · next phrase language model", link: NPLM, predicts: "the next unit of meaning",
    eqs: [
      <>DNA<sub>t</sub> = Parse( w<sub>1</sub> … w<sub>t</sub> )</>,
      <>P( slot<sub>t+1</sub> | DNA<sub>t</sub> )</>,
      <>logit′(c) = logit(c) + λ · Σ<sub>f</sub> w<sub>f</sub> · ( φ<sub>f</sub>(c) − ½ )</>,
    ],
    symbols: [
      [<>DNA<sub>t</sub></>, "Phrase DNA: the sentence as a frame of WHO · DOES · WHAT · TO WHOM · WHERE · WHEN · WHY · HOW, the same in English, French or Vietnamese"],
      [<>slot<sub>t+1</sub></>, "the kind of meaning that comes next: a place, a time, an action, a state of an actor or object"],
      [<>c</>, "one of the LLM's top-K candidate tokens"],
      [<>φ<sub>f</sub>(c)</>, "feature f scores how well c fits (e.g. is it a place, when a place is expected?); ½ means no evidence, so it adds exactly 0"],
      [<>w<sub>f</sub> , λ</>, "weights from config/scoring.yaml, λ = 2; the total change is clipped to ±6 logits"],
    ],
    means: <>Three steps. <b>Parse</b> the words into meaning. <b>Predict the next phrase</b>: which slot of meaning is missing. <b>Steer</b> the same LLM: candidates that fit that slot get a boost, others a penalty; nothing is deleted. The LLM still writes the words; Phrase DNA decides what kind of words should come next.</>,
    example: <>&ldquo;John will meet Sarah in …&rdquo; → slot <b>place 81.6 %</b>, time 13.8 % → <b>Paris</b>, London, Boston each <b>+2.05</b> logits.</>,
    status: "Measured (SmolLM2-135M, 61 hand-written items): right slot 73.8 % first guess, 83.6 % in three. Better next-word prediction is not proven yet (11 samples: insufficient data). About 4× slower. Weights are hand-set; no trained version yet.",
  },
  {
    n: "3", model: "The Butterfly Model", predicts: "the next state of each world",
    eqs: [
      <>a = DNA( action )</>,
      <>s′<sub>k</sub> = L<sub>k</sub>( s<sub>k</sub> , a ) &nbsp; for every world k ∈ {"{"}physical … earth{"}"}</>,
    ],
    symbols: [
      [<>a</>, "the action, as NPLM's Phrase DNA, from text, an image, a video or audio"],
      [<>k</>, "one of ten worlds: physical (human, molecular, atomic, quantum scales), perception, behaviour, digital, network, media, business, society, government, earth"],
      [<>s<sub>k</sub> → s′<sub>k</sub></>, "that world's state before and after the action"],
      [<>L<sub>k</sub></>, "that world's own laws: physics, perception, psychology, system rules, contracts, markets, ecology"],
    ],
    means: <>The same action is run through each world&apos;s laws, and each world gives its own answer. Every change is then placed on a <b>ring</b>, how far it reaches: actor, other actors, neighbours, city, country, earth. Each claim carries the rule or model behind it, or &ldquo;no rule matched&rdquo;.</>,
    example: <>&ldquo;The cat pushes the cup&rdquo; → physical: <b>on(cup, floor)</b>, broken · perception: the owner <b>hears</b> the crash · behaviour: the owner is <b>annoyed</b> · earth: ceramic to landfill.</>,
    status: "Today rules stand in for most Lₖ; government, media and network have no engine rules yet and the molecular, atomic and quantum scales have no model, and no world model has been validated for accuracy. Built: Phrase DNA, routing, state changes, other actors' goals, the Scenario Engine and a 2D physics lab.",
  },
];

type Stage = { n: string; title: string; where: string; eqs: React.ReactNode[]; symbols: [React.ReactNode, string][]; plain: React.ReactNode };

const sub = (s: string) => <sub>{s}</sub>;

const STAGES: Stage[] = [
  {
    n: "A", title: "Understand the whole phrase: words → Phrase DNA", where: "NPLM · splm/linguistic/semantic_roles.py, splm/phrase/builder.py",
    eqs: [
      <>T = UDParse( w{sub("1")} … w{sub("t")} ) &nbsp;→&nbsp; for each word i: head h(i), relation d(i), lemma, morphology</>,
      <>P( r | i ) ∝ π{sub("d(i)")}(r) · cue{sub("adp")}(r) · cue{sub("sconj")}(r) · boost{sub("entity(i)")}(r) · cue{sub("adv")}(r)</>,
      <>r̂(i) = argmax{sub("r")} P( r | i ) , &nbsp; slot(i) = σ( r̂(i) ) , &nbsp; conf(i) = P( r̂(i) | i )</>,
      <>DNA = ⟨ PRED( lemma, ACTION | STATE ), tense, modality, negation ; &nbsp;{"{"} slot → elements {"}"} ⟩</>,
    ],
    symbols: [
      [<>T</>, "the dependency tree from a Universal Dependencies parser (Stanza), the same scheme for every language"],
      [<>r</>, "a semantic role: AGENT, PATIENT, RECIPIENT, PARTICIPANT, LOCATION, TIME, MANNER, INSTRUMENT, GOAL, CAUSE …"],
      [<>π{sub("d(i)")}</>, "the prior for that grammatical relation; when the verb is known, its own argument profile replaces it (the object of meet is a PARTICIPANT, of deploy a PATIENT)"],
      [<>cue , boost</>, "evidence from a preposition (in → place or time), a subordinator (because → cause), the entity type (Paris is a place), an adverb class; each factor comes from the language pack YAML"],
      [<>σ</>, "the role → slot map: AGENT → WHO, PATIENT → WHAT, RECIPIENT → TO WHOM, LOCATION → WHERE, TIME → WHEN, GOAL → FOR WHAT …"],
    ],
    plain: <>Every word gets a probability for each role, from grammar plus clues like &ldquo;in&rdquo; or &ldquo;Paris&rdquo;. The most likely role puts it in a slot, and the alternatives are kept. The result is one frame, the same in English, French or Vietnamese. It is recursive: &ldquo;If John knew that Sarah might leave&rdquo; becomes a frame inside the CONDITION slot.</>,
  },
  {
    n: "B", title: "Predict the next phrase: which slot of meaning comes next", where: "NPLM · splm/phrase/slot_predictor.py",
    eqs: [
      <>score(s) = π{sub("seq")}( s | last filled slot ) · cue{sub("m")}(s)<sup>α</sup> · ( ½ + E{sub("pred")}(s) ) · ρ<sup>[ s already filled ]</sup></>,
      <>P( slot{sub("t+1")} = s | DNA ) = ( 1 − o ) · score(s) / Σ{sub("s′")} score(s′) , &nbsp; P( OTHER ) = o</>,
      <>o = 0.03 if the phrase ends on a marker ; 0.15 if no verb yet ; else min( 0.45 , 0.12 + 0.04 · #filled )</>,
    ],
    symbols: [
      [<>s</>, "a candidate slot: WHO, PREDICATE (an action or state), WHAT, TO WHOM, WHERE, WHEN, HOW, USING WHAT, WITH WHOM, WHY, FOR WHAT GOAL …"],
      [<>π{sub("seq")}</>, "how often slot s follows the last filled one in this language (word-order prior)"],
      [<>cue{sub("m")}</>, "if the phrase ends on a dangling marker (in, at, because, to), what it usually introduces; sharpened with α = 2 because it is strong evidence"],
      [<>E{sub("pred")}(s)</>, "how strongly the verb's type expects slot s (a movement verb expects WHERE TO)"],
      [<>ρ = 0.25</>, "penalty for a slot that is already said (WHERE twice is unlikely)"],
      [<>o</>, "probability kept for “no new slot”: end of sentence, punctuation, the same phrase continuing"],
    ],
    plain: <>Before any word is chosen, NPLM asks <i>what information is missing?</i> &ldquo;John will meet Sarah in …&rdquo; ends on &ldquo;in&rdquo;, WHO and WITH WHOM are filled, so the next phrase is a <b>place 81.6 %</b> or a <b>time 13.8 %</b>. When PREDICATE wins (&ldquo;Sarah is going to …&rdquo;), the next phrase is an <b>action</b>. Confidence is &ldquo;high&rdquo; when the top slot has ≥ 60 % and the distribution is peaked, &ldquo;ambiguous&rdquo; below 35 %.</>,
  },
  {
    n: "C", title: "Steer the words with that prediction", where: "NPLM · splm/model/candidate_scorer.py",
    eqs: [
      <>z′(c) = z(c) + clip{sub("±6")}( λ · Σ{sub("f")} w{sub("f")} · ( φ{sub("f")}( c , P(slot), DNA ) − ½ ) ) , &nbsp; λ = 2</>,
      <>w{sub("t+1")} ~ softmax( z′ ) over the LLM&apos;s top-K candidates</>,
    ],
    symbols: [
      [<>z(c)</>, "the LLM's own logit (score) for candidate token c"],
      [<>φ{sub("f")}</>, "feature f in [0, 1]: does c fit the expected slot, agree in gender and number, match the style …; ½ = no evidence, so it adds exactly 0"],
      [<>w{sub("f")}</>, "hand-set weights in config/scoring.yaml (a trained scorer is wired in but has no checkpoint yet)"],
    ],
    plain: <>The LLM still writes the words. Candidates that fit the expected meaning are pushed up, the others down, and nothing is deleted. With every feature off, the output is exactly the base LLM (a test checks this).</>,
  },
  {
    n: "D", title: "From meaning to the next state and the next action", where: "the Butterfly Model, reading NPLM's DNA",
    eqs: [
      <>a = DNA{sub("last sentence")} , &nbsp; κ = Concept( lemma ) , &nbsp; β : roles of κ → entities in the DNA slots</>,
      <>Δ = {"{"} e(β) : e ∈ effects(κ) {"}"} , &nbsp; s′ = s ⊕ Δ &nbsp; (each fact overwrites subject.attribute)</>,
      <>c = certainty( tense ) · 0.6<sup>[ condition ]</sup> , &nbsp; negation ⇒ Δ = ∅</>,
      <>rel( g ) = ADVANCED if ∃ f ∈ Δ : f = g ; &nbsp;BLOCKED if f contradicts g or holds an exclusive slot (ownership) ; &nbsp;ENABLED / HINDERED for what g requires ; &nbsp;else UNAFFECTED</>,
    ],
    symbols: [
      [<>κ</>, "the concept for the verb (sell → SALE), from the model's rule packs; an unknown verb gets generic consequences marked uninformative"],
      [<>β</>, "the binding: SALE's seller, buyer, item are filled from WHO, TO WHOM, WHAT"],
      [<>Δ</>, "the state changes, fully grounded: has(Sarah, car) = true, has(John, car) = false"],
      [<>s ⊕ Δ</>, "the next state: the old state with those facts overwritten; nothing else is inferred"],
      [<>g</>, "another actor's goal, read from earlier sentences by NPLM (“Mark wants to buy John's car” → has(Mark, car))"],
    ],
    plain: <>NPLM&apos;s frame says who did what to whom; the model&apos;s rule for that verb says what becomes true. &ldquo;John sold his car to Sarah&rdquo; ⇒ <b>has(Sarah, car)</b>; ownership is exclusive, so Mark&apos;s goal is <b>BLOCKED</b>, with certainty 1.0 because the past tense makes it a fact. The next <b>action</b> of each actor comes from the Scenario Engine: next scenes authored or generated by the local LLM, then validated against this state.</>,
  },
];

function NplmMath() {
  return (
    <div id="nplm" className="scroll-mt-24 my-8">
      <p className="hud-label">The model, formula by formula · as implemented in the code</p>
      <p className="dim mt-2 text-[15px]">How <a href={NPLM} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-4">NPLM</a> understands a whole phrase (A), predicts the next phrase (B) and steers the words (C), and how the Butterfly Model turns that meaning into the next state (D).</p>
      <ol className="mt-4 grid gap-4">
        {STAGES.map((s) => (
          <li key={s.n} className="glass-flat brackets p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] font-semibold"><span className="mono accent mr-2">{s.n}</span>{s.title}</p>
              <p className="mono faint text-[10.5px]">{s.where}</p>
            </div>
            <div className="serif mt-4 grid gap-2 overflow-x-auto text-center text-[17px] italic">
              {s.eqs.map((e, k) => <div key={k}>{e}</div>)}
            </div>
            <dl className="mt-4 grid gap-x-4 gap-y-1 text-[13.5px] sm:grid-cols-[auto_1fr]">
              {s.symbols.map(([sym, d], k) => (
                <div key={k} className="contents">
                  <dt className="serif italic text-[var(--text)] whitespace-nowrap">{sym}</dt>
                  <dd className="dim">{d}</dd>
                </div>
              ))}
            </dl>
            <Plain>{s.plain}</Plain>
          </li>
        ))}
      </ol>
      <p className="faint mt-3 text-[13px]">Every factor, prior and weight above is read from YAML (language packs, config/scoring.yaml, rule packs) and is rule-based today; NPLM&apos;s neural slot predictor and scorer are wired in but untrained. The numbers are defaults in the code.</p>
    </div>
  );
}

function Ladder() {
  return (
    <div className="my-8">
      <p className="hud-label">Three predictions · words → meaning → consequences</p>
      <ol className="mt-3 grid gap-4">
        {RUNGS.map((r, i) => (
          <li key={r.n} className="glass-flat brackets p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] font-semibold">
                <span className="mono accent mr-2">({r.n})</span>
                {r.link ? <a href={r.link} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-4 hover:text-[var(--accent)]">{r.model}</a> : r.model}
              </p>
              <p className="mono faint text-[11px] uppercase tracking-wider">predicts {r.predicts}</p>
            </div>
            <div className="serif mt-4 grid gap-1 overflow-x-auto text-center text-[19px] italic">
              {r.eqs.map((e, k) => <div key={k}>{e}</div>)}
            </div>
            <dl className="mt-4 grid gap-x-4 gap-y-1 text-[13.5px] sm:grid-cols-[auto_1fr]">
              {r.symbols.map(([s, d], k) => (
                <div key={k} className="contents">
                  <dt className="serif italic text-[var(--text)] whitespace-nowrap">{s}</dt>
                  <dd className="dim">{d}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[14.5px] leading-relaxed"><span className="hud-label mr-2 !text-[var(--amber)]">What it represents</span>{r.means}</p>
            <p className="mt-2 text-[14px] leading-relaxed"><span className="hud-label mr-2">Example</span>{r.example}</p>
            <p className="faint mt-2 text-[13px] leading-relaxed"><span className="hud-label mr-2">Status</span>{r.status}</p>
            {r.n === "2" && <a href="#nplm" className="hbtn mt-3 inline-block">The full formulas, step by step ↓</a>}
            {i < RUNGS.length - 1 && <p className="mono faint mt-3 text-center text-[11px]">↓ {i === 0 ? "NPLM adds the meaning the LLM never states" : "the Butterfly Model takes that meaning as the action a"}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Briefing() {
  const { data: demo } = useJson<DemoResults>("demo_results.json");
  const { data: llm } = useJson<LlmVsAcm>("llm_vs_acm.json");
  const { data: suite } = useJson<InferenceSuite>("inference_suite.json");
  const sale = demo?.phrases.find((p) => /Paris/.test(p.text) && /sell/.test(p.text));
  const distinct = llm ? llm.pairs.reduce((s, p) => s + p.llm_distinct_answers, 0) / llm.pairs.length : null;

  return (
    <PageShell>
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label="Sections">
          <div className="sticky top-24 flex flex-col gap-1">
            <p className="hud-label mb-2">Briefing</p>
            {TOC.map(([id, l], i) => (
              <a key={id} href={`#${id}`} className="mono dim rounded px-2 py-1 text-[11.5px] uppercase tracking-wider hover:bg-white/5 hover:text-[var(--text)]"><span className="faint mr-2">§{i + 1}</span>{l}</a>
            ))}
            <Link href="/" className="hbtn-primary mt-4">▶ Open the console</Link>
          </div>
        </nav>

        <article className="min-w-0 max-w-[880px]">
          <header className="rise">
            <p className="classif">Briefing // the Butterfly Model // ACMP</p>
            <p className="faint mt-2 text-[12px]">Background on the model. ACMP runs standalone: numbers and examples below come from recorded data bundled in ACMP, not from a live engine.</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] sm:text-6xl">1 actor · 1 action =<br /><span className="accent">consequences in cascade.</span></h1>
            <p className="dim mt-5 max-w-2xl text-lg leading-relaxed">
              The Action–Worlds Consequence prediction Model predicts what an action <i>changes</i>, for whom, in which of ten worlds and how far it reaches, before it is taken, with the rule or model behind every claim.
            </p>
            <Ladder />
            <Plain>A chatbot finishes your sentence. This model tells you what your action will <b>do</b>: to things, to people, to systems, to the planet. And it says &ldquo;I don&apos;t know&rdquo; when it doesn&apos;t.</Plain>
          </header>

          <Sec id="what" n="1" title="What" kicker="Ten worlds, each about its own kind of system.">
            <p>One origin actor performs one action. The action directly impacts one world first, and its consequences may reach others, any world to any world, not step by step up the stack. Every consequence sits on <b>two axes</b>: its <b>world</b> (which kind of system it is about) and its <b>ring</b> (how far it reaches, from the actor out to the earth).</p>
            <div id="worlds" className="my-6 scroll-mt-20"><WorldStack /></div>
            <div className="glass-flat my-6 overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>World</th><th>What it covers</th><th>In ACMP today</th><th>Status</th></tr></thead>
                <tbody>
                  {[...WORLDS, ROUTING].map((w) => (
                    <tr key={w.id}>
                      <td className="whitespace-nowrap"><span className="swatch mr-2" style={{ background: color(w.id) }} />{w.icon} {w.name}</td>
                      <td>{w.laws}</td><td>{w.today}</td><td><StatusPill s={w.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sale && (
              <div className="grid items-center gap-6 md:grid-cols-[1fr_1fr]">
                <div className="glass-flat p-3"><ButterflyRadar view={viewOf(sale)} /></div>
                <div>
                  <p className="hud-label">Figure 1 · a real run</p>
                  <p className="mt-2 text-[15px]">&ldquo;{sale.text}&rdquo;</p>
                  <p className="faint mt-2 text-sm">Angle = world, distance = ring. The action&apos;s own world (★) lights first; hatched sectors are worlds where no rule matched, which is never read as &ldquo;no impact&rdquo;.</p>
                </div>
              </div>
            )}
            <Plain>Think of a stone dropped in a pond, except the pond has ten layers: objects (down to atoms), senses, people, computers, networks, media, companies, society, government, the planet. The ripple can skip layers: a hacked server can hit a company directly.</Plain>
          </Sec>

          <Sec id="why" n="2" title="Why" kicker="An LLM predicts words, not world states.">
            <p>Language models do not track what an action <b>changes</b>, cannot point at the rule behind a claim, and never say &ldquo;I don&apos;t know&rdquo;. A real recording with a small local model:</p>
            <div className="glass-flat brackets my-6 p-5">
              <p className="dim text-[15px]"><i>Mark wants to buy John&apos;s car. Sarah needs a car. John sold his car to Sarah.</i> <b className="text-[var(--text)]">What happens next to Mark?</b></p>
              <p className="mt-3 text-[15px]"><span className="mono faint">LLM ›</span> &ldquo;Mark buys a car.&rdquo; · &ldquo;Mark gets a car.&rdquo; · &ldquo;Mary bought a car. Mary sold a car to Mark.&rdquo;</p>
              <p className="mt-2 text-[15px]"><span className="mono accent">Model ›</span> Mark&apos;s goal is <b>BLOCKED</b>. SALE makes <span className="mono">has(Sarah, car)</span> true; ownership is exclusive, so <span className="mono">has(Mark, car)</span> cannot hold. <span className="faint">Basis: rule · certainty 1.0</span></p>
            </div>
            {llm && suite && distinct !== null && (
              <div className="my-6 grid gap-3 sm:grid-cols-4">
                <Stat value={llm.pairs.length} label="recorded questions" sub={llm.model} />
                <Stat value={distinct.toFixed(1)} label="distinct LLM answers" sub="per question, same prompt" />
                <Stat value="1" label="Model answer" sub="same input, same report" />
                <Stat value={suite.stats.questions} label="questions answered" sub={`${suite.stats.scenarios} scenarios, with reasoning`} />
              </div>
            )}
            <Plain>Ask a chatbot the same thing three times and you may get three stories. Ask this model and you get one answer, with the reason.</Plain>
          </Sec>

          <Sec id="how" n="3" title="How" kicker="Actor → action → routing by the WHERE → cascade.">
            <ol className="my-6 grid gap-3 md:grid-cols-5">
              {[
                ["🎬", "The action, as data", "Text, image, video or audio. NPLM turns it into Phrase DNA: who · does what · to whom · where · when · why."],
                ["🧭", "Routing by the WHERE", "A ball in the park is physical, a Facebook post digital, a purchase economy, a vote society."],
                ["⚖️", "Each world's laws", "State changes such as has(Sarah, car) = true, who saw what, each world's rules."],
                ["👥", "Other actors react", "Every goal is checked: advanced, enabled, blocked, at risk, hindered."],
                ["🎯", "Compared with the goal", "Does the action get the actor what they wanted, and what else does it change?"],
              ].map(([i, t, d], k) => (
                <li key={k} className="glass-flat p-4">
                  <span className="text-2xl">{i}</span>
                  <p className="mono accent mt-2 text-[10.5px]">STEP {k + 1}</p>
                  <p className="mt-1 text-[14px] font-semibold">{t}</p>
                  <p className="dim mt-1 text-[13px] leading-relaxed">{d}</p>
                </li>
              ))}
            </ol>
            <NplmMath />
            <Eq n="4" plain="Each world's change feeds its neighbours, and certainty drops at every hop (design; not built yet).">Δs<sub>k±1</sub> = L<sub>k±1</sub>( s<sub>k±1</sub> , Δs<sub>k</sub> ) , &nbsp; c<sub>hop</sub> = c · λ</Eq>
            <p>The cascade, world by world (the README&apos;s example):</p>
            <ol className="my-5 flex flex-wrap items-center gap-2">
              {CUP_CHAIN.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="chip !text-[var(--text)]"><span className="swatch" style={{ background: color(c.world) }} />{worldById(c.world).icon} {c.text}</span>
                  {i < CUP_CHAIN.length - 1 && <span className="faint">→</span>}
                </li>
              ))}
            </ol>
            <p>Two engines run today: the <b>rule engine</b> (18 concepts, 42 impact rules, all in YAML, no linguistic or world facts in Python) and the <b>Scenario Engine</b> for human reactions, written as scripts. A local LLM only <i>phrases</i> results; it never decides a consequence.</p>
            <Plain>The model reads the sentence, works out where it happens, applies the rules of each world, checks everyone&apos;s goals, and only then lets a chatbot put it into nice words.</Plain>
          </Sec>

          <Sec id="sowhat" n="4" title="So what" kicker="All AI models working as one.">
            <p>Today AI is fragmented: language, vision, physics, behaviour, economic and climate models each see one slice. <b>None sees the whole consequence of a single action.</b> The Butterfly Model gives them one shared meaning (Phrase DNA), one router, the best specialist per world, and one consequence graph back.</p>
            <div className="my-6 grid gap-3 md:grid-cols-2">
              {[
                ["Better prediction", ["Second- and third-order effects", "Every actor's goal checked", "What-if before acting", "Any input, one meaning"]],
                ["A better architecture", ["The best model per world, as one system", "Plug and play: upgrade one world", "Phrase DNA: a shared language between models", "Routing doubles as an agent's harness config"]],
                ["Savings", ["Tokens: predicts in phrases, not token by token", "Compute: only the worlds an action touches run", "Retraining: a YAML edit or one world's model", "Costly mistakes caught before the action"]],
                ["Trust and safety", ["Every consequence names its world, rule and evidence", "Honest unknowns: no rule ≠ no impact", "An audit trail: facts, guesses, simulations labelled", "Safer agents: check “I will…” before acting"]],
              ].map(([t, items]) => (
                <div key={t as string} className="glass-flat p-4">
                  <p className="hud-label !text-[var(--accent)]">{t}</p>
                  <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">{(items as string[]).map((x) => <li key={x}>▸ {x}</li>)}</ul>
                </div>
              ))}
            </div>
            <p className="faint text-sm">Token, compute and cost savings follow from the design and are not yet benchmarked.</p>
            <Plain>Instead of one giant model that tries to know everything, many expert models each do their part, and one map shows the whole result.</Plain>
          </Sec>

          <Sec id="next" n="5" title="What next" kicker="A real model behind every world.">
            <div className="glass-flat my-6 overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>World</th><th>Next</th></tr></thead>
                <tbody>{WORLDS.map((w) => <tr key={w.id}><td className="whitespace-nowrap"><WorldTag id={w.id} full /></td><td>{w.next}</td></tr>)}</tbody>
              </table>
            </div>
            <p><b>Limitations today (ACMP):</b> standalone, so no live parser, engine or LLM; the router is word-based; the cascade rules are an authored prototype, not validated; examples on these pages are recorded data; no vision model and no 3D physics (replays and a 2D stand-in, labelled).</p>
            <p className="mt-4"><b>Honesty rules, enforced in code and tests:</b> an unknown verb gets no verdict · no rule is not no impact · negation and conditions count · certainty is reported · observed, proposed and predicted never merge · no future leakage · vectors are described as what they are.</p>
          </Sec>

          <section id="build" className="scroll-mt-20 border-t hairline py-14">
            <p className="classif">§6 // Build it with us</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">We are looking for top AI talent.</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                ["Physics simulation", "Unreal Engine 5 (Chaos), world models (V-JEPA 2-AC)", "⚙️ ⚛️"],
                ["Computer vision", "vision-language models, detection and tracking", "👁️"],
                ["Behaviour prediction", "movie scripts and psychology data, agents, LLM evaluation", "🧠 🧭"],
                ["Digital twins", "registries, ledgers, permissions", "💻 🏭"],
                ["Economic, political, climate and resource modelling", "", "🏛️ 🌍"],
              ].map(([t, d, i]) => (
                <div key={t} className="glass-flat p-4"><p className="text-[15px] font-semibold">{i} {t}</p>{d && <p className="dim mt-1 text-sm">{d}</p>}</div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={CONTACT.profile} className="hbtn-primary">Profile and projects ↗</a>
              <a href={CONTACT.whatsapp} className="hbtn">WhatsApp {CONTACT.whatsappLabel} ↗</a>
            </div>
          </section>
        </article>
      </div>
    </PageShell>
  );
}
