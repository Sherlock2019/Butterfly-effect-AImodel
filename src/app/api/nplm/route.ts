/**
 * ACMP → NPLM (the only outside component ACMP uses, optional).
 *   GET  /api/nplm          is NPLM reachable?
 *   POST /api/nplm {text}   NPLM's phrase analysis for one sentence → { ok, frame, language }
 * Forwards only to NPLM's own endpoints (/health, /api/analyze) at NPLM_URL.
 */

export const dynamic = "force-dynamic";

const NPLM = process.env.NPLM_URL ?? "http://127.0.0.1:8001";

export async function GET() {
  try {
    const r = await fetch(`${NPLM}/health`, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    return Response.json({ ok: r.ok, url: NPLM });
  } catch {
    return Response.json({ ok: false, url: NPLM, error: "NPLM is not running" });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) return Response.json({ ok: false, error: "empty text" }, { status: 400 });
  try {
    // the first call loads NPLM's parser and model: allow up to two minutes
    const r = await fetch(`${NPLM}/api/analyze`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ text, update_context: false }), signal: AbortSignal.timeout(120000),
    });
    if (!r.ok) return Response.json({ ok: false, error: `NPLM answered ${r.status}` });
    const d = (await r.json()) as { phrase_frame?: unknown; language?: { code?: string }; warnings?: string[] };
    return Response.json({ ok: true, frame: d.phrase_frame ?? null, language: d.language?.code ?? null, warnings: d.warnings ?? [] });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).name === "TimeoutError" ? "NPLM timed out" : "NPLM is not running" });
  }
}
