import type { Root } from "hast";
import { toHtml } from "hast-util-to-html";
import { describe, expect, it } from "vite-plus/test";
import { readUrl } from "../app/routes.ts";
import { renderMarkdown, type LinkContext } from "../markdown/pipeline.ts";
import { annotateTree, type NoteAnchor } from "./annotate.ts";

const ctx: LinkContext = {
  docPath: "a.md",
  folderName: "repo",
  rootId: "r1",
  lookup: () => "file",
  readUrl,
};

const tree = async (md: string): Promise<Root> => (await renderMarkdown(md, ctx)).tree;
const note = (id: string, exact: string, prefix = "", suffix = ""): NoteAnchor => ({
  id,
  quote: { exact, prefix, suffix },
});

const REF = (id: string, n: number) =>
  `<lc-note-ref data-note="${id}" data-number="${n}"></lc-note-ref>`;

describe("annotateTree", () => {
  it("returns the same tree when there is nothing to mark", async () => {
    const source = await tree("Hello");
    expect(annotateTree(source, []).tree).toBe(source);
  });

  it("does not change the tree it is given", async () => {
    const source = await tree("Hello world");
    const before = toHtml(source);
    annotateTree(source, [note("a", "world")]);
    expect(toHtml(source)).toBe(before);
  });

  it("marks the text and follows it with a numbered reference", async () => {
    const out = annotateTree(await tree("Hello world, again"), [note("a", "world")]);
    expect(toHtml(out.tree)).toContain(`Hello <mark class="lc-note">world</mark>${REF("a", 1)}`);
    expect(out.placed).toEqual(["a"]);
    expect(out.missing).toEqual([]);
  });

  it("marks each text node of a quote spanning inline elements", async () => {
    const out = annotateTree(await tree("one **two** three"), [note("a", "one two three")]);
    expect(toHtml(out.tree)).toBe(
      `<p><mark class="lc-note">one</mark> <strong><mark class="lc-note">two</mark></strong> <mark class="lc-note">three</mark>${REF("a", 1)}</p>`,
    );
  });

  it("marks across blocks", async () => {
    const html = toHtml(
      annotateTree(await tree("end of one\n\nstart of two"), [note("a", "one start")]).tree,
    );
    expect(html).toContain(`of <mark class="lc-note">one</mark>`);
    expect(html).toContain(`<mark class="lc-note">start</mark>${REF("a", 1)} of two`);
  });

  it("numbers notes in document order, whatever their stored order", async () => {
    const out = annotateTree(await tree("alpha beta"), [note("b", "beta"), note("a", "alpha")]);
    expect(out.placed).toEqual(["a", "b"]);
    expect(toHtml(out.tree)).toContain(REF("b", 2));
  });

  it("handles overlapping notes", async () => {
    const html = toHtml(
      annotateTree(await tree("alpha beta gamma"), [
        note("a", "alpha beta"),
        note("b", "beta gamma"),
      ]).tree,
    );
    expect(html).toBe(
      `<p><mark class="lc-note">alpha</mark> <mark class="lc-note">beta</mark>${REF("a", 1)} <mark class="lc-note">gamma</mark>${REF("b", 2)}</p>`,
    );
  });

  it("puts the reference after a link, never inside it", async () => {
    const html = toHtml(
      annotateTree(await tree("[a link](https://example.com) next"), [note("a", "link")]).tree,
    );
    expect(html).toMatch(/<mark class="lc-note">link<\/mark><\/a><lc-note-ref/);
  });

  it("leaves code blocks alone", async () => {
    const out = annotateTree(await tree("```\nsecret\n```\n\nsecret"), [note("a", "secret")]);
    const html = toHtml(out.tree);
    expect(html).toContain("<code>secret\n</code>");
    expect(html).toContain(`<mark class="lc-note">secret</mark>`);
  });

  it("reports notes whose text is gone", async () => {
    const out = annotateTree(await tree("Hello"), [note("a", "absent"), note("b", "Hello")]);
    expect(out.missing).toEqual(["a"]);
    expect(out.placed).toEqual(["b"]);
  });

  it("drops an lc-note-ref written in the document", async () => {
    const html = toHtml(await tree('<lc-note-ref data-note="x"></lc-note-ref>text'));
    expect(html).not.toContain("lc-note-ref");
  });
});
