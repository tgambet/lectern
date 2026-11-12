import { signal } from "@preact/signals";
import { parseRoute, type Route } from "./routes.ts";

export const route = signal<Route>(parseRoute(location.pathname));
/** Anchor without `#`, `""` when none. */
export const hash = signal(decodeURIComponent(location.hash.slice(1)));

function sync() {
  route.value = parseRoute(location.pathname);
  hash.value = decodeURIComponent(location.hash.slice(1));
}

export function navigate(url: string, options: { replace?: boolean } = {}): void {
  if (options.replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  sync();
}

/**
 * Same-origin links to `/read/…` navigate in-app; everything else (anchors,
 * external links, `/~/` files) keeps its native behaviour.
 */
export function startRouter(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element | null)?.closest?.("a");
    if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/read/")) return;
    if (url.pathname === location.pathname && url.hash) return; // same document: native anchor
    event.preventDefault();
    navigate(url.pathname + url.hash);
  };
  document.addEventListener("click", onClick);
  addEventListener("popstate", sync);
  addEventListener("hashchange", sync);
  return () => {
    document.removeEventListener("click", onClick);
    removeEventListener("popstate", sync);
    removeEventListener("hashchange", sync);
  };
}
