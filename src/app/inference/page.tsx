"use client";

import { useMemo, useState } from "react";
import { ButterflyRadar } from "@/components/ButterflyRadar";
import { PageShell } from "@/components/Nav";
import { ErrorNote, Loading, Plain, Stat } from "@/components/ui";
import { viewOf } from "@/lib/butterfly";
import { useJson } from "@/lib/data";
import type { InferenceItem, InferenceSuite, PhraseResult } from "@/lib/types";

const asResult = (it: InferenceItem): PhraseResult => ({ id: it.id, text: it.action, context: it.context, summary: it.summary, rings: it.rings });
const STATUS_WORD = /(blocked|advanced|at risk|enabled|hindered|unaffected)/i;

export default function Inference() {
  const { data, error } = useJson<InferenceSuite>("inference_suite.json");
  const [theme, setTheme] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const items = useMemo(() => (data?.items ?? []).filter((i) =>
    (!theme || i.theme === theme) && (!q || `${i.action} ${i.context.join(" ")} ${i.shows}`.toLowerCase().includes(q.toLowerCase()))), [data, theme, q]);
  const it = items.find((i) => i.id === sel) ?? items[0];
  const view = useMemo(() => (it ? viewOf(asResult(it)) : null), [it]);

  return (
    <PageShell>
      <p className="classif">3 · How it solves it // What happens next?</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Ask &ldquo;what happens next to…?&rdquo; <span className="accent">and get the reason.</span></h1>
      <p className="dim mt-3 max-w-3xl text-lg">Every answer below was computed by the rule engine from a sentence and its context, and carries the chain of steps that produced it. Nothing is hand-written.</p>
      <Plain>Pick a little story. The model tells you what happens next to each person in it, and shows its working, like a maths exercise.</Plain>

      {error && <ErrorNote error={error} />}
      {!data && !error && <Loading what="the inference suite" />}
      {data && (
        <>
          <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat value={data.stats.scenarios} label="scenarios" />
            <Stat value={data.stats.questions} label="questions answered" />
            <Stat value={data.stats.concepts.length} label="concepts used" />
            <Stat value={Object.values(data.stats.relations).reduce((a, b) => a + b, 0)} label="goals checked" sub={Object.entries(data.stats.relations).map(([k, v]) => `${v} ${k.replace("_", " ")}`).join(" · ")} />
            <Stat value={data.stats.layers_reached.society ?? 0} label="reach society" sub={`earth ${data.stats.layers_reached.earth ?? 0} · country ${data.stats.layers_reached.country ?? 0}`} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <button className="hbtn !py-1.5" aria-pressed={!theme} onClick={() => setTheme(null)}>All {data.items.length}</button>
            {Object.entries(data.stats.themes).map(([t, n]) => (
              <button key={t} className="hbtn !py-1.5" aria-pressed={theme === t} onClick={() => { setTheme(t); setSel(null); }}>{t} {n}</button>
            ))}
            <input className="hfield ml-auto !w-64 !py-1.5" placeholder="search actions…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <ul className="glass scroll flex max-h-[78vh] flex-col gap-1 p-2">
              {items.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setSel(i.id)} className={`w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 ${it?.id === i.id ? "bg-[var(--accent-dim)]" : ""}`}>
                    <span className="mono faint text-[10px] uppercase tracking-wider">{i.theme} · {i.summary.concept ?? "unknown verb"}</span>
                    <span className="block text-[13.5px] font-medium">{i.action}</span>
                    {i.context.length > 0 && <span className="faint block truncate text-[11.5px]">{i.context.join(" · ")}</span>}
                  </button>
                </li>
              ))}
              {!items.length && <li className="faint p-4 text-sm">No action matches.</li>}
            </ul>

            {it && view && (
              <div className="flex min-w-0 flex-col gap-5">
                <section className="glass p-5">
                  <p className="hud-label">{it.shows}</p>
                  <p className="mt-2 text-xl font-semibold">&ldquo;{it.action}&rdquo;</p>
                  {it.context.length > 0 && <p className="dim mt-1 text-sm">Context: {it.context.map((c) => `“${c}”`).join(" ")}</p>}
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {it.answers.map((a, k) => {
                      const st = a.answer.match(STATUS_WORD)?.[1]?.toLowerCase();
                      return (
                        <div key={k} className="glass-flat p-3">
                          <p className="mono faint text-[11px]">› {a.question}</p>
                          <p className="mt-1 text-[14.5px] font-semibold" style={st ? { color: st === "blocked" ? "var(--bad)" : st === "advanced" || st === "enabled" ? "var(--good)" : "var(--warn)" } : undefined}>{a.answer}</p>
                          {a.why.length > 0 && <p className="faint mt-1 text-[11.5px]">↳ {a.why.join(" · ")}</p>}
                        </div>
                      );
                    })}
                  </div>
                </section>
                <div className="grid gap-5 xl:grid-cols-2">
                  <section className="glass p-5">
                    <p className="hud-label mb-3 !text-[var(--accent)]">Reasoning · step by step</p>
                    <ol className="flex flex-col gap-2">
                      {it.reasoning.map((r, k) => (
                        <li key={k} className="flex gap-3 text-[13px]">
                          <span className="mono accent w-5 flex-none text-right">{k + 1}</span>
                          <span><b>{r.step}</b> <span className="dim">{r.detail}</span></span>
                        </li>
                      ))}
                    </ol>
                  </section>
                  <section className="glass p-5">
                    <p className="hud-label mb-2 !text-[var(--accent)]">World × ring radar</p>
                    <ButterflyRadar view={view} />
                  </section>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
