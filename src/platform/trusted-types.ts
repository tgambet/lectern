/**
 * Trusted Types (enforced by the CSP: `require-trusted-types-for 'script'`).
 * Lectern never builds HTML or scripts from strings, so the default policy
 * refuses both; script URLs (the search worker, the service worker) are
 * allowed only from our own origin. Must run before anything else.
 */
interface TrustedTypePolicyOptions {
  createHTML?: (input: string) => string;
  createScript?: (input: string) => string;
  createScriptURL?: (input: string) => string;
}

declare global {
  var trustedTypes:
    | {
        createPolicy(name: string, options: TrustedTypePolicyOptions): unknown;
        defaultPolicy: unknown;
      }
    | undefined;
}

export const TRUSTED_TYPES_POLICY = "default";

if (globalThis.trustedTypes && !globalThis.trustedTypes.defaultPolicy) {
  globalThis.trustedTypes.createPolicy(TRUSTED_TYPES_POLICY, {
    createHTML: () => {
      throw new TypeError("Lectern does not build HTML from strings");
    },
    createScript: () => {
      throw new TypeError("Lectern does not run scripts from strings");
    },
    createScriptURL: (input) => {
      const url = new URL(input, location.href);
      if (url.origin !== location.origin)
        throw new TypeError(`Script URL outside the app: ${input}`);
      return url.href;
    },
  });
}
