/**
 * The action is the trigger of change. It has an ACTOR (human, AI, animal, natural phenomenon,
 * organisation, technical system) and arrives through a CHANNEL: typed in the chat, an email, a news
 * article or broadcast, or captured as an image, video, sound or sensor alert.
 *
 * Text channels are reduced to one action sentence here (NPLM can parse it when connected; ACMP's
 * router uses it either way). Image, video and sound need a recognition model that ACMP does not
 * have: they are accepted and previewed locally, and the user describes what they show.
 */

export type ActorKind = "human" | "ai" | "animal" | "nature" | "organization" | "system";
export type Channel = "chat" | "email" | "article" | "image" | "video" | "sound" | "sensor";

export interface Trigger {
  actor: ActorKind;
  channel: Channel;
  /** The input as received (fictional for scenarios). */
  source: string;
}

export const ACTOR: Record<ActorKind, { icon: string; label: string }> = {
  human: { icon: "🧍", label: "Human" },
  ai: { icon: "🤖", label: "AI" },
  animal: { icon: "🐾", label: "Animal" },
  nature: { icon: "⛈️", label: "Natural phenomenon" },
  organization: { icon: "🏢", label: "Organisation" },
  system: { icon: "⚙️", label: "Technical system" },
};

export const CHANNEL: Record<Channel, { icon: string; label: string; media: boolean }> = {
  chat: { icon: "💬", label: "Typed in the chat", media: false },
  email: { icon: "✉️", label: "Email message", media: false },
  article: { icon: "📰", label: "News article / broadcast", media: false },
  image: { icon: "🖼️", label: "Image", media: true },
  video: { icon: "🎞️", label: "Video", media: true },
  sound: { icon: "🔊", label: "Sound", media: true },
  sensor: { icon: "📟", label: "Sensor / system alert", media: false },
};

const has = (s: string, words: string[]) => new RegExp(`\\b(${words.join("|")})`, "i").test(s);

/** Who triggers the action, guessed from the words of the sentence's start (shown as a guess). */
export function actorKindOf(text: string): ActorKind {
  const head = text.split(/\b(?:gains?|deploys?|publishes?|kicks?|pushes?|decides?|hears?|sees?|strikes?|damages?|switch|stops?|proposes?|raises?|interrupts?)\b/i)[0] || text;
  if (has(head, ["ai agent", "ai\\b", "bot\\b", "chatbot", "algorithm", "robot", "model\\b"])) return "ai";
  if (has(head, ["cat\\b", "dog\\b", "bird", "horse", "cow\\b", "animal", "deer", "fox\\b", "bee\\b", "wolf"])) return "animal";
  if (has(head, ["lightning", "storm", "earthquake", "flood", "wildfire", "hurricane", "drought", "landslide", "tsunami", "heatwave", "wind\\b"])) return "nature";
  if (has(head, ["company", "government", "bank\\b", "outlet", "ministry", "regulator", "factory", "supplier", "council", "firm\\b", "market"])) return "organization";
  if (has(head, ["cable", "server", "system\\b", "sensor", "pump", "transformer", "outage", "fault"])) return "system";
  return "human";
}

const firstSentence = (s: string) => (s.trim().match(/^[\s\S]*?[.!?](\s|$)/)?.[0] ?? s).trim();

/** One action sentence from a text input; `note` says how it was taken. */
export function extractAction(channel: Channel, raw: string): { action: string; note: string } {
  const text = raw.trim();
  if (!text) return { action: "", note: "empty" };
  if (channel === "email") {
    const subject = text.match(/^subject:\s*(.+)$/im)?.[1]?.trim() ?? "";
    const parts = text.split(/\r?\n\s*\r?\n/);
    const headerish = /^(from|to|cc|date|subject):/im.test(parts[0] ?? "");
    const body = (headerish ? parts.slice(1).join("\n\n") : text).replace(/^(hi|hello|dear)[^\n]*\n/i, "").trim();
    if (body) return { action: firstSentence(body), note: "first sentence of the email body" };
    return { action: subject, note: "email subject (no body)" };
  }
  if (channel === "article") {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const lead = lines.slice(1).join(" ");
    if (lead) return { action: firstSentence(lead), note: "first sentence of the article (headline skipped)" };
    return { action: firstSentence(lines[0] ?? text), note: "headline" };
  }
  return { action: text, note: channel === "chat" ? "typed" : "description" };
}
