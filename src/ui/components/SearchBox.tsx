import { useEffect, useRef, useState } from "preact/hooks";
import { navigate } from "../../app/router.ts";
import type { SearchClient } from "../../search/client.ts";
import type { SearchResult } from "../../search/indexer.ts";
import { isSearchShortcut } from "../keys.ts";
import { useSettled } from "../use-settled.ts";
import { Icon } from "./Icon.tsx";

interface Props {
  client: SearchClient;
  hrefFor: (path: string) => string;
}

const number = new Intl.NumberFormat();

/** `lc-search`: a combobox over the folder's full-text index. */
export function SearchBox({ client, hrefFor }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const status = client.status.value;

  // Ctrl+K (Cmd+K) focuses the search from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // Debounced query; refreshed while indexing so results appear progressively.
  useEffect(() => {
    const q = query.trim();
    if (q === "") {
      setResults(null);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      void client.search(q).then((next) => {
        if (!live) return;
        setResults(next);
        setSelected((s) => Math.min(s, Math.max(next.length - 1, 0)));
      });
    }, 120);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, client, status.documents, status.progress?.done]);

  const go = (result: SearchResult | undefined) => {
    if (!result) return;
    setOpen(false);
    // Not left on the page: the result may be the document already open.
    document.getElementById("main")?.focus({ preventScroll: true });
    navigate(hrefFor(result.path));
  };

  const showPopover = open && query.trim() !== "" && results !== null;
  const active = showPopover && results.length > 0 ? `search-option-${selected}` : undefined;
  const optionId = (i: number) => `search-option-${i}`;

  // The selected option lives outside the DOM focus: nothing else keeps it in view.
  useEffect(() => {
    if (active) document.getElementById(active)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const summary = !showPopover
    ? ""
    : (results.length === 0
        ? `No document matches “${query.trim()}”.`
        : `${results.length} ${results.length === 1 ? "result" : "results"}.`) +
      (status.progress ? " Still indexing." : "");
  const announced = useSettled(summary, 400);

  const onKeyDown = (event: KeyboardEvent) => {
    const count = results?.length ?? 0;
    if (event.key === "ArrowDown" && count) {
      setOpen(true);
      setSelected((s) => (s + 1) % count);
    } else if (event.key === "ArrowUp" && count) {
      setSelected((s) => (s - 1 + count) % count);
    } else if (event.key === "Enter") {
      if (showPopover) go(results[selected]);
    } else if (event.key === "Escape") {
      if (open && query) setOpen(false);
      else input.current?.blur();
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <div class="lc-search app-search">
      <div class="lc-search__field">
        <Icon name="search" />
        <input
          ref={input}
          // A combobox is a text input (ARIA in HTML); `type="search"` only allows `searchbox`.
          type="text"
          role="combobox"
          enterkeyhint="search"
          spellcheck={false}
          placeholder="Search the documentation"
          aria-label="Search the documentation"
          aria-keyshortcuts="Control+K Meta+K"
          aria-autocomplete="list"
          aria-expanded={showPopover}
          aria-controls="search-results"
          aria-activedescendant={active}
          value={query}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            setSelected(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        <span class="lc-search__kbd" aria-hidden="true">
          {open ? "Esc" : "Ctrl K"}
        </span>
      </div>
      <p class="lc-sr-only" role="status">
        {announced}
      </p>
      {showPopover && (
        <ul
          class="lc-search__results"
          id="search-results"
          role="listbox"
          aria-label="Search results"
        >
          {results.length === 0 && (
            <li class="lc-search__empty" role="presentation">
              No document matches “{query.trim()}”.
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.path} role="presentation">
              <a
                id={optionId(i)}
                class="lc-search__result"
                role="option"
                aria-selected={i === selected}
                href={hrefFor(r.path)}
                tabIndex={-1}
                // Keep focus in the field until the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  go(r);
                }}
              >
                <div class="lc-search__title">{r.title}</div>
                <div class="lc-search__path">
                  {r.pathParts.map((part, j) =>
                    part.match ? <mark key={j}>{part.text}</mark> : part.text,
                  )}
                </div>
                {r.snippet.length > 0 && (
                  <p class="lc-search__snippet">
                    {r.snippet.map((part, j) =>
                      part.match ? <mark key={j}>{part.text}</mark> : part.text,
                    )}
                  </p>
                )}
              </a>
            </li>
          ))}
          {status.progress && (
            <li class="lc-search__status" role="presentation">
              Indexing… {number.format(status.progress.done)} of{" "}
              {number.format(status.progress.total)} documents
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
