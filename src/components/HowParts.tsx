/**
 * The model explained formula by formula: the three predictions (LLM → NPLM → the Butterfly Model)
 * and NPLM's four stages as implemented. Shown on "How it solves it" (/how).
 */
import { Plain } from "./ui";

export const NPLM = "https://github.com/Sherlock2019/NPLM-Next-Phrase-language-model-";

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

export function NplmMath() {
  return (
    <div id="nplm" className="scroll-mt-44 my-8">
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

export function Ladder() {
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
            {i < RUNGS.length - 1 && <p className="mono faint mt-3 text-center text-[11px]">↓ {i === 0 ? "NPLM adds the meaning the LLM never states" : "the Butterfly Model takes that meaning as the action a"}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
