"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { SpinGlobe } from "./SpinGlobe";
import { Mark } from "./ui";

/** The four sections of the site, in reading order. */
export const SECTIONS = [
  { href: "/briefing", label: "What problem does this solve?", short: "Problem", n: "1", match: ["/briefing"], c: "var(--action)" },
  { href: "/what", label: "What is it?", short: "What", n: "2", match: ["/what"], c: "var(--accent)" },
  { href: "/how", label: "How it solves it", short: "How", n: "3", match: ["/how", "/scenarios", "/inference", "/lab"], c: "#22c88a" },
  { href: "/", label: "Test it", short: "Test it", n: "4", match: ["/"], c: "var(--amber)" },
  { href: "/next", label: "What next", short: "Next", n: "5", match: ["/next"], c: "var(--w-media)" },
];

/** The parts of "How it solves it": the overview, then each engine working on its own page. */
export const HOW_TABS = [
  { href: "/how", label: "Overview" },
  { href: "/scenarios", label: "Scenario engine" },
  { href: "/inference", label: "What happens next?" },
  { href: "/lab", label: "Physics lab" },
];

const isOn = (path: string, match: string[]) => match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));

/** Title letters, each riding the ripple a little later than the one before (see .bf-letter). */
function Letters({ text, from, className }: { text: string; from: number; className?: string }) {
  return (
    <span className={className}>
      {[...text].map((ch, i) => (
        <span key={i} className="bf-letter" style={{ "--i": from + i } as React.CSSProperties}>{ch === " " ? " " : ch}</span>
      ))}
    </span>
  );
}

/**
 * The title: 40px on desktop (28px tablet, 18px phone so it still fits on one line).
 * Animation: the butterfly flies in and lands on the water, three rings spread under the title,
 * and each letter bobs as the ripple passes. Plays on load and again on hover (at most every 3 s);
 * with reduced motion it is a still title (globals.css).
 */
export function Brand() {
  const [run, setRun] = useState(0);
  const last = useRef(0);
  const replay = () => {
    const now = Date.now();
    if (now - last.current > 3000) { last.current = now; setRun((r) => r + 1); }
  };
  const first = "Butterfly ";
  return (
    <Link href="/" onMouseEnter={replay} onFocus={replay}
      className="relative flex min-w-0 flex-none items-center gap-3 [--bf-rw:260vw] lg:gap-4"
      aria-label="Butterfly Effect Prediction, home">
      <span key={`m${run}`} className="relative inline-flex flex-none">
        <span className="bf-ring" aria-hidden /><span className="bf-ring r2" aria-hidden /><span className="bf-ring r3" aria-hidden /><span className="bf-ring r4" aria-hidden />
        <span className="bf-fly relative"><span className="bf-beat">
          <span className="lg:hidden"><Mark size={44} /></span>
          <span className="hidden lg:inline"><Mark size={72} /></span>
        </span></span>
      </span>
      <span key={`t${run}`} aria-hidden className="hud-title relative whitespace-nowrap text-[18px] leading-none !tracking-[.08em] sm:text-[28px] sm:!tracking-[.16em] lg:text-[40px]">
        <Letters text={first} from={0} />
        <Letters text="Effect Prediction" from={first.length} className="accent" />
      </span>
    </Link>
  );
}

/** The headline beside the title: "AI predicts the next word, / We predict the next World" + a turning globe. */
export function Tagline({ className = "" }: { className?: string }) {
  return (
    <p className={`flex flex-col gap-1 font-semibold leading-none ${className}`}>
      <span className="dim text-[14px] sm:text-[16px] lg:text-[19px]">AI predicts the next word,</span>
      <span className="accent flex items-center gap-2 whitespace-nowrap text-[24px] sm:text-[30px] lg:text-[38px]">
        <span>We predict the next <span className="font-bold">World</span></span>
        <SpinGlobe className="h-[1.25em] w-[1.25em] flex-none" />
      </span>
    </p>
  );
}

export const AUTHOR_EMAIL = "DzoanNguyentran@gmail.com";

/** The author's credit line, under the title (aligned with the title text) and in the footer. */
export function Credit({ under = false }: { under?: boolean }) {
  return (
    <p className={`mono text-[10.5px] leading-snug tracking-[.04em] sm:text-[11px] ${under ? "pl-[56px] lg:pl-[88px]" : ""}`}>
      <span className="dim">Made with </span><span style={{ color: "var(--action)" }}>love</span><span className="dim"> by </span>
      <a href={`mailto:${AUTHOR_EMAIL}`} className="accent underline decoration-dotted underline-offset-4 hover:brightness-125">{AUTHOR_EMAIL}</a>
      <span className="dim"> · </span><span style={{ color: "var(--amber)" }}>A better World Builder</span>
    </p>
  );
}

/**
 * The five numbered sections in one neon-blue (--accent) style: muted labels that turn blue on hover,
 * and the current page outlined and softly glowing in blue. Labels shorten on narrow screens.
 */
export function MainNav() {
  const path = usePathname() ?? "/";
  return (
    <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto py-0.5 sm:gap-1 md:flex-wrap md:gap-1.5" aria-label="Main">
      {SECTIONS.map((s) => {
        const on = isOn(path, s.match);
        const neon = "var(--accent)";
        const style: React.CSSProperties = on
          ? {
              color: neon,
              borderColor: `color-mix(in srgb, ${neon} 70%, transparent)`,
              background: `color-mix(in srgb, ${neon} 12%, transparent)`,
              boxShadow: `0 0 18px -6px ${neon}, inset 0 0 12px -8px ${neon}`,
            }
          : { borderColor: "transparent" };
        return (
          <Link key={s.href} href={s.href} aria-current={on ? "page" : undefined} style={style}
            className={`mono flex items-center whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium uppercase tracking-[.06em] transition md:px-3 md:py-1.5 md:text-[12.5px] md:tracking-[.08em] ${on ? "" : "dim hover:!border-[color:color-mix(in_srgb,var(--accent)_35%,transparent)] hover:text-[var(--accent)]"}`}>
            <span className="mr-1.5 font-semibold tabular-nums md:mr-2" style={{ color: neon, opacity: on ? 1 : 0.7 }}>{`0${s.n}`}</span>
            <span className="hidden md:inline">{s.label}</span>
            <span className="md:hidden">{s.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Second row inside "How it solves it". */
function HowTabs() {
  const path = usePathname() ?? "/";
  return (
    <div className="border-t hairline">
      <nav className="mx-auto flex max-w-[1320px] items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6" aria-label="How it solves it">
        {HOW_TABS.map((t) => {
          const on = path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[12.5px] ${on ? "bg-white/10 text-[var(--text)]" : "dim hover:text-[var(--text)]"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Top bar for every page except the console, which uses Brand + MainNav in its own header. */
export function HudNav() {
  const path = usePathname() ?? "/";
  return (
    <header className="sticky top-0 z-40 border-b hairline" style={{ background: "rgba(7,8,13,.82)", backdropFilter: "blur(14px)" }}>
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 pb-2.5 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1"><Brand /><Credit under /></div>
          <Tagline />
        </div>
        <MainNav />
      </div>
      {isOn(path, SECTIONS[2].match) && <HowTabs />}
    </header>
  );
}

/** "Next section" links at the end of a page, so the four sections read in order. */
export function NextSteps({ items }: { items: { href: string; label: string; primary?: boolean }[] }) {
  return (
    <div className="mt-12 flex flex-wrap gap-3 border-t hairline pt-8">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={i.primary ? "hbtn-primary" : "hbtn"}>{i.label}</Link>
      ))}
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="gridbg min-h-screen">
      <HudNav />
      <main className="mx-auto max-w-[1320px] px-4 pb-24 pt-10 sm:px-6">{children}</main>
      <footer className="border-t hairline">
        <div className="faint mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs sm:px-6">
          <span className="flex flex-col gap-1">
            <span>© 2026 Dzoan Nguyen Tran · MIT · Butterfly Effect Prediction (ACMP)</span>
            <Credit />
          </span>
          <span>
            Archive: <Link href="/chat" className="underline decoration-dotted underline-offset-2">recorded chat design</Link> ·{" "}
            <Link href="/classic" className="underline decoration-dotted underline-offset-2">classic console</Link>
          </span>
          <span>Interface adapted from God&apos;s Eye View (MIT, © 2026 Bilawal Sidhu) · Globe: CesiumJS · Imagery: Esri</span>
        </div>
      </footer>
    </div>
  );
}
