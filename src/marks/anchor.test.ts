import { describe, expect, it } from "vite-plus/test";
import { locate, quoteFrom, stripSpaces } from "./anchor.ts";

describe("quoteFrom", () => {
  it("collapses whitespace in the quote and strips it from the context", () => {
    expect(quoteFrom("the  first\nword ", " some\n\ntext ", " after  it")).toEqual({
      exact: "some text",
      prefix: "thefirstword",
      suffix: "afterit",
    });
  });

  it("keeps a limited context", () => {
    const quote = quoteFrom("a".repeat(100), "x", "b".repeat(100))!;
    expect(quote.prefix).toHaveLength(32);
    expect(quote.suffix).toHaveLength(32);
  });

  it("refuses an empty selection", () => {
    expect(quoteFrom("before", " \n ", "after")).toBeNull();
  });
});

describe("locate", () => {
  const text = stripSpaces("one note here, then a second note here, and a third note here.");

  it("finds a quote whatever the whitespace", () => {
    const hay = stripSpaces("alpha beta gamma");
    expect(locate(hay, { exact: "beta  gamma", prefix: "", suffix: "" })).toEqual({
      start: 5,
      end: 14,
    });
  });

  it("uses the context to pick among several occurrences", () => {
    const quote = { exact: "note here", prefix: "thenasecond", suffix: "andathird" };
    const found = locate(text, quote)!;
    expect(text.slice(0, found.start).endsWith("second")).toBe(true);
  });

  it("still finds the quote when its context changed", () => {
    expect(
      locate(stripSpaces("edited note here"), {
        exact: "note here",
        prefix: "original",
        suffix: "gone",
      }),
    ).toEqual({ start: 6, end: 14 });
  });

  it("returns null when the text is gone", () => {
    expect(locate(text, { exact: "absent", prefix: "", suffix: "" })).toBeNull();
  });
});
