import { applyUpdate, updateReady } from "../../app/pwa.ts";
import { Notice } from "./Notice.tsx";

/** Floating notice when a new version of the app is waiting. */
export function UpdateNotice() {
  // The live region exists before its content, or the notice would not be announced.
  return (
    <div role="status">
      {updateReady.value && (
        <div class="lc-toast">
          <Notice
            kind="info"
            label="Update"
            actions={
              <button type="button" class="lc-btn" onClick={applyUpdate}>
                Reload
              </button>
            }
          >
            A new version of Lectern is ready.
          </Notice>
        </div>
      )}
    </div>
  );
}
