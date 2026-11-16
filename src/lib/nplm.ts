/**
 * NPLM in ACMP's Prediction Routing layer: NPLM translates the trigger (a text, or the sentence taken
 * from an email, article or media description) into an understandable phrase, its Phrase DNA; ACMP's
 * router then uses the parsed verb and object to pick the directly affected world.
 *
 * NPLM is optional and the only outside component ACMP uses. ACMP's server route /api/nplm forwards
 * to NPLM's own POST /api/analyze (NPLM_URL, default http://127.0.0.1:8001) and returns its
 * phrase_frame. This module only reads that frame; the mapping is tolerant of missing fields.
 */

export interface DnaSlot { k: string; v: string | null }
export interface NplmPhrase { dna: DnaSlot[]; verb: string | null; objects: string | null; language: string | null }

type Frame = Record<string, unknown> | null | undefined;

const textOf = (x: unknown): string | null => {
  if (x == null) return null;
  if (typeof x === "string") return x.trim() || null;
  if (Array.isArray(x)) {
    const parts = x.map(textOf).filter((s): s is string => !!s);
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof x === "object") {
    const o = x as Record<string, unknown>;
    return textOf(o.text ?? o.lemma ?? o.value ?? o.surface ?? null);
  }
  return String(x);
};

const first = (f: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const v = textOf(f[k]);
    if (v) return v;
  }
  return null;
};

/** NPLM phrase_frame → Phrase DNA (WHO · DOES · WHAT · TO WHOM · WHERE · WHEN · WHY · HOW). */
export function dnaFromFrame(frame: Frame, language: string | null = null): NplmPhrase {
  const f = (frame ?? {}) as Record<string, unknown>;
  const pred = f.predicate as Record<string, unknown> | string | undefined;
  const verb = typeof pred === "string" ? pred : textOf((pred as Record<string, unknown> | undefined)?.lemma ?? pred);
  const objects = first(f, ["objects", "object", "theme", "patient"]);
  return {
    verb, objects, language,
    dna: [
      { k: "WHO", v: first(f, ["subject", "agent", "actor"]) },
      { k: "DOES", v: verb },
      { k: "WHAT", v: objects },
      { k: "TO WHOM", v: first(f, ["recipients", "recipient", "destination", "beneficiary"]) },
      { k: "WHERE", v: first(f, ["location", "place", "where"]) },
      { k: "WHEN", v: first(f, ["time", "when", "tense"]) },
      { k: "WHY", v: first(f, ["goal", "purpose", "cause", "reason"]) },
      { k: "HOW", v: first(f, ["manner", "instrument", "means"]) },
    ],
  };
}
