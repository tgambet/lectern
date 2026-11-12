/**
 * Where a note sits in a document: the quoted text and a little of what
 * surrounds it, never offsets, because documents change under their notes
 * (ADR 0014). Matching ignores all whitespace: the rendered page and the
 * Markdown tree do not agree on it, between blocks especially.
 */
export interface TextQuote {
  /** The quoted text, whitespace collapsed; also what the reader sees. */
  exact: string;
  /** Up to `CONTEXT` characters before the quote, without whitespace. */
  prefix: string;
  /** Up to `CONTEXT` characters after the quote, without whitespace. */
  suffix: string;
}

const CONTEXT = 32;

export const stripSpaces = (text: string): string => text.replace(/\s+/g, "");

export function quoteFrom(before: string, selected: string, after: string): TextQuote | null {
  const exact = selected.replace(/\s+/g, " ").trim();
  if (exact === "") return null;
  return {
    exact,
    prefix: stripSpaces(before).slice(-CONTEXT),
    suffix: stripSpaces(after).slice(0, CONTEXT),
  };
}

function sharedEnd(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function sharedStart(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * Finds a quote in whitespace-free `text`. When it occurs several times, the
 * occurrence whose surroundings best match the quote's context wins.
 */
export function locate(text: string, quote: TextQuote): { start: number; end: number } | null {
  const needle = stripSpaces(quote.exact);
  if (needle === "") return null;
  let best: { start: number; end: number } | null = null;
  let bestScore = -1;
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) {
    const end = at + needle.length;
    const score =
      sharedEnd(text.slice(Math.max(0, at - quote.prefix.length), at), quote.prefix) +
      sharedStart(text.slice(end, end + quote.suffix.length), quote.suffix);
    if (score > bestScore) {
      best = { start: at, end };
      bestScore = score;
    }
  }
  return best;
}
