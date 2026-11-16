"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./ui";

export const LINKS = [
  { href: "/", label: "Console", n: "▶" },
  { href: "/chat", label: "Demo chat", n: "◉" },
  { href: "/briefing", label: "Briefing", n: "§" },
  { href: "/scenarios", label: "Scenario Engine", n: "E1" },
  { href: "/inference", label: "What happens next?", n: "E2" },
  { href: "/lab", label: "Physics lab", n: "E3" },
];

/** Top bar for the pages around the console. */
export function HudNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b hairline" style={{ background: "rgba(7,8,13,.82)", backdropFilter: "blur(14px)" }}>
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark size={26} />
          <span className="hud-title text-[13px]">Butterfly <span className="accent">Eye View</span></span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto" aria-label="Main">
          {LINKS.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
                className={`mono whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] uppercase tracking-[.12em] ${on ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "dim hover:text-[var(--text)]"}`}>
                <span className="faint mr-1.5">{l.n}</span>{l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="gridbg min-h-screen">
      <HudNav />
      <main className="mx-auto max-w-[1320px] px-4 pb-24 pt-10 sm:px-6">{children}</main>
      <footer className="border-t hairline">
        <div className="faint mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs sm:px-6">
          <span>© 2026 Dzoan Nguyen Tran · MIT · ACMP · The Butterfly Model</span>
          <span>Interface adapted from God&apos;s Eye View (MIT, © 2026 Bilawal Sidhu) · Globe: CesiumJS · Imagery: Esri</span>
        </div>
      </footer>
    </div>
  );
}
