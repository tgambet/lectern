import { useState } from "preact/hooks";
import { Icon } from "../components/Icon.tsx";
import { Logo } from "../components/Logo.tsx";
import { Notice } from "../components/Notice.tsx";

export function Unsupported() {
  const [copied, setCopied] = useState(false);
  const [explained, setExplained] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    } catch {
      // Clipboard refused: the address bar still has it.
    }
  };

  return (
    <div class="app-screen">
      <header class="app-screen__header">
        <Logo />
      </header>
      <main class="app-screen__center">
        <section class="app-unsupported">
          <Notice kind="danger" label="Unsupported browser">
            This browser can't open local folders yet. Use Chrome or Edge.
          </Notice>
          <div class="lc-prose">
            <h1>Lectern needs to read a folder on your computer</h1>
            <p>
              It does this with a browser feature that Chrome and Edge provide. Without it, Lectern
              cannot show the documentation in a folder. Nothing is uploaded, and your files are
              never changed.
            </p>
            <p class="app-muted">Open this page in Chrome or Edge to continue.</p>
            {explained && (
              <p id="why-chromium">
                Lectern opens folders with the File System Access API, which only Chromium browsers
                provide today. A reduced mode for other browsers is on the roadmap.
              </p>
            )}
          </div>
          <div class="app-actions">
            <button type="button" class="lc-btn lc-btn--primary" onClick={copy}>
              <Icon name={copied ? "check" : "copy"} />
              {copied ? "Address copied" : "Copy page address"}
            </button>
            <button
              type="button"
              class="lc-btn"
              aria-expanded={explained}
              aria-controls="why-chromium"
              onClick={() => setExplained(!explained)}
            >
              Why only Chrome and Edge?
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
