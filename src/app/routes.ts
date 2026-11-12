/**
 * App URLs: `/` (home) and `/read/<folder>/<path>#anchor`. Pure functions;
 * `router.ts` wires them to the History API.
 */
import { normalizePath } from "../fs/path.ts";

export type Route = { kind: "home" } | { kind: "read"; folder: string; path: string };

const PREFIX = "/read/";

const encode = (segment: string) => encodeURIComponent(segment);

export function readUrl(folder: string, path: string, hash = ""): string {
  const tail = path === "" ? "" : `/${path.split("/").map(encode).join("/")}`;
  const anchor = hash === "" ? "" : `#${hash.replace(/^#/, "")}`;
  return `${PREFIX}${encode(folder)}${tail}${anchor}`;
}

export function parseRoute(pathname: string): Route {
  if (!pathname.startsWith(PREFIX)) return { kind: "home" };
  try {
    const [folder, ...rest] = pathname.slice(PREFIX.length).split("/").map(decodeURIComponent);
    if (!folder) return { kind: "home" };
    return { kind: "read", folder, path: normalizePath(rest.join("/")) };
  } catch {
    return { kind: "home" };
  }
}
