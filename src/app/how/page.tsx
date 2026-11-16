/**
 * 3 · How it solves it: the pipeline in five steps, then each engine working on its own page
 * (Scenario engine /scenarios, What happens next? /inference, Physics lab /lab), and the formulas.
 */
import Link from "next/link";
import { Ladder, NplmMath } from "@/components/HowParts";
import { NextSteps, PageShell } from "@/components/Nav";
import { Eq, Plain } from "@/components/ui";
import { CUP_CHAIN, color, worldById } from "@/lib/worlds";

const STEPS: [string, string, string][] = [
  ["🎬", "The action, as data", "Text, image, video or audio. NPLM turns it into Phrase DNA: who · does what · to whom · where · when · why."],
  ["🧭", "Routing by the WHERE", "A ball in the park is physical, a Facebook post digital, a purchase economy, a vote society."],
  ["⚖️", "Each world's laws", "State changes such as has(Sarah, car) = true, who saw what, each world's rules."],
  ["👥", "Other actors react", "Every goal is checked: advanced, enabled, blocked, at risk, hindered."],
  ["🎯", "Compared with the goal", "Does the action get the actor what they wanted, and what else does it change?"],
];

const PARTS = [
  {
    href: "/scenarios", tag: "Behaviour", title: "Scenario engine",
    line: "People react through goals, not physics.",
    what: "A scene written like a movie script. After every line the engine shows who owns what, who knows what, who objects, the consequences per world, and possible next scenes.",
  },
  {
    href: "/inference", tag: "Reasoning", title: "What happens next?",
    line: "Ask “what happens next to…?” and get the reason.",
    what: "Short stories with a question about each person in them. Every answer was computed by the rule engine and shows the chain of steps behind it.",
  },
  {
    href: "/lab", tag: "Physical", title: "Physics lab",
    line: "1 actor · 1 action · simulated, not guessed.",
    what: "Choose who does what to which object. A 2D physics engine plays it out and reports what broke, what was heard, and what it cannot know yet.",
  },
];

export default function How() {
  return (
    <PageShell>
      <div className="max-w-[980px]">
        <p className="classif">3 // How it solves it</p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] sm:text-6xl">One action in.<br /><span className="accent">Its consequences in every world out.</span></h1>
        <p className="dim mt-5 max-w-2xl text-lg leading-relaxed">
          The model reads the action, finds the world it lands in first, applies each world&apos;s laws, checks everyone&apos;s goals, and only then puts the result into words.
        </p>

        <ol className="my-8 grid gap-3 md:grid-cols-5">
          {STEPS.map(([i, t, d], k) => (
            <li key={k} className="glass-flat p-4">
              <span className="text-2xl">{i}</span>
              <p className="mono accent mt-2 text-[10.5px]">STEP {k + 1}</p>
              <p className="mt-1 text-[14px] font-semibold">{t}</p>
              <p className="dim mt-1 text-[13px] leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>

        <p className="hud-label">One cascade, world by world</p>
        <ol className="my-4 flex flex-wrap items-center gap-2">
          {CUP_CHAIN.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="chip !text-[var(--text)]"><span className="swatch" style={{ background: color(c.world) }} />{worldById(c.world).icon} {c.text}</span>
              {i < CUP_CHAIN.length - 1 && <span className="faint">→</span>}
            </li>
          ))}
        </ol>
        <Plain>Two engines produced the examples below: a <b>rule engine</b> (rules in YAML, no world facts hidden in code) and the <b>Scenario Engine</b> for human reactions, written as scripts. A language model only <i>phrases</i> results; it never decides a consequence. In this app their results are recorded and replayed, and labelled as such; the console&apos;s cascade runs live from ACMP&apos;s own prototype rules.</Plain>

        <section className="border-t hairline pt-10 mt-10">
          <p className="classif">See each part working</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {PARTS.map((p) => (
              <Link key={p.href} href={p.href} className="glass-flat group flex flex-col p-5 transition hover:border-[var(--accent)]">
                <p className="hud-label">{p.tag}</p>
                <p className="mt-1 text-xl font-semibold group-hover:text-[var(--accent)]">{p.title} →</p>
                <p className="mt-2 text-[14.5px]">{p.line}</p>
                <p className="dim mt-2 text-[13.5px] leading-relaxed">{p.what}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t hairline pt-10 mt-10">
          <p className="classif">Under the hood</p>
          <details className="glass-flat mt-4 p-4">
            <summary className="cursor-pointer text-[15px] font-semibold">Three predictions: words → meaning → consequences</summary>
            <Ladder />
          </details>
          <details className="glass-flat mt-3 p-4">
            <summary className="cursor-pointer text-[15px] font-semibold">The model, formula by formula</summary>
            <NplmMath />
            <Eq n="4" plain="Each world's change feeds its neighbours, and certainty drops at every hop (design; not built yet).">Δs<sub>k±1</sub> = L<sub>k±1</sub>( s<sub>k±1</sub> , Δs<sub>k</sub> ) , &nbsp; c<sub>hop</sub> = c · λ</Eq>
          </details>
        </section>

        <NextSteps items={[
          { href: "/", label: "4 · Test it →", primary: true },
          { href: "/next", label: "5 · What next" },
        ]} />
      </div>
    </PageShell>
  );
}
