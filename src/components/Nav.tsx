"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
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
 * The title, 3× the old 13px on desktop (39px), smaller on narrow screens so it always fits.
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
      className="relative flex min-w-0 flex-none items-center gap-3 [--bf-rw:420px] lg:gap-4 lg:[--bf-rw:1150px]"
      aria-label="Butterfly Effect Prediction, home">
      <span key={`m${run}`} className="relative inline-flex flex-none">
        <span className="bf-ring" aria-hidden /><span className="bf-ring r2" aria-hidden /><span className="bf-ring r3" aria-hidden />
        <span className="bf-fly relative"><span className="bf-beat">
          <span className="lg:hidden"><Mark size={32} /></span>
          <span className="hidden lg:inline"><Mark size={64} /></span>
        </span></span>
      </span>
      <span key={`t${run}`} aria-hidden className="hud-title relative whitespace-nowrap text-[13.5px] leading-none !tracking-[.1em] sm:text-[24px] sm:!tracking-[.22em] lg:text-[39px]">
        <Letters text={first} from={0} />
        <Letters text="Effect Prediction" from={first.length} className="accent" />
      </span>
    </Link>
  );
}

/**
 * The five numbered sections, each in its own colour: a coloured number badge, coloured label and
 * tinted outline; the current page is filled with its colour. Labels shorten on narrow screens.
 */
export function MainNav() {
  const path = usePathname() ?? "/";
  return (
    <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto py-0.5 sm:gap-1 md:flex-wrap md:gap-1.5" aria-label="Main">
      {SECTIONS.map((s) => {
        const on = isOn(path, s.match);
        const dark = "#07080d";
        const style: React.CSSProperties = on
          ? { background: s.c, borderColor: s.c, color: dark, boxShadow: `0 0 22px -6px ${s.c}` }
          : { color: s.c, borderColor: `color-mix(in srgb, ${s.c} 50%, transparent)`, background: `color-mix(in srgb, ${s.c} 10%, transparent)` };
        return (
          <Link key={s.href} href={s.href} aria-current={on ? "page" : undefined} style={style}
            className="mono flex items-center whitespace-nowrap rounded-lg border px-1 py-1 text-[11.5px] font-semibold uppercase tracking-normal transition hover:brightness-125 md:px-2.5 md:py-1.5 md:text-[15px] md:tracking-[.05em] xl:rounded-xl xl:px-3 xl:text-[20px] xl:tracking-[.03em]">
            <span className="mr-1 rounded px-1 font-bold leading-snug md:mr-2 md:px-1.5" style={on ? { background: dark, color: s.c } : { background: s.c, color: dark }}>{s.n}</span>
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
      <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 pb-2 pt-3 sm:px-6">
        <Brand />
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
          <span>© 2026 Dzoan Nguyen Tran · MIT · Butterfly Effect Prediction (ACMP)</span>
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
