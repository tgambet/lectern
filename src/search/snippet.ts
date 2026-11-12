export interface SnippetPart {
  text: string;
  match: boolean;
}

const RADIUS = 80;

/** `text` split into parts, each occurrence of a term (any case) flagged as a match. */
export function markMatches(text: string, terms: string[]): SnippetPart[] {
  const words = [...new Set(terms.map((t) => t.toLowerCase()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (words.length === 0) return text ? [{ text, match: false }] : [];
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts: SnippetPart[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), match: false });
    parts.push({ text: m[0], match: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}

/**
 * A short excerpt of `text` around the first occurrence of any of `terms`,
 * split into parts so the UI can mark matches without building HTML.
 */
export function snippet(text: string, terms: string[], radius = RADIUS): SnippetPart[] {
  const words = [...new Set(terms.map((t) => t.toLowerCase()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (words.length === 0 || text === "")
    return text ? [{ text: text.slice(0, radius * 2), match: false }] : [];
  const lower = text.toLowerCase();
  let first = -1;
  for (const w of words) {
    const i = lower.indexOf(w);
    if (i !== -1 && (first === -1 || i < first)) first = i;
  }
  const start = first === -1 ? 0 : Math.max(0, first - radius);
  const end = Math.min(text.length, (first === -1 ? 0 : first) + radius * 2);
  let window = text.slice(start, end);
  // Cut on word boundaries.
  if (start > 0) window = window.replace(/^\S*\s/, "");
  if (end < text.length) window = window.replace(/\s\S*$/, "");
  const prefix = start > 0 ? "… " : "";
  const suffix = end < text.length ? " …" : "";

  const parts = markMatches(window, words);
  if (prefix) parts.unshift({ text: prefix, match: false });
  if (suffix) parts.push({ text: suffix, match: false });
  return parts;
}
