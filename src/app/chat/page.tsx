"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ButterflyRadar } from "@/components/ButterflyRadar";
import { DnaCard } from "@/components/console/Intake";
import { PageShell } from "@/components/Nav";
import { Basis, GoalPill, WorldTag } from "@/components/ui";
import { cascadeOf, viewOf } from "@/lib/butterfly";
import { postJson, useLive } from "@/lib/data";
import type { AskResult, PhraseResult } from "@/lib/types";

/**
 * Demo chat (design kept). It needs a parser, an engine and an LLM; none run in standalone ACMP, so
 * sending reports "not available" (postJson never makes a network call). The console is the
 * working entry point.
 */

type Msg =
  | { role: "user"; text: string; ctx?: string[] }
  | { role: "ctx"; text: string }
  | { role: "action"; r: PhraseResult }
  | { role: "answer"; q: string; a: AskResult; compare: boolean }
  | { role: "err"; text: string };

const STARTERS: { text: string; ctx?: string[] }[] = [
  { text: "John sold his car to Sarah in Paris to pay his debt.", ctx: ["Mark wants to buy John's car."] },
  { text: "My cat pushed the tea cup off the table." },
  { text: "The engineer deleted the production database in London." },
  { text: "Anna sold her bike to Tom in London to pay her rent.", ctx: ["Paul wants to buy Anna's bike."] },
];

function modelLabel(reason: string): { name: string; kind: "claude" | "local" | "off" } {
  if (/^claude/i.test(reason)) return { name: reason.split(" ")[0], kind: "claude" };
  if (/ via /.test(reason)) return { name: reason.split(" ")[0], kind: "local" };
  return { name: "no LLM", kind: "off" };
}

export default function Chat() {
  const live = useLive();
  const [r, setR] = useState<PhraseResult | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ctx, setCtx] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<"" | "action" | "ask">("");
  const [compare, setCompare] = useState(true);
  const end = useRef<HTMLDivElement>(null);
  const model = modelLabel(live.llmReason);
  const view = useMemo(() => (r ? viewOf(r) : null), [r]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [msgs, busy]);

  async function runAction(text: string, context: string[]) {
    setMsgs((m) => [...m, { role: "user", text, ctx: context }]);
    setBusy("action");
    try {
      const res = await postJson<PhraseResult>("live parsing", { text, context });
      setR(res);
      setMsgs((m) => [...m, { role: "action", r: res }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "err", text: (e as Error).message }]);
    } finally {
      setBusy("");
    }
  }

  async function runAsk(question: string) {
    if (!r) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy("ask");
    try {
      const a = await postJson<AskResult>("follow-up questions", { text: r.text, context: r.context, question, compare });
      setMsgs((m) => [...m, { role: "answer", q: question, a, compare }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "err", text: (e as Error).message }]);
    } finally {
      setBusy("");
    }
  }

  async function send(raw?: string) {
    const t = (raw ?? q).trim();
    if (!t || busy) return;
    setQ("");
    if (t.startsWith("+")) {
      const c = t.slice(1).trim();
      setCtx((x) => [...x, c]);
      setMsgs((m) => [...m, { role: "ctx", text: c }]);
      return;
    }
    if (!live.text) {
      setMsgs((m) => [...m, { role: "user", text: t }, { role: "err", text: `The live model is offline (${live.reason}).` }]);
      return;
    }
    if (t.endsWith("?")) {
      if (!r) {
        setMsgs((m) => [...m, { role: "user", text: t }, { role: "err", text: "Type an action first (who does what), then ask about it." }]);
        return;
      }
      return runAsk(t);
    }
    const c = ctx;
    setCtx([]);
    return runAction(t, c);
  }

  function starter(s: { text: string; ctx?: string[] }) {
    if (busy) return;
    (s.ctx ?? []).forEach((c) => setMsgs((m) => [...m, { role: "ctx", text: c }]));
    setCtx([]);
    runAction(s.text, s.ctx ?? []);
  }

  const suggestions = r?.suggestions?.slice(0, 4).map((s) => (s.endsWith("?") ? s : s + "?")) ?? [];

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="classif">Demo chat // recorded design</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Type an action. See what it <span className="accent">changes</span>.</h1>
          <p className="dim mt-2 max-w-2xl text-[15px]">This chat needs a parser, an engine and an LLM, none of which run in standalone ACMP, so sending is not available here. Use the <a href="/" className="underline">console</a>: it routes any action and runs ACMP&apos;s cascade.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip" title={live.llmReason}>
            <span style={{ color: model.kind === "claude" ? "var(--accent)" : model.kind === "local" ? "var(--amber)" : "var(--bad)" }}>●</span>
            LLM: {model.name}{model.kind === "local" ? " (local)" : ""}
          </span>
          <span className="chip"><span style={{ color: "var(--bad)" }}>●</span> not available in ACMP</span>
          <label className="chip cursor-pointer select-none !text-[var(--text)]">
            <input type="checkbox" className="accent-[var(--accent)]" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            Compare: LLM alone vs LLM + model facts
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* thread */}
        <section className="glass flex min-h-[62vh] flex-col p-4">
          <div className="scroll flex flex-1 flex-col gap-3 pr-1" style={{ maxHeight: "64vh" }}>
            {msgs.length === 0 && (
              <div className="m-auto max-w-xl py-8 text-center">
                <p className="hud-label">Try one, or type your own</p>
                <div className="mt-3 grid gap-2">
                  {STARTERS.map((s) => (
                    <button key={s.text} type="button" onClick={() => starter(s)} disabled={!live.text || !!busy}
                      className="glass-flat px-4 py-2.5 text-left text-[14px] hover:!border-[var(--accent)] disabled:opacity-50">
                      {s.ctx && <span className="mono block text-[11px] text-[var(--amber)]">+ {s.ctx.join(" · ")}</span>}
                      {s.text}
                    </button>
                  ))}
                </div>
                <p className="faint mt-4 text-[12.5px] leading-relaxed">
                  <span className="mono">+ …</span> adds context first (another person&apos;s goal) · a line ending in <span className="mono">?</span> asks about the last action · anything else is a new action.
                </p>
              </div>
            )}

            {msgs.map((m, i) => {
              if (m.role === "user")
                return (
                  <div key={i} className="ml-10 self-end rounded-2xl rounded-br-sm bg-[var(--accent-dim)] px-4 py-2 text-[14.5px]">
                    {m.text}
                    {m.ctx && m.ctx.length > 0 && <span className="faint block text-[11.5px]">with context: {m.ctx.join(" · ")}</span>}
                  </div>
                );
              if (m.role === "ctx") return <p key={i} className="mono self-end text-[12px] text-[var(--amber)]">+ context: {m.text}</p>;
              if (m.role === "err") return <p key={i} className="text-[13px] text-[var(--bad)]">{m.text}</p>;
              if (m.role === "action") return <ActionCard key={i} r={m.r} />;
              return <AnswerCard key={i} a={m.a} compare={m.compare} />;
            })}

            {busy && (
              <p className="mono scanbar faint self-start rounded px-3 py-1.5 text-[12px]">
                {busy === "action" ? "reading the meaning · computing the consequences…" : compare ? `answering · ${model.name} words it · and answers alone…` : `answering · ${model.name} words it…`}
              </p>
            )}
            <div ref={end} />
          </div>

          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" className="chip hover:!border-[var(--accent)] hover:!text-[var(--text)]" disabled={!!busy} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex items-center gap-2">
            <input className="hfield text-[14.5px]" value={q} onChange={(e) => setQ(e.target.value)} disabled={!!busy}
              placeholder={r ? "Ask about it (end with ?) · a new action · or + context" : "Who does what… e.g. My dog chewed the neighbour's shoe."}
              aria-label="Action, context or question" />
            <button className="hbtn-primary" disabled={!!busy || !q.trim()}>Send</button>
          </form>
          {ctx.length > 0 && <p className="mono mt-1.5 text-[11px] text-[var(--amber)]">context for the next action: {ctx.join(" · ")}</p>}
        </section>

        {/* side: meaning + picture */}
        <aside className="flex flex-col gap-4">
          <DnaCard r={r} busy={busy === "action"} />
          {view && (
            <div className="glass-flat p-3">
              <p className="hud-label mb-1">World × ring</p>
              <ButterflyRadar view={view} labels={false} />
              <Link href={`/?q=${encodeURIComponent(r!.text)}${r!.context.length ? `&ctx=${encodeURIComponent(r!.context.join(" "))}` : ""}`} className="hbtn mt-2 block text-center">Play it on the globe ›</Link>
            </div>
          )}
          <div className="glass-flat p-4 text-[13px]">
            <p className="hud-label">Who does what here</p>
            <ol className="mt-2 grid gap-1.5">
              <li><b>1 · NPLM</b> <span className="dim">parses the phrase into Phrase DNA (rules + parser, no LLM).</span></li>
              <li><b>2 · The model</b> <span className="dim">computes the state changes, other actors&apos; goals and reach, with the rule behind each.</span></li>
              <li><b>3 · An LLM</b> <span className="dim">only words the answer from the model&apos;s facts{compare ? "; in compare mode it also answers alone, with no facts" : ""}.</span></li>
            </ol>
            <p className="faint mt-2 text-[11.5px]">None of these run in standalone ACMP: {live.llmReason}.</p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function ActionCard({ r }: { r: PhraseResult }) {
  const v = viewOf(r);
  const worlds = cascadeOf(v).filter((c) => c.hits.length).reverse();
  const relations = r.acm_json?.relations ?? [];
  return (
    <div className="glass-flat brackets mr-6 self-start px-4 py-3 text-[13.5px]">
      <p className="hud-label !text-[var(--accent)]">Consequences</p>
      <p className="mt-1">
        <b>{r.summary.actor}</b> → <b>{r.summary.predicate}</b>
        <span className="faint"> · {r.summary.concept ? `rule ${r.summary.concept}` : "unknown verb: generic consequences only"} · {r.summary.tense} · certainty {r.summary.certainty.toFixed(2)}</span>
      </p>
      <div className="mt-2 grid gap-1.5">
        {worlds.map((c) => (
          <div key={c.world.id} className="flex flex-wrap items-baseline gap-2">
            <WorldTag id={c.world.id} />
            <span className="dim text-[13px]">{c.hits.slice(0, 2).map((h) => `${h.about}: ${h.text}`).join(" · ")}{c.hits.length > 2 ? ` · +${c.hits.length - 2} more` : ""}</span>
          </div>
        ))}
        {worlds.length === 0 && <p className="dim">No rule matched: no claim is made (which is not &ldquo;no impact&rdquo;).</p>}
      </div>
      {relations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {relations.map((rel, k) => (
            <span key={k} className="flex items-center gap-1.5 text-[12.5px]"><b>{rel.intention.owner_label}</b> <GoalPill status={rel.status} /></span>
          ))}
        </div>
      )}
      <p className="faint mt-2 text-[11px]">Worlds are a display mapping of the rings; {v.empties.length ? `no rule matched for: ${v.empties.join(", ")}` : "every ring has a rule"}.</p>
    </div>
  );
}

function AnswerCard({ a, compare }: { a: AskResult; compare: boolean }) {
  const grounded = a.llm && "text" in a.llm ? a.llm : null;
  const alone = a.llm_alone && "text" in a.llm_alone ? a.llm_alone : null;
  const aloneErr = a.llm_alone && "error" in a.llm_alone ? a.llm_alone.error : null;

  const acmPanel = (
    <div className="glass-flat brackets px-4 py-3 text-[13.5px]">
      <p className="hud-label !text-[var(--accent)]">{grounded ? `${grounded.model} + model` : "Model"} · from the facts only</p>
      <p className="mt-1 text-[15px]">{grounded ? grounded.text : a.answer}</p>
      {grounded && <p className="dim mt-2 text-[12.5px]"><span className="mono faint">Model ›</span> {a.answer}</p>}
      {a.chains.slice(0, 3).map((c, k) => (
        <p key={k} className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="chip">{c.ring_title}</span> <b>{c.subject}</b> <span className="dim">{c.text}</span>
          {c.status && <GoalPill status={c.status} />} <Basis b={c.basis} />
        </p>
      ))}
      {a.why.length > 0 && <p className="faint mt-1.5 text-[11.5px]">why: {a.why.join(" · ")}</p>}
      {a.llm && "error" in a.llm && <p className="faint mt-1.5 text-[11.5px]">LLM unavailable ({a.llm.error}); this is the model&apos;s own sentence.</p>}
      {grounded && <p className="faint mt-1.5 text-[11px]">{grounded.seconds}s</p>}
    </div>
  );

  if (!compare) return <div className="mr-6 self-start">{acmPanel}</div>;
  return (
    <div className="grid gap-3 self-stretch md:grid-cols-2">
      <div className="glass-flat px-4 py-3 text-[13.5px]" style={{ borderStyle: "dashed" }}>
        <p className="hud-label">{alone ? alone.model : "LLM"} alone · no facts</p>
        <p className="mt-1 text-[15px]">{alone ? alone.text : <span className="faint">{aloneErr ?? "no answer"}</span>}</p>
        <p className="faint mt-1.5 text-[11.5px]">From its own knowledge: no rule, no state, no certainty.{alone ? ` ${alone.seconds}s` : ""}</p>
      </div>
      {acmPanel}
    </div>
  );
}
