"use client";

import { useEffect, useRef, useState } from "react";
import { phraseDna } from "@/lib/butterfly";
import { postJson } from "@/lib/data";
import type { AskResult, PhraseResult } from "@/lib/types";
import { Basis, GoalPill } from "../ui";

/**
 * The intake chat (classic console). Type an action with its actor: it is parsed into Phrase DNA,
 * which fills the card slot by slot, then the cascade plays on the globe.
 *   "+ Mark wants to buy my car."  adds context (another person's goal) for the next action
 *   "What happens to Mark?"        (ends with ?) asks the model about the current action
 *   anything else                  is a new action
 */

type Msg =
  | { role: "user"; text: string; ctx?: string[] }
  | { role: "sys"; text: string }
  | { role: "ctx"; text: string }
  | { role: "answer"; a: AskResult }
  | { role: "err"; text: string };

const SLOT_HINT: Record<string, string> = {
  WHO: "the actor", DOES: "the action", WHAT: "the object", "TO WHOM": "who receives it", WHERE: "the place → picks the world",
  WHEN: "time / tense", WHY: "for what: the desired outcome", HOW: "manner / instrument",
};

export function DnaCard({ r, busy }: { r: PhraseResult | null; busy: boolean }) {
  const dna = r ? phraseDna(r) : Object.keys(SLOT_HINT).map((k) => ({ k, v: null as string | null }));
  return (
    <div className={`glass-flat brackets px-3 py-2.5 ${busy ? "scanbar" : ""}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="hud-label !text-[var(--accent)]">Phrase DNA</p>
        <p className="hud-label">{r ? `concept ${r.summary.concept ?? "unknown"}` : busy ? "parsing…" : "awaiting an action"}</p>
      </div>
      <dl className="grid grid-cols-[66px_1fr] gap-x-2 gap-y-[3px]">
        {dna.map((d, i) => (
          <div key={`${r?.text ?? "empty"}-${d.k}`} className="contents">
            <dt className="hud-label pt-[3px]">{d.k}</dt>
            <dd className="mono text-[12.5px]">
              {d.v ? (
                <span className="typein inline-block" style={{ animationDelay: `${i * 0.12}s` }}>{d.v}</span>
              ) : (
                <span className="faint text-[11px]">{r ? "— not stated" : SLOT_HINT[d.k]}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {r && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="chip">{r.summary.tense}</span>
          <span className="chip">certainty {r.summary.certainty.toFixed(2)}</span>
          {r.summary.self_view && <span className="chip">self-view: an agent checking its own plan</span>}
          {!r.summary.realized && <span className="chip">not realised (negated)</span>}
        </div>
      )}
    </div>
  );
}

export function Intake({ r, busy, live, liveReason, onAction }: {
  r: PhraseResult | null; busy: boolean; live: boolean; liveReason: string;
  onAction: (text: string, context: string[]) => Promise<void>;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ctx, setCtx] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);

  // an action started elsewhere (example, demo) shows up in the thread too
  useEffect(() => {
    if (!r || last.current === r.text) return;
    last.current = r.text;
    setMsgs((m) => {
      const typed = m.length && m[m.length - 1].role === "user" && (m[m.length - 1] as { text: string }).text === r.text;
      const add: Msg[] = typed ? [] : [{ role: "user", text: r.text, ctx: r.context }];
      return [...m, ...add, { role: "sys", text: `Parsed. ${r.summary.actor} → ${r.summary.predicate}${r.summary.concept ? ` (${r.summary.concept})` : " (unknown verb: no verdict)"}. Routing and cascade on the globe…` }];
    });
  }, [r]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" }); // newer Chrome returns a Promise here: keep it out of the effect
  }, [msgs]);

  async function send() {
    const t = q.trim();
    if (!t) return;
    setQ("");
    if (t.startsWith("+")) {
      const c = t.slice(1).trim();
      setCtx((x) => [...x, c]);
      setMsgs((m) => [...m, { role: "ctx", text: c }]);
      return;
    }
    if (!live) {
      setMsgs((m) => [...m, { role: "user", text: t }, { role: "err", text: `The live model is offline (${liveReason}). Pick an example below or RUN DEMO.` }]);
      return;
    }
    if (t.endsWith("?") && r) {
      setMsgs((m) => [...m, { role: "user", text: t }]);
      setAsking(true);
      try {
        const a = await postJson<AskResult>("follow-up questions", { text: r.text, context: r.context, question: t });
        setMsgs((m) => [...m, { role: "answer", a }]);
      } catch (e) {
        setMsgs((m) => [...m, { role: "err", text: (e as Error).message }]);
      } finally {
        setAsking(false);
      }
      return;
    }
    setMsgs((m) => [...m, { role: "user", text: t, ctx }]);
    last.current = null;
    const c = ctx;
    setCtx([]);
    await onAction(t, c);
  }

  const presets = r?.suggestions?.slice(0, 4) ?? [];

  return (
    <div className="flex flex-col gap-2.5">
      <DnaCard r={r} busy={busy} />
      <div className="scroll flex max-h-[30vh] flex-col gap-1.5 pr-1">
        {msgs.length === 0 && (
          <p className="faint text-[12px] leading-relaxed">
            Type an action with its actor, e.g. <i className="dim">I will sell my car to Sarah in Paris tomorrow to pay my debt.</i> Add other people&apos;s goals first with
            <span className="mono"> + </span>(<i className="dim">+ Mark wants to buy my car.</i>). Then ask questions ending in <span className="mono">?</span>
          </p>
        )}
        {msgs.map((m, i) => {
          if (m.role === "user")
            return (
              <div key={i} className="ml-6 self-end rounded-xl rounded-br-sm bg-[var(--accent-dim)] px-3 py-1.5 text-[13px]">
                {m.text}
                {m.ctx && m.ctx.length > 0 && <span className="faint block text-[11px]">with: {m.ctx.join(" · ")}</span>}
              </div>
            );
          if (m.role === "ctx") return <p key={i} className="mono self-end text-[11px] text-[var(--amber)]">+ context: {m.text}</p>;
          if (m.role === "sys") return <p key={i} className="mono faint text-[11px]">› {m.text}</p>;
          if (m.role === "err") return <p key={i} className="text-[12px] text-[var(--bad)]">{m.text}</p>;
          const a = m.a;
          return (
            <div key={i} className="glass-flat mr-4 px-3 py-2 text-[12.5px]">
              <p className="text-[14px] font-semibold">{a.answer}</p>
              {a.llm && "text" in a.llm && <p className="dim mt-1 italic">“{a.llm.text}” <span className="faint not-italic">· worded by {a.llm.model} from the model&apos;s facts only</span></p>}
              {a.chains.slice(0, 3).map((c, k) => (
                <p key={k} className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                  <span className="chip">{c.ring_title}</span> <b>{c.subject}</b> <span className="dim">{c.text}</span>
                  {c.status && <GoalPill status={c.status} />} <Basis b={c.basis} />
                </p>
              ))}
              {a.why.length > 0 && <p className="faint mt-1 text-[11px]">why: {a.why.join(" · ")}</p>}
            </div>
          );
        })}
        {(busy || asking) && <p className="mono scanbar faint rounded px-2 py-1 text-[11px]">{asking ? "the model computes · the local LLM words it…" : r && last.current === r.text ? "consequences cascading on the globe…" : "reading the meaning…"}</p>}
        <div ref={end} />
      </div>
      {presets.length > 0 && live && (
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button key={p} type="button" className="chip hover:!border-[var(--accent)] hover:!text-[var(--text)]" onClick={() => setQ(p.endsWith("?") ? p : p + "?")}>{p}</button>
          ))}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
        <input className="hfield !py-2 text-[13px]" value={q} onChange={(e) => setQ(e.target.value)} disabled={busy}
          placeholder={r ? "New action · + context · or a question?" : "Who does what… e.g. John sold his car to Sarah."} aria-label="Action, context or question" />
        <button className="hbtn-primary !px-3" disabled={busy || asking || !q.trim()}>›</button>
      </form>
      {ctx.length > 0 && <p className="mono text-[10.5px] text-[var(--amber)]">context for the next action: {ctx.join(" · ")}</p>}
    </div>
  );
}
