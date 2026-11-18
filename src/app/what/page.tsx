"use client";

/**
 * 2 · What is it? The solution in detail: what it shows, the ten worlds, how it extends ACM,
 * how it labels what it knows, what it is not, and the key terms. Mirrors the README's WHAT.
 */
import Link from "next/link";
import { ButterflyRadar } from "@/components/ButterflyRadar";
import { NextSteps, PageShell } from "@/components/Nav";
import { WorldStack } from "@/components/WorldStack";
import { Plain, StatusPill } from "@/components/ui";
import { viewOf } from "@/lib/butterfly";
import { useJson } from "@/lib/data";
import type { DemoResults } from "@/lib/types";
import { CONTACT, ROUTING, WORLDS, color } from "@/lib/worlds";

const ACM = "https://github.com/Sherlock2019/ACM";
const ACM_DEMO = "http://100.31.100.157:3010/acm/home";

const TOC = [
  ["shows", "What it shows"], ["worlds-sec", "Ten worlds"], ["family", "An extension of ACM"],
  ["honest", "Honest by design"], ["not", "What it is not"], ["terms", "Key terms"],
] as const;

const SHOWS: [string, string, string][] = [
  ["🎯", "Where the action lands first", "The world it directly impacts, marked with a red action pulse."],
  ["🌊", "How it may ripple on", "Across ten worlds, from Earth & Ecosystems down to the Physical World, including its molecular, atomic and quantum scales."],
  ["🔎", "Why each consequence appears", "The rule or note behind it, its assumptions, and where it comes from."],
  ["🎬", "The action itself in 3D", "A real-time Babylon.js + Havok scene for every scenario, plus a double-slit experiment in the Quantum view."],
];

const FAMILY: [string, string, string][] = [
  ["Scope", "the AI agent's digital world, one environment at a time", "all ten layers of the world view"],
  ["Actor", "an AI agent", "a person, an AI, an animal, a natural phenomenon or an organisation"],
  ["Question", "is this plan safe to execute here?", "what does this action change, in which layer, and what does that trigger next?"],
  ["Output", "one approved plan, executed once, then verified", "a cascade of consequences across layers, each step explained"],
];

const LABELS: [string, string][] = [
  ["EFFECT", "a rule or authored note supports a consequence here"],
  ["NO EFFECT", "a rule was evaluated and found nothing"],
  ["UNKNOWN", "a fact the rule needs is missing (e.g. the energy pathway was not given)"],
  ["NOT MODELED", "no rule exists yet for this link"],
];

const TERMS: [string, string][] = [
  ["Actor", "who or what acts: a person, an AI, an animal, a natural phenomenon or an organisation"],
  ["Action", "the trigger of change, typed or arriving as an email, an article, an image, a video or a sound"],
  ["World", "one layer of the world view, with its own kind of system and its own laws"],
  ["Ring", "how far a consequence reaches: the actor, other actors, neighbours, city, country, earth"],
  ["Cascade", "the chain of consequences, from the directly impacted world to any other world"],
  ["Routing", "picking the world the action hits first, from its words (and NPLM's phrase, when running)"],
  ["Labels", "every consequence says where it comes from: prototype rule, authored note, or recorded example"],
];

function Sec({ id, title, kicker, children }: { id: string; title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[260px] border-t hairline py-14">
      <p className="classif">{title}</p>
      <h2 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{kicker}</h2>
      <div className="brief mt-6">{children}</div>
    </section>
  );
}

export default function What() {
  const { data: demo } = useJson<DemoResults>("demo_results.json");
  const sale = demo?.phrases.find((p) => /Paris/.test(p.text) && /sell/.test(p.text));

  return (
    <PageShell>
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label="Sections">
          <div className="sticky top-[260px] flex flex-col gap-1">
            <p className="hud-label mb-2">2 · What is it?</p>
            {TOC.map(([id, l]) => (
              <a key={id} href={`#${id}`} className="mono dim rounded px-2 py-1 text-[11.5px] uppercase tracking-wider hover:bg-white/5 hover:text-[var(--text)]">{l}</a>
            ))}
            <Link href="/" className="hbtn-primary mt-4">▶ Test it</Link>
          </div>
        </nav>

        <article className="min-w-0 max-w-[880px]">
          <header className="rise">
            <p className="classif">2 // What is it?</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] sm:text-6xl">One action in.<br /><span className="accent">Every consequence, world by world.</span></h1>
            <p className="dim mt-5 max-w-2xl text-lg leading-relaxed">
              Butterfly Effect Prediction (ACMP) is a <b className="text-[var(--text)]">consequence explorer</b>. You describe one action, or pick one of 22 ready-made scenarios. The actor can be a person, an AI, an animal, a natural phenomenon or an organisation. The app then predicts what that action changes, in which of ten worlds, for whom and how far, with the rule behind every step.
            </p>
            <Plain>Like dropping a stone in a pond with ten layers, and watching which layers ripple, why, and how far.</Plain>
            <p className="faint text-[12px]">A working proof of concept. It runs entirely from its own repository on one laptop or server, with no cloud service, API key or external AI.</p>
          </header>

          <Sec id="shows" title="What it shows" kicker="Four things for every action.">
            <ul className="grid gap-3 md:grid-cols-2">
              {SHOWS.map(([i, t, d]) => (
                <li key={t} className="glass-flat p-4">
                  <span className="text-2xl">{i}</span>
                  <p className="mt-2 text-[15px] font-semibold">{t}</p>
                  <p className="dim mt-1 text-[13.5px] leading-relaxed">{d}</p>
                </li>
              ))}
            </ul>
          </Sec>

          <Sec id="worlds-sec" title="Ten worlds" kicker="Ten worlds, each about its own kind of system.">
            <p>One actor performs one action. The action directly impacts one world first, and its consequences may reach others, any world to any world, not step by step up the stack. Every consequence sits on <b>two axes</b>: its <b>world</b> (which kind of system it is about) and its <b>ring</b> (how far it reaches, from the actor out to the earth).</p>
            <div id="worlds" className="my-6 scroll-mt-[260px]"><WorldStack /></div>
            <div className="glass-flat my-6 overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>World</th><th>What it covers</th><th>In the app today</th><th>Status</th></tr></thead>
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

          <Sec id="family" title="An extension of ACM" kicker="From the AI's digital world to the whole world.">
            <p>
              This model extends our previous model, <a href={ACM} target="_blank" rel="noreferrer" className="accent underline decoration-dotted underline-offset-4">ACM · Action–Consequence Foresight Model</a> (<a href={ACM_DEMO} target="_blank" rel="noreferrer" className="accent underline decoration-dotted underline-offset-4">live demo ↗</a>). ACM predicts the consequences of an AI agent&apos;s action <b>inside its own digital world</b>: it simulates each plan on a copy, checks it against the goal and permanent rules, asks a human to approve one exact plan, and compares the prediction with what happens. But an action rarely stays in one world, so this model predicts its effect on <b>every affected layer</b>.
            </p>
            <div className="glass-flat my-6 overflow-x-auto">
              <table className="tbl">
                <thead><tr><th></th><th>ACM (previous model)</th><th>This model</th></tr></thead>
                <tbody>{FAMILY.map(([k, a, b]) => <tr key={k}><td className="font-semibold">{k}</td><td className="dim">{a}</td><td>{b}</td></tr>)}</tbody>
              </table>
            </div>
            <p>ACM&apos;s digital world is this model&apos;s 💻 Digital &amp; IT Systems layer; the nine others are added around it. <a href={CONTACT.mlm} target="_blank" rel="noreferrer" className="accent underline decoration-dotted underline-offset-4">NPLM</a>, our next-phrase language model, can turn the action into a structured phrase (who does what, to whom, where) before it is routed.</p>
          </Sec>

          <Sec id="honest" title="Honest by design" kicker="It says what it knows, and what it doesn't.">
            <p>Each connection between two worlds gets exactly one of four labels. No probability is ever invented, and fictional data is labelled.</p>
            <dl className="glass-flat my-6 grid gap-x-6 gap-y-2 p-5 text-[14px] sm:grid-cols-[auto_1fr]">
              {LABELS.map(([l, d]) => (
                <div key={l} className="contents">
                  <dt className="mono accent whitespace-nowrap">{l}</dt>
                  <dd className="dim">{d}</dd>
                </div>
              ))}
            </dl>
            <ul className="flex flex-col gap-2 text-[14.5px]">
              <li>▸ <b>Repeatable:</b> the same input gives the same cascade, so it can be reviewed, tested and versioned.</li>
              <li>▸ <b>Every step explains itself:</b> its world, its parent step, the rule or hand-written note behind it, its assumptions and its source label.</li>
              <li>▸ <b>Private:</b> it runs offline; nothing is sent to an outside service.</li>
            </ul>
          </Sec>

          <Sec id="not" title="What it is not (yet)" kicker="A proof of concept, clearly labelled.">
            <ul className="grid gap-3 md:grid-cols-3">
              {[
                ["Not a forecaster", "It never gives a probability; no world has a validated model yet."],
                ["Not live data", "Market and indicator values are fictional; no data source is connected."],
                ["Not an executor", "It explains consequences; it does not act. Acting, after approval, is ACM's role."],
              ].map(([t, d]) => (
                <li key={t} className="glass-flat p-4"><p className="hud-label !text-[var(--amber)]">{t}</p><p className="mt-2 text-[14px] leading-relaxed">{d}</p></li>
              ))}
            </ul>
          </Sec>

          <Sec id="terms" title="Key terms" kicker="Seven words to read the console.">
            <dl className="grid gap-x-6 gap-y-2 text-[14.5px] sm:grid-cols-[auto_1fr]">
              {TERMS.map(([t, d]) => (
                <div key={t} className="contents">
                  <dt className="font-semibold whitespace-nowrap">{t}</dt>
                  <dd className="dim">{d}</dd>
                </div>
              ))}
            </dl>
          </Sec>

          <NextSteps items={[
            { href: "/how", label: "3 · How it solves it →", primary: true },
            { href: "/", label: "4 · Test it" },
          ]} />
        </article>
      </div>
    </PageShell>
  );
}
