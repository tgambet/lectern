/**
 * CSP for every document served from `/~/` (ADR 0005, default mode). The
 * `sandbox` directive applies however the document is opened, including as a
 * top-level tab.
 */
export const DOCUMENT_CSP = [
  "sandbox allow-same-origin",
  "default-src 'self'",
  "script-src 'none'",
  "object-src 'none'",
  "connect-src 'none'",
  "form-action 'none'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "media-src 'self'",
  "frame-src 'self'",
].join("; ");

/**
 * Scripts mode (ADR 0005): the header's `sandbox` without `allow-same-origin`
 * gives the document an opaque origin (no storage, no handle), and every
 * resource must be a `data:` URL inlined by the service worker.
 */
export const SCRIPTS_DOCUMENT_CSP = [
  "sandbox allow-scripts",
  "default-src 'none'",
  "script-src data: 'unsafe-inline'",
  "style-src data: 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "media-src data:",
  "connect-src 'none'",
  "form-action 'none'",
].join("; ");

/** Query parameter asking the file server for the scripts-mode version of a document. */
export const SCRIPTS_PARAM = "lectern";
export const SCRIPTS_VALUE = "scripts";
