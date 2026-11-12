import { useRef, useState } from "preact/hooks";
import { closeFolder, openAnotherFolder } from "../../app/session.ts";
import type { FolderRecord } from "../../storage/db.ts";
import { FolderList } from "./FolderList.tsx";
import { Icon } from "./Icon.tsx";
import { useDismiss } from "./use-dismiss.ts";

/** The reader's folder name as a disclosure: switch folder, open another, or close this one. */
export function FolderMenu({ record }: { record: FolderRecord }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useDismiss(open, () => setOpen(false), root, trigger);

  return (
    <div class="lc-folders-menu" ref={root}>
      <button
        type="button"
        class="lc-btn lc-btn--ghost"
        ref={trigger}
        aria-expanded={open}
        aria-controls="folder-menu"
        title={record.name}
        onClick={() => setOpen(!open)}
      >
        <Icon name="folder" />
        <span class="app-path">{record.name}</span>
      </button>
      {open && (
        <div class="lc-folders-panel" id="folder-menu">
          <FolderList variant="flat" currentId={record.id} />
          <hr class="lc-folders__sep" />
          <button
            type="button"
            class="lc-btn"
            onClick={() => {
              setOpen(false);
              // The panel is going away, and the picker gives focus back to what held it.
              trigger.current?.focus();
              void openAnotherFolder();
            }}
          >
            Open another folder…
          </button>
          <button type="button" class="lc-btn" onClick={closeFolder}>
            Close folder
          </button>
        </div>
      )}
    </div>
  );
}
