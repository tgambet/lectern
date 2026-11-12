import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { treeView } from "../../app/preferences.ts";
import { markMatches, type SnippetPart } from "../../search/snippet.ts";
import {
  ancestorsOf,
  compactTree,
  directoryPaths,
  filterTree,
  flatRows,
  visibleRows,
  type TreeNode,
  type TreeRow,
  type TreeView,
} from "../../tree/tree.ts";
import { Icon } from "./Icon.tsx";
import { useSettled } from "../use-settled.ts";
import {
  ResizeHandle,
  canNarrowTree,
  canWidenTree,
  narrowTree,
  widenTree,
} from "./ResizeHandle.tsx";
import { Menu, MenuChoice } from "./Menu.tsx";

interface Props {
  root: TreeNode;
  title: string;
  /** Path of the open document, marked `aria-current`. */
  current: string | null;
  hrefFor: (path: string) => string;
}

const views: Array<[TreeView, string]> = [
  ["tree", "Tree"],
  ["compact", "Compact folders"],
  ["flat", "Flat list"],
];

/** The tree's options: how it is shown, and expand or collapse every folder. */
function TreeMenu(props: { canFold: boolean; onExpandAll: () => void; onCollapseAll: () => void }) {
  return (
    <Menu id="tree-menu" label="Tree options" icon="more" class="lc-tree__menu">
      {(pick) => (
        <>
          <p class="lc-label lc-menu__label" id="tree-view-label">
            View
          </p>
          <div role="group" aria-labelledby="tree-view-label">
            {views.map(([view, label]) => (
              <MenuChoice
                key={view}
                checked={treeView.value === view}
                onClick={pick(() => (treeView.value = view))}
              >
                {label}
              </MenuChoice>
            ))}
          </div>
          <hr class="lc-menu__sep" />
          <button
            type="button"
            class="lc-btn"
            disabled={!props.canFold}
            onClick={pick(props.onExpandAll)}
          >
            Expand all
          </button>
          <button
            type="button"
            class="lc-btn"
            disabled={!props.canFold}
            onClick={pick(props.onCollapseAll)}
          >
            Collapse all
          </button>
          {/* Like the splitter, only where the tree sits beside the document. */}
          <div class="app-tree-width">
            <hr class="lc-menu__sep" />
            <button
              type="button"
              class="lc-btn"
              disabled={!canNarrowTree()}
              onClick={pick(narrowTree)}
            >
              Narrower
            </button>
            <button
              type="button"
              class="lc-btn"
              disabled={!canWidenTree()}
              onClick={pick(widenTree)}
            >
              Wider
            </button>
          </div>
        </>
      )}
    </Menu>
  );
}

function Parts({ parts }: { parts: SnippetPart[] }) {
  return <>{parts.map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : part.text))}</>;
}

/** Splits highlighted parts at character `at`, for a path's folder and name. */
function splitParts(parts: SnippetPart[], at: number): [SnippetPart[], SnippetPart[]] {
  const before: SnippetPart[] = [];
  const after: SnippetPart[] = [];
  let offset = 0;
  for (const part of parts) {
    const cut = Math.min(Math.max(at - offset, 0), part.text.length);
    if (cut > 0) before.push({ ...part, text: part.text.slice(0, cut) });
    if (cut < part.text.length) after.push({ ...part, text: part.text.slice(cut) });
    offset += part.text.length;
  }
  return [before, after];
}

function Label({ name, flat, query }: { name: string; flat: boolean; query: string }) {
  const parts = markMatches(name, query ? [query] : []);
  if (!flat) {
    return (
      <span class="lc-tree__label">
        <Parts parts={parts} />
      </span>
    );
  }
  const [dir, base] = splitParts(parts, name.lastIndexOf("/") + 1);
  return (
    <span class="lc-tree__label lc-tree__label--path">
      {dir.length > 0 && (
        <span class="lc-tree__dir">
          <Parts parts={dir} />
        </span>
      )}
      <span class="lc-tree__base">
        <Parts parts={base} />
      </span>
    </span>
  );
}

/**
 * `lc-tree` as a WAI-ARIA tree: one tab stop, arrows to move, Right/Left to
 * open and close folders, Home/End, type-ahead. Files are real links. A
 * filter field above narrows it to matching paths; a menu switches between
 * nested, compact and flat views.
 */
export function FileTree({ root, title, current, hrefFor }: Props) {
  const view = treeView.value;
  const [query, setQuery] = useState("");
  const filter = query.trim();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(current ? ancestorsOf(current) : []),
  );
  const [focused, setFocused] = useState<string | null>(current);
  const items = useRef(new Map<string, HTMLAnchorElement>());
  const list = useRef<HTMLUListElement>(null);

  // Reveal the open document when it changes.
  useEffect(() => {
    if (!current) return;
    setExpanded((prev) => {
      const missing = ancestorsOf(current).filter((p) => !prev.has(p));
      return missing.length ? new Set([...prev, ...missing]) : prev;
    });
    setFocused(current);
    items.current.get(current)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const shown = useMemo(() => {
    const filtered = filterTree(root, filter);
    return view === "compact" ? compactTree(filtered) : filtered;
  }, [root, filter, view]);
  // While filtering, every folder on the way to a match is open.
  const rows = useMemo(() => {
    if (view === "flat") return flatRows(shown);
    return visibleRows(shown, filter ? new Set(directoryPaths(shown)) : expanded);
  }, [shown, view, filter, expanded]);
  const siblings = useMemo(() => {
    const byParent = new Map<string, TreeRow[]>();
    for (const row of rows) byParent.set(row.parent, [...(byParent.get(row.parent) ?? []), row]);
    return byParent;
  }, [rows]);

  const tabStop = rows.some((r) => r.node.path === focused)
    ? focused
    : (rows[0]?.node.path ?? null);

  // Keyboard moves the tab stop; DOM focus follows while it is inside the tree.
  useEffect(() => {
    const el = focused ? items.current.get(focused) : undefined;
    const active = document.activeElement;
    if (el && active !== el && list.current?.contains(active)) el.focus();
  }, [focused, rows]);

  // Opening also opens the folders above, so a compact row stays open in the nested view.
  const toggle = (path: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open ?? !next.has(path)) for (const p of [...ancestorsOf(path), path]) next.add(p);
      else next.delete(path);
      return next;
    });

  const move = (path: string | undefined) => {
    if (path !== undefined) setFocused(path);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const index = rows.findIndex((r) => r.node.path === tabStop);
    const row = rows[index];
    if (!row) return;
    const { node } = row;
    const isOpen = node.kind === "directory" && (!!filter || expanded.has(node.path));
    switch (event.key) {
      case "ArrowDown":
        move(rows[index + 1]?.node.path);
        break;
      case "ArrowUp":
        move(rows[index - 1]?.node.path);
        break;
      case "Home":
        move(rows[0]?.node.path);
        break;
      case "End":
        move(rows.at(-1)?.node.path);
        break;
      case "ArrowRight":
        if (node.kind !== "directory") return;
        if (isOpen) move(rows[index + 1]?.node.path);
        else if (!filter) toggle(node.path, true);
        break;
      case "ArrowLeft":
        if (isOpen && !filter) toggle(node.path, false);
        else if (row.parent !== "") move(row.parent);
        break;
      case "Enter":
      case " ":
        if (node.kind === "directory") {
          if (!filter) toggle(node.path);
        } else if (event.key === " ") items.current.get(node.path)?.click();
        else return; // Enter on a link follows it natively
        break;
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key.toLowerCase();
        const order = [...rows.slice(index + 1), ...rows.slice(0, index + 1)];
        move(order.find((r) => r.node.name.toLowerCase().startsWith(key))?.node.path);
      }
    }
    event.preventDefault();
  };

  const firstFile = rows.find((r) => r.node.kind === "file")?.node.path;
  const matches = rows.filter((r) => r.node.kind === "file").length;
  const announced = useSettled(
    !filter
      ? ""
      : matches === 0
        ? `No document name matches “${filter}”.`
        : `${matches} ${matches === 1 ? "document" : "documents"} found.`,
    300,
  );
  const onFilterKey = (event: KeyboardEvent) => {
    const first = rows[0]?.node.path;
    if (event.key === "ArrowDown" && first) {
      setFocused(first);
      items.current.get(first)?.focus();
    } else if (event.key === "Enter" && firstFile) {
      items.current.get(firstFile)?.click();
    } else if (event.key === "Escape" && query) {
      setQuery("");
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <nav class="lc-tree" aria-label="Documentation">
      <div class="lc-tree__head">
        <p class="lc-tree__title" id="tree-title">
          {title}
        </p>
        <TreeMenu
          canFold={view !== "flat" && !filter}
          onExpandAll={() => setExpanded(new Set(directoryPaths(root)))}
          onCollapseAll={() => setExpanded(new Set())}
        />
      </div>
      <div class="lc-tree__filter">
        <Icon name="search" />
        <input
          type="search"
          spellcheck={false}
          placeholder="Filter by name"
          aria-label="Filter by name"
          aria-controls="tree-list"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={onFilterKey}
        />
      </div>
      <p class="lc-sr-only" role="status">
        {announced}
      </p>
      {rows.length === 0 ? (
        <p class="lc-tree__empty">No document name matches “{filter}”.</p>
      ) : (
        <ul
          ref={list}
          id="tree-list"
          class="lc-tree__list"
          role="tree"
          aria-labelledby="tree-title"
          onKeyDown={onKeyDown}
        >
          {rows.map(({ node, depth, parent }) => {
            const group = siblings.get(parent) ?? [];
            const isDir = node.kind === "directory";
            const isOpen = isDir && (!!filter || expanded.has(node.path));
            return (
              <li key={node.path} role="none">
                <a
                  ref={(el) => {
                    if (el) items.current.set(node.path, el);
                    else items.current.delete(node.path);
                  }}
                  role="treeitem"
                  class="lc-tree__item"
                  style={{ "--depth": depth }}
                  href={isDir ? undefined : hrefFor(node.path)}
                  title={view === "flat" || view === "compact" ? node.name : undefined}
                  // Folder and name are separate boxes: name the row by its path, without a gap.
                  aria-label={view === "flat" ? node.name : undefined}
                  tabIndex={node.path === tabStop ? 0 : -1}
                  aria-level={depth + 1}
                  aria-setsize={group.length}
                  aria-posinset={group.findIndex((r) => r.node.path === node.path) + 1}
                  aria-expanded={isDir ? isOpen : undefined}
                  aria-current={node.path === current ? "page" : undefined}
                  onClick={() => {
                    setFocused(node.path);
                    if (isDir && !filter) toggle(node.path);
                  }}
                >
                  {isDir ? (
                    <Icon
                      name="chevron"
                      class="lc-tree__chev"
                      data-open={isOpen ? "" : undefined}
                    />
                  ) : (
                    view !== "flat" && <span class="app-tree-spacer" />
                  )}
                  <Icon name={isDir ? "folder" : "document"} />
                  <Label name={node.name} flat={view === "flat"} query={filter} />
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <p class="lc-label app-reader__foot">Read-only · works offline</p>
      <ResizeHandle />
    </nav>
  );
}
