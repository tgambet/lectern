import { Icon } from "../components/Icon.tsx";
import { Logo } from "../components/Logo.tsx";
import { ResumeCard } from "../components/ResumeCard.tsx";
import { InstallButton } from "../components/InstallButton.tsx";
import { FolderList } from "../components/FolderList.tsx";
import { ThemeToggle } from "../components/ThemeToggle.tsx";

export function Home({ onOpen, onDemo }: { onOpen: () => void; onDemo: () => void }) {
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
          title="Read the docs in a folder"
          lede="Open a folder on this device. Lectern shows its Markdown and HTML documents as a site you can browse and search."
          note="Read-only. Nothing leaves this device."
        >
          {/* oxlint-disable-next-line jsx-a11y/no-autofocus -- the only action on this screen (ResumeCard guidelines) */}
          <button type="button" class="lc-btn lc-btn--primary" autoFocus onClick={onOpen}>
            <Icon name="folder" />
            Open a folder…
          </button>
          <button type="button" class="lc-btn" onClick={onDemo}>
            Try the demo folder
          </button>
        </ResumeCard>
        <FolderList forgettable />
      </main>
    </div>
  );
}
