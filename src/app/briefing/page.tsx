"use client";

/**
 * 1 · What problem does this solve? What today's AI gets wrong, and why it matters.
 * What it is: /what · how it solves it: /how · the console: / · the roadmap and contact: /next.
 */
import Link from "next/link";
import { NextSteps, PageShell } from "@/components/Nav";
import { Plain, Stat } from "@/components/ui";
import { useJson } from "@/lib/data";
import type { InferenceSuite, LlmVsAcm } from "@/lib/types";

const TOC = [["why", "Words vs consequences"], ["sowhat", "Why it matters"]] as const;

function Sec({ id, n, title, kicker, children }: { id: string; n: string; title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[260px] border-t hairline py-14">
      <p className="classif">{n} // {title}</p>
      <h2 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{kicker}</h2>
      <div className="brief mt-6">{children}</div>
    </section>
  );
}

export default function Briefing() {
  const { data: llm } = useJson<LlmVsAcm>("llm_vs_acm.json");
  const { data: suite } = useJson<InferenceSuite>("inference_suite.json");
  const distinct = llm ? llm.pairs.reduce((s, p) => s + p.llm_distinct_answers, 0) / llm.pairs.length : null;

  return (
    <PageShell>
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label="Sections">
          <div className="sticky top-[260px] flex flex-col gap-1">
            <p className="hud-label mb-2">1 · What problem does this solve?</p>
            {TOC.map(([id, l]) => (
              <a key={id} href={`#${id}`} className="mono dim rounded px-2 py-1 text-[11.5px] uppercase tracking-wider hover:bg-white/5 hover:text-[var(--text)]">{l}</a>
            ))}
            <Link href="/" className="hbtn-primary mt-4">▶ Test it</Link>
          </div>
        </nav>

        <article className="min-w-0 max-w-[880px]">
          <header className="rise">
            <p className="classif">1 // What problem does this solve?</p>
            {/* the headline "AI LLM predicts the next Word, We predict the next World" sits in the header (Tagline) */}
            <h1 className="mt-3 text-3xl font-semibold leading-snug sm:text-5xl"><span className="sr-only">AI LLM predicts the next Word, We predict the next World </span>by predicting the consequences of an action in <span className="accent">each layer of our Reality.</span></h1>
            <p className="dim mt-5 max-w-2xl text-lg leading-relaxed">
              AI agents are starting to act: they move money, change systems and post content. But a language model only predicts the next <i>word</i>. It does not track what an action <b className="text-[var(--text)]">changes</b>, for whom or where, and it rarely says &ldquo;I don&apos;t know&rdquo;.
              Butterfly Effect Prediction predicts what one action changes across ten worlds, with the rule behind every step.
            </p>
            <Plain>A chatbot finishes your sentence. This model tells you what your action will <b>do</b>: to things, to people, to systems, to the planet. And it says &ldquo;I don&apos;t know&rdquo; when it doesn&apos;t.</Plain>
            <p className="faint text-[12px]">Numbers and examples on this page come from recorded data bundled with the app, not from a live engine.</p>
          </header>

          <Sec id="why" n="1.1" title="Words vs consequences" kicker="An LLM predicts words, not world states.">
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

          <Sec id="sowhat" n="1.2" title="Why it matters" kicker="All AI models working as one.">
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

          <NextSteps items={[
            { href: "/what", label: "2 · What is it? →", primary: true },
            { href: "/", label: "4 · Test it" },
          ]} />
        </article>
      </div>
    </PageShell>
  );
}
