import { useEffect, useRef, useState } from "preact/hooks";
import { documentCount, lastOpened } from "../../app/recent.ts";
import { forgetFolder, openKnown } from "../../app/session.ts";
import { listFolders, type FolderRecord } from "../../storage/db.ts";

/** `lc-folders`: the folders Lectern already knows, most recently opened first. */
export function FolderList(props: {
  /** Mark this folder as the current one. */
  currentId?: string;
  /** Offer "Forget" on each row. */
  forgettable?: boolean;
  variant?: "flat";
  /** After each load or change of the list. Keep it stable (useCallback). */
  onLoad?: (folders: FolderRecord[]) => void;
}) {
  const [folders, setFolders] = useState<FolderRecord[] | null>(null);
  const { onLoad } = props;
  const list = useRef<HTMLUListElement>(null);
  /** The row whose "Forget" button just went away and held the focus. */
  const forgotten = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    void listFolders().then((list) => {
      if (!live) return;
      setFolders(list);
      onLoad?.(list);
    });
    return () => {
      live = false;
    };
  }, [onLoad]);

  // Focus goes to the row that took its place, or the screen's main action when none is left.
  useEffect(() => {
    if (forgotten.current === null) return;
    const rows = list.current?.querySelectorAll<HTMLElement>(".lc-folders__forget") ?? [];
    const next = rows[Math.min(forgotten.current, rows.length - 1)];
    forgotten.current = null;
    (next ?? document.querySelector<HTMLElement>("main .lc-btn--primary"))?.focus();
  }, [folders]);

  if (!folders || folders.length === 0) return null;
  const forget = async (id: string, index: number) => {
    await forgetFolder(id);
    forgotten.current = index;
    const list = await listFolders();
    setFolders(list);
    onLoad?.(list);
  };

  return (
    <ul
      ref={list}
      class={props.variant === "flat" ? "lc-folders lc-folders--flat" : "lc-folders"}
      aria-label="Known folders"
    >
      {folders.map((folder, index) => {
        const meta = [documentCount(folder.docCount), lastOpened(folder.openedAt)]
          .filter(Boolean)
          .join(" · ");
        return (
          <li class="lc-folders__row" key={folder.id}>
            <button
              type="button"
              class="lc-folders__open"
              aria-current={folder.id === props.currentId ? "true" : undefined}
              onClick={() => void openKnown(folder.id)}
            >
              <span class="lc-folders__name">{folder.name}</span>
              <span class="lc-folders__meta">{meta}</span>
            </button>
            {props.forgettable && (
              <button
                type="button"
                class="lc-folders__forget"
                aria-label={`Forget ${folder.name}`}
                title="Remove from Lectern. Your files are not changed."
                onClick={() => void forget(folder.id, index)}
              >
                Forget
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
