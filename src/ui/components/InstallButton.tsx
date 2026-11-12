import { install, installPrompt } from "../../app/pwa.ts";

/** Shown only while the browser offers to install Lectern. */
export function InstallButton() {
  if (!installPrompt.value) return null;
  return (
    <button type="button" class="lc-btn lc-btn--ghost" onClick={() => void install()}>
      Install app
    </button>
  );
}
