/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { FILE_PREFIX, serveFile } from "./file-server.ts";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Registered before Workbox so it answers `/~/` first.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(FILE_PREFIX)) {
    event.respondWith(serveFile(url));
  }
});

// Control the first page right away: a folder opened on the first visit needs `/~/`.
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// App routes all resolve to the shell; `/~/` is the virtual file server.
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), { denylist: [/^\/~\//] }));

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | null)?.type === "SKIP_WAITING") void self.skipWaiting();
});
