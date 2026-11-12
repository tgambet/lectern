import type { Root } from "hast";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { formatSize, loadDocument, whenControlled, type DocumentView } from "../../app/document.ts";
import { hash, navigate, route } from "../../app/router.ts";
import { readUrl } from "../../app/routes.ts";
import { openAnotherFolder } from "../../app/session.ts";
import { basename } from "../../fs/path.ts";
import type { FsChange, VirtualFS } from "../../fs/virtual-fs.ts";
import { updateFolder, type FolderRecord } from "../../storage/db.ts";
import { countDocuments, landingFor } from "../../tree/documents.ts";
import { buildFileIndex, lookup, type FileIndex } from "../../tree/file-index.ts";
import { relevantChanges, touches } from "../../tree/changes.ts";
import { createIgnoreRule, type IgnoreRule } from "../../tree/ignore.ts";
import { buildDocumentTree } from "../../tree/tree.ts";
import { annotateTree } from "../../marks/annotate.ts";
import { Article } from "../components/Article.tsx";
import { FileTree } from "../components/FileTree.tsx";
import { HtmlFrame, fileUrl } from "../components/HtmlFrame.tsx";
import { FolderMenu } from "../components/FolderMenu.tsx";
import { Logo } from "../components/Logo.tsx";
import {
  AddNoteButton,
  BookmarkButton,
  MarksButton,
  MarksPanel,
  NoteContext,
  NoteDialog,
  type NoteDraft,
} from "../components/Marks.tsx";
import { Notice } from "../components/Notice.tsx";
import { SearchBox } from "../components/SearchBox.tsx";
import { SearchClient } from "../../search/client.ts";
import { documentKind } from "../../tree/documents.ts";
import { InstallButton } from "../components/InstallButton.tsx";
import { readingWidth, sidebarWidth, zen } from "../../app/preferences.ts";
import { WidthMenu, ZenButton, ZenExit } from "../components/ReadingControls.tsx";
import { isTyping, isZenShortcut } from "../keys.ts";
import { quoteOfSection, quoteOfSelection } from "../selection.ts";
import { useMarks } from "../use-marks.ts";
import { useSettled } from "../use-settled.ts";
import { ThemeToggle } from "../components/ThemeToggle.tsx";
import { Toc } from "../components/Toc.tsx";

/** Rebuild the index on focus at most this often, when the folder cannot be watched. */
const REVALIDATE_MS = 30_000;
/** Watched changes come in bursts (an editor saving, a git checkout): wait for quiet. */
const WATCH_SETTLE_MS = 250;

async function readGitignore(fs: VirtualFS): Promise<string | undefined> {
  try {
    return await fs.readText(".gitignore");
  } catch {
    return undefined;
  }
}

function useFileIndex(fs: VirtualFS, folderId: string) {
  const [index, setIndex] = useState<FileIndex | null>(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  /** Paths in the last batch of watched changes, to refresh what shows them. */
  const [changed, setChanged] = useState<ReadonlySet<string>>(new Set());
  const ignore = useRef<IgnoreRule | null>(null);
  const watching = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const rule = createIgnoreRule({ gitignore: await readGitignore(fs) });
        const next = await buildFileIndex(fs, {
          ignore: rule,
          onProgress: setProgress,
          signal: controller.signal,
        });
        ignore.current = rule;
        setIndex(next);
        void updateFolder(folderId, { docCount: countDocuments(next) });
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();
    return () => controller.abort();
  }, [fs, folderId, version]);

  // Live changes where the browser can watch: re-read the folder shortly after they settle.
  useEffect(() => {
    let live = true;
    let stop: (() => void) | null = null;
    let timer = 0;
    let pending: FsChange[] = [];
    void fs
      .watch?.((changes) => {
        pending.push(...changes);
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          const relevant = relevantChanges(pending, ignore.current);
          pending = [];
          if (relevant.length === 0) return;
          setChanged(new Set(relevant.map((c) => c.path)));
          setVersion((v) => v + 1);
        }, WATCH_SETTLE_MS);
      })
      .then((unwatch) => {
        if (!live) return unwatch?.();
        stop = unwatch;
        watching.current = unwatch !== null;
      });
    return () => {
      live = false;
      clearTimeout(timer);
      stop?.();
      watching.current = false;
    };
  }, [fs]);

  // Without a watcher: re-read the folder when the window regains focus.
  useEffect(() => {
    let last = Date.now();
    const onFocus = () => {
      if (watching.current || Date.now() - last < REVALIDATE_MS) return;
      last = Date.now();
      setVersion((v) => v + 1);
    };
    addEventListener("focus", onFocus);
    return () => removeEventListener("focus", onFocus);
  }, []);

  return { index, progress, failed, changed };
}

/** One search worker per open folder, re-synced whenever the file index changes. */
function useSearch(folderId: string, index: FileIndex | null): SearchClient | null {
  const [client, setClient] = useState<SearchClient | null>(null);
  useEffect(() => {
    const next = new SearchClient(folderId);
    setClient(next);
    return () => next.dispose();
  }, [folderId]);
  useEffect(() => {
    if (client && index) client.sync([...index.files].filter((p) => documentKind(p) !== null));
  }, [client, index]);
  return client;
}

/** Publishes the sticky header's height as `--header-h`, for the sidebars and anchor scrolling. */
function useHeaderHeight(header: { current: HTMLElement | null }) {
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty("--header-h", `${el.offsetHeight}px`),
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--header-h");
    };
  }, [header]);
}

/** Alt+Z toggles zen mode, Escape leaves it; zen ends with the reader. */
function useZenKeys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target as Element).closest?.("dialog")) return;
      if (isZenShortcut(event)) zen.value = !zen.value;
      else if (event.key === "Escape" && zen.value && !isTyping(event.target)) zen.value = false;
      else return;
      event.preventDefault();
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      zen.value = false;
    };
  }, []);
}

/** Zen hides what may hold the focus, and its exit button goes away: keep the focus somewhere. */
function useZenFocus(
  main: { current: HTMLElement | null },
  header: { current: HTMLElement | null },
) {
  const on = zen.value;
  const was = useRef(on);
  useEffect(() => {
    if (was.current === on) return;
    was.current = on;
    const held = document.activeElement;
    if (on) {
      if (!main.current?.contains(held)) main.current?.focus({ preventScroll: true });
    } else if (!held || held === document.body) {
      header.current?.querySelector<HTMLElement>(".app-zen-toggle")?.focus();
    }
  }, [on]);
}

function scrollToAnchor(id: string): HTMLElement | null {
  const el = document.getElementById(id) ?? document.getElementById(`user-content-${id}`);
  el?.scrollIntoView();
  if (el?.classList.contains("lc-note-ref")) el.focus({ preventScroll: true });
  return el;
}

/** Puts keyboard and screen-reader position on an anchor's target, which need not be focusable. */
function focusAnchor(el: HTMLElement) {
  if (el.tabIndex < 0) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

function OpenAnotherFolder() {
  return (
    <button type="button" class="lc-btn" onClick={() => void openAnotherFolder()}>
      Open another folder…
    </button>
  );
}

function DocumentBody(props: {
  view: DocumentView;
  /** Bumped when an HTML document's files change, to reload its frame. */
  revision: number;
  record: FolderRecord;
  docCount: number | null;
  /** The Markdown tree with the reader's notes marked in it. */
  annotated: Root | null;
}) {
  const { view, record, docCount, revision, annotated } = props;
  const name = <code>{basename(view.path)}</code>;
  switch (view.kind) {
    case "no-landing":
      return docCount === 0 ? (
        <Notice kind="info" label="No documents" actions={<OpenAnotherFolder />}>
          <code>{record.name}</code> has no Markdown or HTML documents.
        </Notice>
      ) : (
        <Notice kind="info" label="Start here">
          <code>{view.path === "" ? record.name : view.path}</code> has no README or index. Pick a
          document in the list.
        </Notice>
      );
    case "markdown":
      return <Article tree={annotated ?? view.rendered.tree} />;
    case "missing":
      return (
        <Notice kind="warn" label="Not found" live>
          No file at <code>{view.path}</code>.
        </Notice>
      );
    case "too-large":
      return (
        <Notice kind="info" label="Too large" live>
          {name} is {formatSize(view.size)}. Lectern displays files up to 2 MB.
        </Notice>
      );
    case "html":
      return (
        <HtmlFrame
          key={revision}
          folderId={record.id}
          path={view.path}
          hasScripts={view.hasScripts}
          onNavigate={(path, how) =>
            navigate(readUrl(record.name, path), { replace: how === "replace" })
          }
        />
      );
    case "other":
      return (
        <Notice kind="info" label="Not a document">
          Lectern shows Markdown and HTML documents.{" "}
          <a href={fileUrl(record.id, view.path)} target="_blank">
            Open {basename(view.path)} as a file
          </a>
          .
        </Notice>
      );
    case "error":
      return (
        <Notice kind="danger" label="Cannot read" live>
          {name} could not be read: {view.message}
        </Notice>
      );
  }
}

export function Reader(props: { record: FolderRecord; fs: VirtualFS; onLoad?: boolean }) {
  const { record, fs, onLoad } = props;
  const { index, progress, failed, changed } = useFileIndex(fs, record.id);
  const search = useSearch(record.id, index);
  const [view, setView] = useState<DocumentView | null>(null);
  const restored = useRef(false);
  const shownPath = useRef<string | null>(null);
  /** The open document changed on disk: say so once it shows the new version. */
  const updated = useRef(false);
  // An HTML document reloads when a file next to or below it changes (its CSS, images…).
  const [frameRevision, setFrameRevision] = useState(0);
  useEffect(() => {
    if (view?.kind === "html" && touches(changed, view.path)) setFrameRevision((r) => r + 1);
    updated.current =
      !!view && (view.kind === "html" ? touches(changed, view.path) : changed.has(view.path));
  }, [changed]);
  const article = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  useHeaderHeight(header);
  useZenKeys();
  useZenFocus(article, header);
  const current = route.value;
  const path = current.kind === "read" && current.folder === record.name ? current.path : null;

  // Keep the URL on this folder; `/` resumes at the last document.
  useEffect(() => {
    if (path === null) navigate(readUrl(record.name, record.lastFile ?? ""), { replace: true });
  }, [path, record]);

  // Folders show their README or index.
  useEffect(() => {
    if (!index || path === null || lookup(index, path) !== "directory") return;
    const landing = landingFor(index, path);
    if (landing) navigate(readUrl(record.name, landing, hash.value), { replace: true });
    else setView({ kind: "no-landing", path });
  }, [index, path, record.name]);

  useEffect(() => {
    if (!index || path === null || lookup(index, path) === "directory") return;
    let live = true;
    void whenControlled()
      .then(() => loadDocument({ fs, index, folderId: record.id }, path))
      .then((next) => {
        if (!live) return;
        setView(next);
        void updateFolder(record.id, { lastFile: path });
      });
    return () => {
      live = false;
    };
  }, [fs, index, path, record.id]);

  // After a document renders: anchor, restored scroll, or top; focus moves to the article.
  // The same document read again (the folder changed) keeps the reader's place.
  useEffect(() => {
    if (!view) return;
    document.title = `${documentName} · Lectern`;
    const reread = view.path === shownPath.current;
    shownPath.current = view.path;
    if (reread) {
      if (updated.current && view.kind !== "missing") announce("Document updated.");
      updated.current = false;
      return;
    }
    const anchor = hash.value ? scrollToAnchor(hash.value) : null;
    if (!anchor)
      scrollTo(0, !restored.current && view.path === record.lastFile ? record.lastScroll : 0);
    if (restored.current || !onLoad) {
      if (anchor) focusAnchor(anchor);
      else article.current?.focus({ preventScroll: true });
    }
    restored.current = true;
  }, [view]);

  useEffect(() => {
    if (view && hash.value) scrollToAnchor(hash.value);
  }, [hash.value]);

  // Remember where the reader is, a few times per second at most.
  useEffect(() => {
    if (!view) return;
    let timer = 0;
    const onScroll = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => void updateFolder(record.id, { lastScroll: scrollY }), 300);
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      removeEventListener("scroll", onScroll);
    };
  }, [view, record.id]);

  const documentName = view
    ? ((view.kind === "markdown" ? view.rendered.title : null) ??
      (basename(view.path) || record.name))
    : undefined;
  const framed = view?.kind === "html";
  const tree = useMemo(
    () => (index ? buildDocumentTree(index, record.name) : null),
    [index, record.name],
  );
  const docCount = index ? countDocuments(index) : null;
  // Only a slow folder is worth a word; the running count stays silent.
  const reading = useSettled(tree || failed ? "" : `Reading ${record.name}…`, 1000);

  const marks = useMarks(record.id);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [status, setStatus] = useState("");
  // A trailing space makes the same message count as a change, so it is announced again.
  const announce = (message: string) => setStatus((s) => (s === message ? `${message} ` : message));

  const documentNotes = useMemo(
    () => marks.notes.filter((n) => n.path === view?.path),
    [marks.notes, view?.path],
  );
  const annotated = useMemo(
    () => (view?.kind === "markdown" ? annotateTree(view.rendered.tree, documentNotes) : null),
    [view, documentNotes],
  );
  const notesById = useMemo(() => new Map(marks.notes.map((n) => [n.id, n])), [marks.notes]);
  const missing = useMemo(() => new Set(annotated?.missing ?? []), [annotated]);
  const noteContext = useMemo(
    () => ({
      notes: notesById,
      open(id: string) {
        const note = notesById.get(id);
        if (note) setDraft({ note, quote: note.quote });
      },
    }),
    [notesById],
  );

  const isDocument = view?.kind === "markdown" || view?.kind === "html";
  const bookmarked = isDocument && marks.bookmarks.some((b) => b.path === view.path);
  const toggleBookmark = () => {
    if (!isDocument) return;
    if (bookmarked) void marks.removeBookmark(view.path);
    else {
      const title = view.kind === "markdown" ? view.rendered.title : null;
      void marks.addBookmark(view.path, title ?? basename(view.path));
    }
  };
  const startNote = () => {
    const root = article.current?.querySelector(".lc-prose");
    const quote = root && (quoteOfSelection(root) ?? quoteOfSection(root));
    if (quote) setDraft({ quote });
  };
  const saveDraft = async (text: string) => {
    if (!draft || !view) return;
    setDraft(null);
    if (draft.note) await marks.editNote(draft.note, text);
    else await marks.addNote(view.path, draft.quote, text);
    announce("Note saved.");
  };
  const deleteDraft = async () => {
    if (!draft?.note) return;
    const { id } = draft.note;
    setDraft(null);
    await marks.removeNote(id);
    announce("Note deleted.");
    // Its button is gone, and focus with it.
    article.current?.focus({ preventScroll: true });
  };
  // The link's own navigation handles another document; in this one, the hash may not change.
  const goToNote = (id: string) =>
    requestAnimationFrame(() =>
      document.getElementById(`note-${id}`)?.focus({ preventScroll: true }),
    );

  return (
    <div
      class={framed ? "app-screen app-screen--fixed" : "app-screen"}
      data-zen={zen.value ? "" : undefined}
      data-width={readingWidth.value}
    >
      <p class="lc-sr-only" role="status">
        {reading}
      </p>
      {zen.value && <ZenExit />}
      <a class="lc-btn lc-btn--primary lc-skip" href="#main">
        Skip to the document
      </a>
      <header class="app-screen__header app-screen__header--ruled" ref={header}>
        <Logo />
        {search && <SearchBox client={search} hrefFor={(p) => readUrl(record.name, p)} />}
        <span class="app-spacer" />
        {isDocument && <BookmarkButton active={bookmarked} onToggle={toggleBookmark} />}
        {view?.kind === "markdown" && <AddNoteButton onAdd={startNote} />}
        <MarksButton onOpen={() => setPanelOpen(true)} />
        <FolderMenu record={record} />
        <InstallButton />
        <WidthMenu />
        <ZenButton />
        <ThemeToggle />
      </header>
      <div class="app-reader">
        <div
          class="app-reader__tree"
          id="file-tree"
          style={
            sidebarWidth.value === null ? undefined : { "--sidebar": `${sidebarWidth.value}px` }
          }
        >
          {tree ? (
            <FileTree
              root={tree}
              title={`${record.name} · ${docCount} ${docCount === 1 ? "document" : "documents"}`}
              current={view?.path ?? null}
              hrefFor={(p) => readUrl(record.name, p)}
            />
          ) : (
            <p class="lc-label app-reader__status">
              {failed
                ? `Lectern could not read ${record.name}.`
                : `Reading ${record.name}… ${progress} files`}
            </p>
          )}
        </div>
        <main
          class={framed ? "app-reader__main app-reader__main--frame" : "app-reader__main"}
          id="main"
          ref={article}
          tabIndex={-1}
          aria-busy={!view && !failed}
          aria-label={documentName}
        >
          {failed ? (
            <Notice
              kind="danger"
              label="Cannot read"
              live
              actions={
                <>
                  <button type="button" class="lc-btn" onClick={() => location.reload()}>
                    Try again
                  </button>
                  <OpenAnotherFolder />
                </>
              }
            >
              Lectern could not read <code>{record.name}</code>. It may have moved, or its
              permission was removed.
            </Notice>
          ) : framed ? (
            <DocumentBody
              view={view}
              record={record}
              docCount={docCount}
              revision={frameRevision}
              annotated={null}
            />
          ) : (
            <article class="lc-prose app-reader__article">
              {missing.size > 0 && (
                <Notice
                  kind="info"
                  label="Notes"
                  actions={
                    <button type="button" class="lc-btn" onClick={() => setPanelOpen(true)}>
                      See bookmarks and notes
                    </button>
                  }
                >
                  {missing.size === 1
                    ? "One note is about text no longer in this document."
                    : `${missing.size} notes are about text no longer in this document.`}
                </Notice>
              )}
              {view && (
                <NoteContext.Provider value={noteContext}>
                  <DocumentBody
                    view={view}
                    record={record}
                    docCount={docCount}
                    revision={frameRevision}
                    annotated={annotated?.tree ?? null}
                  />
                </NoteContext.Provider>
              )}
            </article>
          )}
        </main>
        {!framed && (
          <div class="app-reader__toc">
            {view?.kind === "markdown" && <Toc entries={view.rendered.toc} />}
          </div>
        )}
      </div>
      <p class="lc-sr-only" role="status">
        {status}
      </p>
      {draft && (
        <NoteDialog
          key={draft.note?.id ?? "new"}
          draft={draft}
          onSave={(text) => void saveDraft(text)}
          onDelete={() => void deleteDraft()}
          onClose={() => setDraft(null)}
        />
      )}
      {panelOpen && (
        <MarksPanel
          folder={record.name}
          bookmarks={marks.bookmarks}
          notes={marks.notes}
          missing={missing}
          status={status}
          onRemoveBookmark={(bookmark) => {
            void marks.removeBookmark(bookmark.path).then(() => announce("Bookmark removed."));
          }}
          onRemoveNote={(note) => {
            void marks.removeNote(note.id).then(() => announce("Note deleted."));
          }}
          onGoToNote={goToNote}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
