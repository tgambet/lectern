import { useEffect, useState } from "preact/hooks";
import type { TocEntry } from "../../markdown/pipeline.ts";

/** `lc-toc`, with the section being read marked as it scrolls by. */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const [current, setCurrent] = useState<string | null>(entries[0]?.id ?? null);

  useEffect(() => {
    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      () => {
        // The current section is the last heading above the top third of the viewport.
        const line = innerHeight / 3;
        let id = headings[0]!.id;
        for (const h of headings) if (h.getBoundingClientRect().top <= line) id = h.id;
        setCurrent(id);
      },
      { rootMargin: "0px 0px -66% 0px", threshold: [0, 1] },
    );
    for (const h of headings) observer.observe(h);
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;
  return (
    <nav class="lc-toc" aria-label="On this page">
      <p class="lc-label">On this page</p>
      <ul>
        {entries.map((e) => (
          <li key={e.id} class={e.depth === 3 ? "lc-toc__item--3" : undefined}>
            <a
              class="lc-toc__link"
              href={`#${e.id}`}
              aria-current={e.id === current ? "true" : undefined}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
