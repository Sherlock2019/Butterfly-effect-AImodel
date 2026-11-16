/**
 * 4 · What next: the roadmap (now → next → later), the path to the Global World View model,
 * ACM as the decision gate, and how to build it with us. Mirrors the README's WHAT NEXT.
 */
import { NextSteps, PageShell } from "@/components/Nav";
import { WorldTag } from "@/components/ui";
import { CONTACT, WORLDS } from "@/lib/worlds";

const ACM = "https://github.com/Sherlock2019/ACM";
const ACM_DEMO = "http://100.31.100.157:3010/acm/home";

const ROADMAP: [string, string, string[]][] = [
  ["Now", "next release", [
    "Live phrase translation with NPLM.",
    "Expert-reviewed rules for the first sector.",
    "More 3D scenes matched to typed actions.",
    "Image, video and sound understanding for the trigger.",
  ]],
  ["Next", "", [
    "Opt-in real data (markets, grid, news), always labelled.",
    "Saved, compared and shared scenarios.",
    "Exportable reports.",
    "Learned models per world, with calibrated uncertainty shown only where data and evaluation support it.",
  ]],
  ["Later", "", [
    "A consequence engine API embedded in planning, risk and communication tools.",
    "“Check the consequences before acting” for people and AI agents. For example, an AI agent that wants a new permission first sees what that could break (see the AI agent gains unauthorized access scenario).",
  ]],
];

const EVOLVE: [string, string][] = [
  ["Prototype rules and authored consequences for 22 scenarios", "The best specialist model per world (physics engine, vision, behaviour, economic, climate), with rules standing in until a model exists"],
  ["Prediction routing over the words of the action (NPLM optional)", "Shared meaning of the action from any input (text, image, video, audio), routed to the worlds it touches"],
  ["Consequences labelled ILLUSTRATIVE, never a probability", "Calibrated predictions per world, shown only where data and evaluation support them"],
  ["Explore and explain: nothing is executed", "Predict, then decide: an action is checked and approved before it is taken"],
];

const TALENT = ["Physics simulation", "Computer vision", "World models", "Behaviour modelling", "AI agents", "Economic and earth modelling"];

export default function Next() {
  return (
    <PageShell>
      <div className="max-w-[980px]">
        <p className="classif">5 // What next</p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] sm:text-6xl">A real model<br /><span className="accent">behind every world.</span></h1>
        <p className="dim mt-5 max-w-2xl text-lg leading-relaxed">
          Today the app is a consequence explorer: one action fans out across ten worlds through prototype rules and authored notes, so people can see and challenge the chain. Here is where it goes next.
        </p>

        <div className="my-8 grid gap-4 md:grid-cols-3">
          {ROADMAP.map(([t, s, items]) => (
            <section key={t} className="glass-flat p-5">
              <p className="hud-label !text-[var(--accent)]">{t}{s && <span className="faint"> · {s}</span>}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[14px] leading-relaxed">{items.map((x) => <li key={x}>▸ {x}</li>)}</ul>
            </section>
          ))}
        </div>

        <section className="border-t hairline pt-10 mt-10">
          <p className="classif">From a consequence explorer to the Global World View prediction model</p>
          <p className="mt-4 text-[15px] leading-relaxed">
            One model that predicts what an action changes, in every world, for every actor, and how each world&apos;s effects trigger the next.
          </p>
          <div className="glass-flat my-6 overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Today</th><th>Global World View model</th></tr></thead>
              <tbody>{EVOLVE.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="glass-flat brackets p-5">
            <p className="hud-label">ACM is the decision gate</p>
            <p className="mt-2 text-[14.5px] leading-relaxed">
              The sister project <a href={ACM} target="_blank" rel="noreferrer" className="accent underline decoration-dotted underline-offset-4">ACM · Action–Consequence Foresight Model</a> (<a href={ACM_DEMO} target="_blank" rel="noreferrer" className="accent underline decoration-dotted underline-offset-4">live demo ↗</a>) already does &ldquo;think before acting&rdquo; inside one environment at a time. It simulates each plan on a copy, checks the goal and 32 permanent rules, asks a human to approve one exact plan, executes it once, and compares the prediction with what is observed.
              Together, this app gives the <b>world view</b> (what an action can change, everywhere) and ACM gives the <b>decision gate</b> (check, ask, act once, verify).
            </p>
            <p className="faint mt-3 text-[13px]">Status: both are proofs of concept. Connecting real specialist models per world, and joining the world view to ACM&apos;s decision gate, are next steps.</p>
          </div>
          <details className="glass-flat mt-4 p-4">
            <summary className="cursor-pointer text-[15px] font-semibold">The next step for each world</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>World</th><th>Next</th></tr></thead>
                <tbody>{WORLDS.map((w) => <tr key={w.id}><td className="whitespace-nowrap"><WorldTag id={w.id} full /></td><td>{w.next}</td></tr>)}</tbody>
              </table>
            </div>
          </details>
        </section>

        <section id="build" className="scroll-mt-44 border-t hairline pt-10 mt-10">
          <p className="classif">Build it with us</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">We are looking for top AI talent.</h2>
          <p className="dim mt-4 text-[15px] leading-relaxed">
            Built today: the ten-world stack, prediction routing, the prototype cascade with authored consequences for 22 scenarios, a 3D scene for every scenario, and the double slit. Rules stand in for most worlds&apos; models, and everything not built yet is labelled. Each world needs a real model behind it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {TALENT.map((t) => <span key={t} className="chip !text-[var(--text)]">{t}</span>)}
          </div>
          <div className="glass-flat mt-6 p-5">
            <p className="hud-label !text-[var(--accent)]">Let&apos;s work together</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={CONTACT.profile} target="_blank" rel="noreferrer" className="hbtn-primary">Profile and projects · {CONTACT.profileLabel} ↗</a>
              <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="hbtn">WhatsApp {CONTACT.whatsappLabel} ↗</a>
            </div>
            <p className="faint mt-4 text-[12px]">© 2026 Dzoan Nguyen Tran · MIT</p>
          </div>
        </section>

        <NextSteps items={[
          { href: "/", label: "4 · Test it", primary: true },
          { href: "/briefing", label: "1 · What problem does this solve?" },
        ]} />
      </div>
    </PageShell>
  );
}
