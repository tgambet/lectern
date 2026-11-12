import { useEffect, useRef } from "preact/hooks";
import { areScriptsOn, setScripts } from "../../app/scripts.ts";
import { basename } from "../../fs/path.ts";
import { SCRIPTS_PARAM, SCRIPTS_VALUE } from "../../sw/policy.ts";
import { documentKind } from "../../tree/documents.ts";
import { Notice } from "./Notice.tsx";

interface Props {
  folderId: string;
  path: string;
  hasScripts: boolean;
  /** The frame moved to another document of the folder (`push`: a link the app should route). */
  onNavigate: (path: string, how: "replace" | "push") => void;
}

export function fileUrl(folderId: string, path: string): string {
  return `/~/${folderId}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function folderPath(folderId: string, url: URL): string | null {
  const prefix = `/~/${folderId}/`;
  if (url.origin !== location.origin || !url.pathname.startsWith(prefix)) return null;
  try {
    return url.pathname.slice(prefix.length).split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
}

/**
 * An HTML document in a sandboxed iframe (ADR 0005). Scripts off: same
 * origin without scripts, so the app follows the frame's navigation and
 * routes its links to Markdown. Scripts on: opaque origin, the app cannot
 * look inside.
 */
export function HtmlFrame({ folderId, path, hasScripts, onNavigate }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  /** What the frame shows, to avoid reloading it when the app follows its navigation. */
  const shown = useRef<string | null>(null);
  const scripts = areScriptsOn(folderId, path);
  const src = fileUrl(folderId, path) + (scripts ? `?${SCRIPTS_PARAM}=${SCRIPTS_VALUE}` : "");

  useEffect(() => {
    if (frame.current && shown.current !== src) {
      shown.current = src;
      frame.current.src = src;
    }
  }, [src]);

  const onLoad = () => {
    let doc: Document;
    let url: URL;
    try {
      doc = frame.current!.contentDocument!;
      url = new URL(frame.current!.contentWindow!.location.href);
    } catch {
      return; // scripts mode: opaque origin
    }
    shown.current = url.pathname + url.search;
    const now = folderPath(folderId, url);
    if (now !== null && now !== path) onNavigate(now, "replace");

    doc.addEventListener("click", (event) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!anchor || event.defaultPrevented || event.button !== 0) return;
      const target = new URL((anchor as HTMLAnchorElement).href);
      const inFolder = folderPath(folderId, target);
      if (target.origin !== location.origin) {
        // Outside links open in a new tab; the frame never leaves the folder.
        event.preventDefault();
        if (/^https?:$/.test(target.protocol))
          window.open(target.href, "_blank", "noopener,noreferrer");
      } else if (inFolder !== null && documentKind(inFolder) === "markdown") {
        event.preventDefault();
        onNavigate(inFolder, "push");
      }
    });
  };

  return (
    <div class="lc-frame">
      <h1 class="lc-sr-only">{basename(path)}</h1>
      {hasScripts &&
        (scripts ? (
          <Notice
            kind="warn"
            label="Scripts on"
            actions={
              <button
                type="button"
                class="lc-btn"
                onClick={() => setScripts(folderId, path, false)}
              >
                Turn scripts off
              </button>
            }
          >
            Scripts run without access to your files, storage or the network. Parts that load other
            files may not work.
          </Notice>
        ) : (
          <Notice
            kind="info"
            label="Scripts"
            actions={
              <button type="button" class="lc-btn" onClick={() => setScripts(folderId, path, true)}>
                Run scripts
              </button>
            }
          >
            This document has scripts. They are off.
          </Notice>
        ))}
      <div class="lc-frame__sheet">
        <iframe
          key={scripts ? "scripts" : "static"}
          ref={frame}
          title={basename(path)}
          sandbox={scripts ? "allow-scripts allow-same-origin" : "allow-same-origin"}
          referrerpolicy="no-referrer"
          onLoad={onLoad}
        />
      </div>
    </div>
  );
}
