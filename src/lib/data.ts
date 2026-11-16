"use client";

import { useEffect, useState } from "react";

/** Load a bundled data file from /data (recorded examples stored in ACMP). */
export function useJson<T>(file: string | null): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    if (!file) return;
    let alive = true;
    setState({ data: null, error: null });
    fetch(`/data/${file}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${file}: ${r.status}`))))
      .then((d: T) => alive && setState({ data: d, error: null }))
      .catch((e: Error) => alive && setState({ data: null, error: e.message }));
    return () => {
      alive = false;
    };
  }, [file]);
  return state;
}

export interface LiveStatus {
  checked: boolean;
  text: boolean;
  llm: boolean;
  reason: string;
  llmReason: string;
}

export const STANDALONE = "not available in ACMP (standalone: no external engine or LLM; NPLM is used only for phrases)";

/** ACMP is standalone: there is no external service to reach. Live-only features say so. */
export function useLive(): LiveStatus {
  return { checked: true, text: false, llm: false, reason: STANDALONE, llmReason: STANDALONE };
}

/** Kept so older pages compile; it never makes a network call in ACMP. */
export async function postJson<T>(url: string, _body: unknown): Promise<T> {
  throw new Error(`${url}: ${STANDALONE}`);
}
