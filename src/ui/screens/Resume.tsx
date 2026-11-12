import { openAnotherFolder, resume } from "../../app/session.ts";
import type { FolderRecord } from "../../storage/db.ts";
import { FolderList } from "../components/FolderList.tsx";
import { Icon } from "../components/Icon.tsx";
import { Logo } from "../components/Logo.tsx";
import { Notice } from "../components/Notice.tsx";
import { ResumeCard } from "../components/ResumeCard.tsx";
import { InstallButton } from "../components/InstallButton.tsx";
import { ThemeToggle } from "../components/ThemeToggle.tsx";

export function Resume({
  record,
  permission,
}: {
  record: FolderRecord;
  permission: "prompt" | "denied";
}) {
  const count =
    record.docCount === null
      ? null
      : `${record.docCount} ${record.docCount === 1 ? "document" : "documents"}`;
  return (
    <div class="app-screen">
      <header class="app-screen__header">
        <Logo />
        <span class="app-spacer" />
        <InstallButton />
        <ThemeToggle />
      </header>
      <main class="app-screen__center">
        <ResumeCard
          title={
            <>
              Resume <em class="app-serif">{record.name}</em>
            </>
          }
          meta={count ? `${record.name} · ${count}` : record.name}
          note="Nothing leaves this device."
        >
          {/* oxlint-disable-next-line jsx-a11y/no-autofocus -- the primary action (ResumeCard guidelines) */}
          <button
            type="button"
            class="lc-btn lc-btn--primary"
            autoFocus
            onClick={() => void resume()}
          >
            Resume
          </button>
          <button type="button" class="lc-btn" onClick={() => void openAnotherFolder()}>
            <Icon name="folder" />
            Open another folder…
          </button>
        </ResumeCard>
        <FolderList currentId={record.id} forgettable />
        <div class="app-notice" role="status">
          {permission === "denied" ? (
            <Notice kind="warn" label="Permission refused">
              Lectern cannot read <code>{record.name}</code> until you allow it. Your files are not
              changed.
            </Notice>
          ) : (
            <Notice kind="warn" label="Permission needed">
              Lectern needs your permission again to read <code>{record.name}</code>. Your files are
              not changed.
            </Notice>
          )}
        </div>
      </main>
    </div>
  );
}
