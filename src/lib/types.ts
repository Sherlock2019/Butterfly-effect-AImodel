/** Shapes of the recorded example JSON bundled in public/data (field names are the file format). */

export interface RingRow {
  about: string;
  text: string;
  basis?: string;
  source?: string;
  direction?: string | null;
  reason?: string;
  evidence?: unknown[];
  /** Missions only: the authored world of this consequence. */
  world?: string;
}

export interface Ring {
  key: string;
  title: string;
  question: string;
  extent: string | null;
  rows: RingRow[];
  empty: string | null;
}

export interface Summary {
  action: string;
  predicate: string;
  concept: string | null;
  actor: string;
  self_view: boolean;
  tense: string;
  certainty: number;
  realized: boolean;
  condition: string | null;
  places: string[];
  notes: string[];
}

export interface Relation {
  intention: { owner_label: string; text: string; concept: string | null };
  status: string;
  reason: string;
}

export interface PhraseResult {
  id: string;
  text: string;
  context: string[];
  summary: Summary;
  rings: Ring[];
  report_text?: string;
  acm_json?: { relations?: Relation[]; unknowns?: unknown[]; consequences?: unknown[]; [k: string]: unknown };
  shows?: string;
  suggestions?: string[];
}

export interface DemoResults {
  mode: string;
  badge: string;
  phrases: PhraseResult[];
  flows: Record<string, unknown>;
  [k: string]: unknown;
}

export interface InferenceAnswer {
  subject: string;
  kind: string;
  question: string;
  answer: string;
  why: string[];
}

export interface InferenceItem {
  id: string;
  theme: string;
  shows: string;
  context: string[];
  action: string;
  summary: Summary;
  answers: InferenceAnswer[];
  reasoning: { step: string; detail: string }[];
  rings: Ring[];
}

export interface InferenceSuite {
  stats: {
    scenarios: number;
    questions: number;
    themes: Record<string, number>;
    concepts: string[];
    relations: Record<string, number>;
    layers_reached: Record<string, number>;
  };
  items: InferenceItem[];
}

export interface LlmPair {
  action: string;
  context: string[];
  subject: string;
  prompt: string;
  greedy: string;
  samples: string[];
  seconds: number;
  scenario: string;
  acm: { subject: string; kind: string; question: string; answer: string; status: string; why: string[] };
  llm_distinct_answers: number;
}

export interface LlmVsAcm {
  model: string;
  kind: string;
  recorded: string;
  settings: Record<string, unknown>;
  pairs: LlmPair[];
}

export interface AskChain {
  ring_title: string;
  subject: string;
  text: string;
  basis: string;
  status: string | null;
  certainty: number;
}

export interface AskResult {
  question: { text: string; parsed: boolean; note: string | null };
  intent: string;
  answer: string;
  why: string[];
  chains: AskChain[];
  unknowns: { subject: string; aspect: string; text: string; needs: string[] }[];
  llm?: { text: string; model: string; seconds: number } | { error: string };
  /** compare mode: the same LLM asked with no model facts (the baseline). */
  llm_alone?: { text: string; model: string; seconds: number; grounded: false } | { error: string };
}
