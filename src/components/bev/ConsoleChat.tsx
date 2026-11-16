"use client";

import { useEffect, useRef, useState } from "react";
import { CATALOG, type Scenario } from "@/lib/catalog";
import { postJson } from "@/lib/data";
import { MISSIONS, type Mission } from "@/lib/scenarios";
import type { AskResult, PhraseResult } from "@/lib/types";
import type { NplmPhrase } from "@/lib/nplm";
import { Basis, GoalPill } from "../ui";
import { WorldChip } from "./shared";
import { ACTOR, CHANNEL, actorKindOf, extractAction, type Channel, type Trigger } from "@/lib/trigger";
import { WORLDS, color } from "@/lib/worlds";

export interface AnalyzeOutcome { ok: boolean; text: string; engine: "live" | "offline" | "error"; detail?: string }

type Msg =
  | { role: "user"; text: string; ctx?: string[] }
  | { role: "sys"; text: string }
  | { role: "ctx"; text: string }
  | { role: "answer"; a: AskResult }
  | { role: "err"; text: string };

const EXAMPLE = "An AI agent gains unauthorized access to a bank's payment system in Paris.";
const EXAMPLES: Record<Channel, string> = {
  chat: EXAMPLE,
  email: "From: alerts@bank.example\nSubject: Security incident\n\nAn AI agent gained unauthorized access to our payment system this morning. Payments may be delayed.",
  article: "Storm warning (fictional)\nA hurricane made landfall on the coast overnight with strong winds and storm surge. Thousands are without power.",
  image: "A cat pushes a tea cup off the table.",
  video: "A child kicks a ball through the neighbour's window.",
  sound: "A pedestrian hears a fire alarm and sees smoke.",
  sensor: EXAMPLE,
};

export function ConsoleChat({ active, pathway, setPathway, onScenario, onMission, onAnalyze, busy, current, phrase }: {
  active: string | null; pathway: string; setPathway: (p: string) => void;
  onScenario: (s: Scenario) => void; onMission: (m: Mission) => void;
  onAnalyze: (text: string, context: string[], trigger: Trigger) => Promise<AnalyzeOutcome>;
  r: PhraseResult | null; busy: boolean; live: boolean; liveReason: string; current: Scenario | null;
  phrase: { phrase: NplmPhrase | null; note: string | null } | null;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ctx, setCtx] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [channel, setChannel] = useState<Channel>("chat");
  const [media, setMedia] = useState<{ url: string; name: string; type: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs]);

  async function submit() {
    const t = q.trim();
    if (!t) {
      setHint(CHANNEL[channel].media ? "Describe in one sentence what the file shows: ACMP cannot recognise images, video or sound itself." : channel === "email" ? "Paste the email (subject and body)." : channel === "article" ? "Paste the article or broadcast text." : "Describe an action first: who did what (to whom, where, when, how, why are optional).");
      box.current?.focus();
      return;
    }
    setHint(null);
    if (channel !== "chat") {
      const { action, note } = extractAction(channel, t);
      if (!action) { setHint("No action sentence found in that text."); return; }
      const trigger: Trigger = { actor: actorKindOf(action), channel, source: t };
      setMsgs((m) => [...m, { role: "user", text: `${CHANNEL[channel].icon} ${CHANNEL[channel].label}${media ? ` · ${media.name}` : ""}\n${t}` }, { role: "sys", text: `Action taken from it (${note}): “${action}” · actor guessed: ${ACTOR[trigger.actor].label}` }]);
      const out = await onAnalyze(action, ctx, trigger);
      if (out.ok) { setQ(""); setCtx([]); setMsgs((m) => [...m, { role: "sys", text: out.text }]); }
      else setMsgs((m) => [...m, { role: "err", text: `${out.text} Your text is kept in the box.` }]);
      return;
    }
    if (t.startsWith("+")) {
      const c = t.slice(1).trim();
      setCtx((x) => [...x, c]);
      setMsgs((m) => [...m, { role: "ctx", text: c }]);
      setQ("");
      return;
    }
    if (t.endsWith("?")) {
      // ACMP has no question-answering model: say so, keep the text, simulate nothing
      setMsgs((m) => [...m, { role: "user", text: t }, { role: "err", text: "Follow-up questions are not available in ACMP yet (no answering model). Explore the cascade instead: select a consequence to see its rule, assumptions and unknowns. Your question is kept in the box." }]);
      return;
    }
    const c = ctx;
    setMsgs((m) => [...m, { role: "user", text: t, ctx: c }]);
    const out = await onAnalyze(t, c, { actor: actorKindOf(t), channel: "chat", source: t });
    if (out.ok) {
      setQ("");
      setCtx([]);
      setMsgs((m) => [...m, { role: "sys", text: out.text }]);
    } else {
      setMsgs((m) => [...m, { role: "err", text: `${out.text} Your text is kept in the box.` }]);
    }
  }

  const list = showAll ? CATALOG : CATALOG.filter((s) => s.id === active);

  return (
    <div className="flex flex-col">
      {/* scenarios */}
      <div className="border-b hairline p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="hud-label !text-[var(--accent)]">Scenarios · by world ({CATALOG.length})</h2>
          <button type="button" className="faint text-[10.5px]" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>{showAll ? "collapse" : `show all ${CATALOG.length}`}</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {WORLDS.map((w) => {
            const items = list.filter((s) => s.world === w.id);
            if (!items.length) return null;
            return (
              <div key={w.id}>
                {showAll && <p className="mono faint mb-0.5 flex items-center gap-1 text-[9.5px] uppercase tracking-wider"><span className="swatch" style={{ background: color(w.id) }} />{w.icon} {w.short}</p>}
                <ul className="flex flex-col gap-1">
                  {items.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => onScenario(s)} aria-pressed={active === s.id}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors hover:border-[var(--accent)] ${active === s.id ? "border-[var(--accent)] bg-[var(--accent-dim)]" : "border-[var(--glass-border)]"}`}>
                        <span className="text-base" aria-hidden>{s.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold">{s.title}</span>
                          <span className="mono faint block truncate text-[9.5px]">
                            {ACTOR[s.trigger.actor].icon} {ACTOR[s.trigger.actor].label} · via {CHANNEL[s.trigger.channel].icon} {CHANNEL[s.trigger.channel].label.toLowerCase()}
                          </span>
                        </span>
                        <WorldChip id={s.world} suffix={s.scale ? <span className="faint">›{s.scale}</span> : null} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {current && (
          <div className="mt-2 rounded-lg border border-[var(--action)] bg-[rgba(255,59,59,.06)] p-2" aria-label="Trigger of the selected scenario">
            <p className="hud-label !text-[var(--action)]">⚡ Trigger · what starts the change</p>
            <p className="mt-1 text-[11.5px]"><b>{ACTOR[current.trigger.actor].icon} {ACTOR[current.trigger.actor].label}</b> <span className="faint">({current.actor})</span> · received as <b>{CHANNEL[current.trigger.channel].icon} {CHANNEL[current.trigger.channel].label.toLowerCase()}</b></p>
            <pre className="mono dim mt-1 whitespace-pre-wrap rounded bg-black/30 p-1.5 text-[10.5px]">{current.trigger.source}</pre>
            <p className="faint mt-0.5 text-[10px]">Fictional input. {CHANNEL[current.trigger.channel].media ? "Media is not analysed by ACMP: the scenario states what it shows." : "Its action sentence is the scenario's."}</p>
          </div>
        )}
        <p className="faint mt-1.5 text-[10.5px]">Illustrative: starting states written by hand, cascades derived by ACMP&apos;s prototype rules.</p>
        {current?.pathways && (
          <div className="mt-2 rounded-lg border hairline p-2" role="group" aria-label="Energy pathway">
            <p className="hud-label mb-1">Illustrative conditional pathway</p>
            <div className="flex flex-wrap gap-1">
              {current.pathways.map((p) => <button key={p.id} type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={pathway === p.id} onClick={() => setPathway(p.id)}>{p.short}</button>)}
              <button type="button" className="hbtn !px-2 !py-1 !text-[10px]" aria-pressed={pathway === "none"} onClick={() => setPathway("none")}>Not specified</button>
            </div>
          </div>
        )}
        <details className="mt-2">
          <summary className="faint cursor-pointer text-[10.5px]">Earlier missions ({MISSIONS.length}, authored mockups with an inside view)</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {MISSIONS.map((m) => (
              <li key={m.id}><button type="button" className="chip w-full !justify-start hover:!border-[var(--accent)]" onClick={() => onMission(m)}>{m.icon} {m.title}</button></li>
            ))}
          </ul>
        </details>
      </div>

      {/* conversation */}
      <div className="border-b hairline p-3">
        <h2 className="hud-label mb-1.5 !text-[var(--accent)]">Your action · conversation</h2>
        <div className="scroll flex max-h-[34vh] flex-col gap-1.5 pr-1" aria-live="polite">
          {msgs.length === 0 && (
            <p className="faint text-[12px] leading-relaxed">
              Describe who did what, to whom, where, when, how and why. Only the actor and action are needed.
              Add context first with <span className="mono">+</span> (<i>+ Mark wants to buy my car.</i>); it is kept as an assumption.
            </p>
          )}
          {msgs.map((m, i) => {
            if (m.role === "user")
              return (
                <div key={i} className="ml-6 self-end rounded-xl rounded-br-sm bg-[var(--accent-dim)] px-3 py-1.5 text-[13px]">
                  <span className="whitespace-pre-wrap">{m.text}</span>
                  {m.ctx && m.ctx.length > 0 && <span className="faint block text-[11px]">with: {m.ctx.join(" · ")}</span>}
                  <button type="button" className="faint mt-0.5 block text-[10.5px] hover:text-[var(--text)]" onClick={() => { setQ(m.text); box.current?.focus(); }}>✎ edit & resubmit</button>
                </div>
              );
            if (m.role === "ctx") return <p key={i} className="mono self-end text-[11px] text-[var(--amber)]">+ context: {m.text}</p>;
            if (m.role === "sys") return <p key={i} className="mono faint whitespace-pre-wrap text-[11px]">› {m.text}</p>;
            if (m.role === "err") return <p key={i} role="alert" className="text-[12px] text-[var(--bad)]">{m.text}</p>;
            const a = m.a;
            return (
              <div key={i} className="glass-flat mr-4 px-3 py-2 text-[12.5px]">
                <p className="mono faint text-[9.5px] uppercase">Answer</p>
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
          {(busy || asking) && <p className="mono scanbar faint rounded px-2 py-1 text-[11px]" role="status">{asking ? "Computing the answer…" : "Analyzing: routing and cascade…"}</p>}
          <div ref={end} />
        </div>
      </div>

      {/* prompt */}
      <form className="flex flex-col gap-2 border-b hairline p-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <p className="hud-label !text-[var(--action)]">⚡ The trigger · how does the action arrive?</p>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Input channel">
          {(["chat", "email", "article", "image", "video", "sound"] as Channel[]).map((c) => (
            <button key={c} type="button" role="tab" aria-selected={channel === c} aria-pressed={channel === c} className="hbtn !px-2 !py-1 !text-[10px]"
              onClick={() => { setChannel(c); setMedia(null); setHint(null); }}>{CHANNEL[c].icon} {c}</button>
          ))}
        </div>
        {CHANNEL[channel].media && (
          <div className="rounded-lg border hairline p-2 text-[11px]">
            <label className="hbtn inline-flex cursor-pointer !py-1 !text-[10px]">
              {channel === "image" ? "Choose or take a photo" : channel === "video" ? "Choose or record a video" : "Choose or record a sound"}
              <input type="file" className="sr-only" accept={channel === "image" ? "image/*" : channel === "video" ? "video/*" : "audio/*"} capture={channel === "sound" ? undefined : "environment"}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setMedia({ url: URL.createObjectURL(f), name: f.name, type: f.type }); }} />
            </label>
            {media && (
              <div className="mt-1.5">
                {channel === "image" && <img src={media.url} alt="Selected input (preview, kept in this browser)" className="max-h-32 rounded" />}
                {channel === "video" && <video src={media.url} controls className="max-h-32 rounded" />}
                {channel === "sound" && <audio src={media.url} controls className="w-full" />}
              </div>
            )}
            <p className="faint mt-1">The file stays in your browser. ACMP has no image, video or sound recognition, so describe what it shows below; that sentence is analysed.</p>
          </div>
        )}
        <label htmlFor="action-prompt" className="sr-only">Action input</label>
        <textarea id="action-prompt" ref={box} rows={channel === "email" || channel === "article" ? 6 : 4} className="hfield resize-y !py-2 text-[13px] leading-relaxed" value={q} onChange={(e) => { setQ(e.target.value); if (hint) setHint(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
          placeholder={channel === "email" ? "From: …\nSubject: …\n\nPaste the email body: the first sentence is taken as the action."
            : channel === "article" ? "Headline\nPaste the article or broadcast transcript: the first sentence after the headline is taken as the action."
              : CHANNEL[channel].media ? "What does it show? e.g. “A dog runs onto the road in front of a cyclist.”"
                : `e.g. “${EXAMPLE}”\nWho · does what · to whom · where · when · how · why (all optional except who and what)`}
          aria-describedby="prompt-help" disabled={busy && !q} />
        {hint && <p role="alert" className="text-[11.5px] text-[var(--warn)]">{hint}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-action" disabled={busy || asking}>{busy ? "Analyzing…" : q.trim().endsWith("?") ? "Ask about this action" : "Analyze consequences"}</button>
          <button type="button" className="hbtn !py-1.5 !text-[10px]" onClick={() => setQ(EXAMPLES[channel])}>Use example</button>
          <span className="mono faint ml-auto text-[10px]">Ctrl+Enter</span>
        </div>
        <p id="prompt-help" className="faint text-[10.5px] leading-snug">
          ACMP routes the action to the world it directly impacts and runs its prototype cascade (illustrative). Follow-up questions are not available yet; there is no conversation memory.
        </p>
        {ctx.length > 0 && <p className="mono text-[10.5px] text-[var(--amber)]">context for the next action: {ctx.join(" · ")}</p>}
      </form>

      {/* prediction routing, step 1: the phrase NPLM translated the action into */}
      <div className="p-3">
        <div className={`glass-flat brackets px-3 py-2.5 ${busy ? "scanbar" : ""}`} aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="hud-label !text-[var(--accent)]">Routing · NPLM phrase</p>
            <p className="hud-label">{busy ? "translating…" : phrase?.phrase ? `NPLM${phrase.phrase.language ? ` · ${phrase.phrase.language}` : ""}` : phrase ? "NPLM not used" : "awaiting an action"}</p>
          </div>
          <dl className="grid grid-cols-[66px_1fr] gap-x-2 gap-y-[3px]">
            {(phrase?.phrase?.dna ?? ["WHO", "DOES", "WHAT", "TO WHOM", "WHERE", "WHEN", "WHY", "HOW"].map((k) => ({ k, v: null }))).map((d) => (
              <div key={d.k} className="contents">
                <dt className="hud-label pt-[3px]">{d.k}</dt>
                <dd className="mono text-[12.5px]">{d.v ?? <span className="faint text-[11px]">{phrase?.phrase ? "— not stated" : "·"}</span>}</dd>
              </div>
            ))}
          </dl>
          {phrase && !phrase.phrase && <p className="mt-1.5 text-[11px] text-[var(--amber)]">{phrase.note}: the world was picked from the words only. Start NPLM to translate actions into phrases.</p>}
        </div>
        <p className="faint mt-1 text-[10.5px]">NPLM turns any trigger (typed, email, article, or the description of an image, video or sound) into this phrase; ACMP&apos;s rules then pick the directly affected world.</p>
      </div>
    </div>
  );
}
